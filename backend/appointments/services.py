# appointments/services.py
"""appointments app'inin Zoom ve ödeme (payments) ile ilişkisini yöneten servis katmanı.

ensure_zoom_meeting(): appointments/serializers.py (uzman oluşturduğunda) ve
appointments/views.py (status_update confirmed'e geçtiğinde) tarafından çağrılan,
Zoom meeting oluşturma mantığının TEK paylaşılan noktası - önceden bu iki dosyada
ayrı ayrı kopyalanmıştı (mock/real branching dahil), payments app'i eklenirken
(bkz. kök claude.md) üçüncü bir çağıran (ödeme callback'i) ihtiyacı doğunca
paylaşılan bir yere çıkarıldı.

grant_appointment_access_if_paid(): yukarıdaki iki çağrı noktası artık Zoom'u
DOĞRUDAN değil, bunun üzerinden istiyor - danışanın ödemesi (ya da kullanılmamış
ücretsiz ilk seans hakkı) yoksa hiçbir şey yapmaz, appointment durumu
(pending/confirmed) hiç etkilenmez, sadece zoom_meeting_id boş kalır. Danışan
payments app'i üzerinden ödemeyi tamamlayınca (bkz. payments/services.py::
handle_checkout_callback) Zoom BURADAN, bu fonksiyon tekrar çağrılarak oluşturulur.
"""
import logging
from datetime import datetime

from django.conf import settings

from zoom.services import create_zoom_meeting, create_mock_zoom_meeting

logger = logging.getLogger(__name__)


def ensure_zoom_meeting(appointment) -> None:
    if appointment.zoom_meeting_id:
        return

    try:
        meeting_datetime = datetime.combine(appointment.date, appointment.time)
        topic = f"Danışmanlık: {appointment.client.get_full_name()} - Uzman {appointment.expert.get_full_name()}"

        if settings.ENVIRONMENT == 'Production':
            zoom_info = create_zoom_meeting(topic=topic, start_time=meeting_datetime, duration=appointment.duration)
        else:
            zoom_info = create_mock_zoom_meeting(appointment.id)

        appointment.zoom_start_url = zoom_info.get('start_url')
        appointment.zoom_join_url = zoom_info.get('join_url')
        appointment.zoom_meeting_id = str(zoom_info.get('id'))
        appointment.save(update_fields=['zoom_start_url', 'zoom_join_url', 'zoom_meeting_id'])
    except Exception:
        logger.exception("Zoom meeting creation failed for appointment %s", appointment.id)


def grant_appointment_access_if_paid(appointment) -> bool:
    """True dönerse Zoom meeting oluşturuldu (ya da zaten vardı). False dönerse
    danışanın ödemesi bekleniyor - appointment'a hiç dokunulmadı."""
    from payments.services import resolve_appointment_payment

    if not resolve_appointment_payment(appointment):
        return False

    ensure_zoom_meeting(appointment)
    return True
