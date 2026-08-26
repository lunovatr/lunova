# payments/views.py
"""payments app'inin dış yüzü.

AppointmentCheckoutView: danışan kendi randevusu için DIRECT ödeme başlatır -
DRF view, JSON döner.

checkout_callback: iyzico'nun Checkout Form sonrası kullanıcının TARAYICISI
üzerinden POST ettiği callback - DRF/JSON değil düz Django view, çünkü iyzico
form-encoded POST atıyor ve yanıt olarak frontend'e bir HTTP redirect bekleniyor.
Kimliği doğrulanmamış (AllowAny) - iyzico'nun isteği hiçbir Lunova cookie'si
taşımaz, bu yüzden CookieJWTAuthentication zaten anonim kullanıcıya düşer ve
CSRF kontrolünü hiç tetiklemez (bkz. accounts/authentication.py); DRF'in kendi
APIView'ları zaten csrf_exempt olduğu için burada da @csrf_exempt ile aynı
davranış sağlanıyor.
"""
import logging

from django.conf import settings
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Appointment
from .services import PaymentError, initiate_direct_checkout, handle_checkout_callback

logger = logging.getLogger(__name__)


class AppointmentCheckoutView(APIView):
    """POST /api/v1/payments/appointments/<appointment_id>/checkout/
    Danışan, kendi (ödenmemiş, ücretsiz hakkı da kalmamış) randevusu için
    iyzico Checkout Form başlatır. Yanıtta dönen payment_page_url'e
    yönlendirme / checkout_form_content'i gömme işi frontend'in işi - bu
    turda backend'e odaklanıldı, frontend entegrasyonu ayrı bir iş.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id, is_deleted=False)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Randevu bulunamadı.'}, status=status.HTTP_404_NOT_FOUND)

        if appointment.client_id != request.user.id:
            return Response(
                {'detail': 'Bu randevu için ödeme başlatma yetkiniz yok.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            result = initiate_direct_checkout(appointment, request)
        except PaymentError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)


@csrf_exempt
def checkout_callback(request):
    token = request.POST.get('token')
    client_base = (settings.FRONTEND_URLS or {}).get('client', '')

    if not token:
        return HttpResponseRedirect(f"{client_base}/payments/result?status=error")

    try:
        payment = handle_checkout_callback(token)
    except PaymentError:
        logger.exception("iyzico callback işlenemedi: token=%s", token)
        return HttpResponseRedirect(f"{client_base}/payments/result?status=error")

    appointment_id = payment.appointment_id or ''
    return HttpResponseRedirect(
        f"{client_base}/payments/result?status={payment.status}&appointment_id={appointment_id}"
    )
