# payments/services.py
"""iyzico ödeme entegrasyonunun tek geçiş noktası.

IYZICO_MODE (mock/sandbox/production) ortam değişkenine göre üç farklı davranış
sergiler - `mock` modda gerçek iyzico'ya hiç ağ isteği gitmez (bkz. _mock_complete_checkout),
`sandbox`/`production` modda gerçek iyzico API'sine (base_url IYZICO_MODE'a göre
settings.py'de seçiliyor) gidilir. appointments app'i bu modülü import eder, tam
tersi asla olmaz (mailer'daki "leaf app" ilkesiyle aynı - bkz. mailer/services.py
docstring'i); appointments.services içindeki fonksiyon çağrıları da bu yüzden
modül içinde (dosya başında değil) yapılıyor - Payment.appointment FK'sı zaten
'appointments.Appointment' string referansıyla lazy olduğu için gerçek bir
circular import riski yok, ama appointments -> payments -> appointments üçgenini
netleştirmek için import'lar kullanıldıkları fonksiyonun içinde tutuldu.

İKİ AYRI ödeme akışı desteklenir - bunlar bir parametre farkı değil, iyzico'nun
kendisinin de ayrı initialize endpoint'leri olarak sunduğu, gerçekten farklı
iki mekanizma:
  - DIRECT (checkoutform/initialize/auth/ecom): tek adımda tahsilat. Şu an
    appointments akışına (grant_appointment_access_if_paid) bağlı olan BUDUR -
    danışan uzman onayladıktan/Zoom erişimi açılmadan hemen önce öder, bkz.
    backend/claude.md ve kök claude.md'deki ödeme politikası tartışması.
  - PREAUTH (checkoutform/initialize/preauth/ecom) + postAuth (provizyon kapama)
    + cancel (provizyon iptali): önce bloke, sonra ayrı bir çağrıyla tahsilat
    ya da blokeyi kaldırma. Şimdilik HİÇBİR appointments akışından çağrılmıyor -
    ama tam olarak çalışır durumda kuruldu (initiate_preauth_checkout/
    capture_preauth/void_preauth). İleride "danışan talep anında bloke, uzman
    onaylayınca tahsilat" politikasına geçilirse appointments tarafı sadece
    initiate_direct_checkout çağrısını initiate_preauth_checkout ile değiştirecek,
    bu dosyaya başka dokunulmayacak.

Ücretsiz ilk seans (danışan hesabı bazında ömür boyu bir kez) ayrı bir alan/model
olmadan hesaplanıyor (bkz. is_client_eligible_for_free_session) -
messaging/services.py::get_client_remaining_quota()'daki "mevcut veriden hesapla,
yeni state tutma" deseniyle tutarlı.
"""
import json
import logging
import uuid
from decimal import Decimal

import iyzipay
from django.conf import settings
from django.db import transaction

from .models import Payment, PaymentFlow, PaymentStatus, PaymentType
from notifications.services import create_payment_succeeded_notification

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Ödeme başlatma/tamamlama sırasında oluşan, çağırana (view) gösterilecek hatalar."""


def _iyzico_options() -> dict:
    return {
        'api_key': settings.IYZICO_API_KEY,
        'secret_key': settings.IYZICO_SECRET_KEY,
        'base_url': settings.IYZICO_BASE_URL,
    }


def _resolve_session_amount(appointment) -> tuple[Decimal, str]:
    expert_profile = getattr(appointment.expert, 'expertprofile', None)
    if expert_profile is None or expert_profile.session_price is None:
        raise PaymentError("Uzmanın seans ücreti tanımlı değil, ödeme başlatılamıyor.")
    return expert_profile.session_price, expert_profile.currency


def _build_buyer_and_billing(client, request=None) -> tuple[dict, dict]:
    """Checkout Form'un zorunlu tuttuğu buyer/billingAddress alanlarını üretir.

    Lunova fiziksel ürün satmıyor (video seans) ve kullanıcıdan hiç açık adres
    (şehir/sokak/posta kodu) toplamıyor - iyzico'nun e-ticaret odaklı adres
    alanları bizim iş modelimizde anlamsız. Kimlik/iletişim bilgileri (TCKN,
    telefon, email) gerçek kullanıcı verisi, sadece city/address/zipCode sabit
    bir yer tutucu. Bu bilinçli bir basitleştirme - iyzico'nun risk/fraud
    motoru ileride bunu sorun ederse gerçek adres toplanması gerekebilir.
    """
    identity_number = client.id_number or client.national_id
    if not identity_number:
        raise PaymentError("Ödeme yapabilmek için profilinizde TC Kimlik Numaranızın kayıtlı olması gerekir.")

    ip = (request.META.get('REMOTE_ADDR') if request else None) or '85.34.78.112'

    buyer = {
        'id': str(client.id),
        'name': client.first_name or 'Danışan',
        'surname': client.last_name or '-',
        'gsmNumber': client.phone_number or '+900000000000',
        'email': client.email,
        'identityNumber': identity_number,
        'registrationAddress': 'Lunova Online Danışmanlık',
        'ip': ip,
        'city': 'Istanbul',
        'country': 'Turkey',
        'zipCode': '34000',
    }
    billing_address = {
        'contactName': client.get_full_name() or 'Lunova Danışan',
        'city': 'Istanbul',
        'country': 'Turkey',
        'address': 'Lunova Online Danışmanlık Hizmeti',
        'zipCode': '34000',
    }
    return buyer, billing_address


def _build_basket_items(appointment, amount: Decimal) -> list:
    return [{
        'id': f'appointment-{appointment.id}',
        'name': f'Danışmanlık Seansı ({appointment.date})',
        'category1': 'Danışmanlık',
        'itemType': 'VIRTUAL',
        'price': str(amount),
    }]


# ---------------------------------------------------------------------------
# Ödeme durumu sorguları / ücretsiz ilk seans
# ---------------------------------------------------------------------------

def has_appointment_been_paid(appointment) -> bool:
    return Payment.objects.filter(appointment=appointment, status=PaymentStatus.SUCCEEDED).exists()


def is_client_eligible_for_free_session(client) -> bool:
    """Danışan hesabı bazında, ömür boyu bir kez (kullanıcı kararı - bkz. kök
    claude.md). Daha önce (herhangi bir randevu için) başarılı bir ödemesi -
    ücretsiz seans dahil, o da amount=0 SUCCEEDED olarak kaydedilir - yoksa
    hak henüz kullanılmamıştır."""
    return not Payment.objects.filter(payer=client, status=PaymentStatus.SUCCEEDED).exists()


def resolve_appointment_payment(appointment) -> bool:
    """appointment için Zoom erişiminin ŞİMDİ verilip verilemeyeceğini belirler.

    True dönerse (zaten ödenmiş) çağıran taraf (appointments.services.
    grant_appointment_access_if_paid) hemen Zoom oluşturabilir.

    False dönerse danışanın ya AppointmentCheckoutView (POST
    /api/v1/payments/appointments/<id>/checkout/) ile ödeme başlatması ya da
    (ücretsiz ilk seans hakkı varsa - appointment.is_free_trial burada set
    edilir) AppointmentFreeTrialConfirmView (POST /api/v1/payments/appointments/
    <id>/confirm-free-trial/) ile "devam et" onayını vermesi gerekir - GERÇEK
    ödemeli akışla simetrik: hak burada TÜKETİLMEZ, sadece işaretlenir; asıl
    Payment kaydı danışanın kendi "Devam Et" tıklamasıyla confirm_free_trial()
    içinde oluşur (bkz. o fonksiyonun docstring'i - kullanıcı kararı: ücretsiz
    seans da tıpkı ücretli seans gibi danışanın ayrı bir taahhüt/onay adımından
    geçmeli). appointment durumuna (pending/confirmed) hiç dokunulmaz, sadece
    Zoom oluşturulmaz.
    """
    if has_appointment_been_paid(appointment):
        return True

    if is_client_eligible_for_free_session(appointment.client) and not appointment.is_free_trial:
        appointment.is_free_trial = True
        appointment.save(update_fields=['is_free_trial', 'updated_at'])

    return False


def confirm_free_trial(appointment) -> Payment:
    """Danışanın Ödemeler sayfasındaki "Devam Et" tıklamasıyla çağrılır -
    resolve_appointment_payment()'ın appointment.is_free_trial=True ile
    işaretlediği bir randevu için asıl amount=0 SUCCEEDED Payment kaydını
    burada oluşturur (ücretsiz hak burada TÜKETİLİR) ve Zoom erişimini açar.

    select_for_update() + transaction.atomic(): danışanın hakkı iki farklı
    randevuda (iki uzman neredeyse eşzamanlı onaylarsa) is_free_trial=True
    olarak işaretlenmiş olabilir - hangisi önce confirm edilirse hakkı o
    tüketir, ikincisi burada is_client_eligible_for_free_session() tekrar
    kontrol edilince artık uygun bulunmaz ve zarifçe normal ödemeye
    düşürülür (is_free_trial=False). select_for_update SQLite'ta (dev) no-op,
    PostgreSQL'de (prod) aynı randevuya art arda çift tıklamaya karşı gerçek
    bir satır kilidi.

    Zoom/bildirim çağrıları BİLİNÇLİ OLARAK atomic() bloğunun DIŞINDA -
    ensure_zoom_meeting prod'da dış bir API'ye (Zoom) gidiyor, satır kilidini
    o süre boyunca açık tutmamak için.
    """
    from appointments.models import Appointment

    degraded = False
    payment = None

    with transaction.atomic():
        appointment = Appointment.objects.select_for_update().get(pk=appointment.pk)

        if has_appointment_been_paid(appointment):
            raise PaymentError("Bu randevu için ödeme zaten tamamlanmış.")

        if not appointment.is_free_trial:
            raise PaymentError("Bu randevu ücretsiz ilk seans için işaretli değil.")

        if not is_client_eligible_for_free_session(appointment.client):
            appointment.is_free_trial = False
            appointment.save(update_fields=['is_free_trial', 'updated_at'])
            degraded = True
        else:
            expert_profile = getattr(appointment.expert, 'expertprofile', None)
            currency = expert_profile.currency if expert_profile else 'TRY'
            payment = Payment.objects.create(
                payer=appointment.client,
                appointment=appointment,
                payment_type=PaymentType.SINGLE_SESSION,
                flow=PaymentFlow.DIRECT,
                status=PaymentStatus.SUCCEEDED,
                amount=Decimal('0'),
                currency=currency,
                conversation_id=str(uuid.uuid4()),
                metadata={'free_trial': True},
            )

    if degraded:
        raise PaymentError(
            "Ücretsiz ilk seans hakkınız bu arada başka bir randevu için kullanılmış "
            "görünüyor. Bu seans için ödeme yapmanız gerekiyor."
        )

    from appointments.services import ensure_zoom_meeting
    ensure_zoom_meeting(appointment)
    create_payment_succeeded_notification(payment)
    return payment


# ---------------------------------------------------------------------------
# DIRECT akış (auth/ecom) - appointments'a bağlı olan
# ---------------------------------------------------------------------------

def _mock_complete_checkout(payment: Payment) -> dict:
    """IYZICO_MODE=mock: gerçek iyzico'ya hiç gidilmez, ödeme anında başarılı
    sayılır ve randevunun Zoom erişimi hemen açılır (gerçek modda bunu
    handle_checkout_callback yapar - mock modda hiçbir zaman gerçek bir callback
    isteği yaşanmayacağı için bu iş burada, senkron olarak yapılıyor)."""
    payment.status = PaymentStatus.SUCCEEDED
    payment.provider_token = f'mock-token-{payment.id}'
    payment.provider_payment_id = f'mock-payment-{payment.id}'
    payment.save(update_fields=['status', 'provider_token', 'provider_payment_id', 'updated_at'])

    if payment.appointment_id:
        from appointments.services import ensure_zoom_meeting
        ensure_zoom_meeting(payment.appointment)
        create_payment_succeeded_notification(payment)

    return {
        'payment_id': payment.id,
        'status': payment.status,
        'token': payment.provider_token,
        'checkout_form_content': None,
        'payment_page_url': None,
        'mock': True,
    }


def initiate_direct_checkout(appointment, request=None) -> dict:
    """Tekil seans için DIRECT (auth/ecom) Checkout Form başlatır.

    has_appointment_been_paid() kontrolü burada TEKRAR yapılıyor (çağıran view
    zaten resolve_appointment_payment ile kontrol etmiş olmalı) - bu ikinci bir
    güvenlik katmanı, çift ödemeyi engeller.
    """
    if has_appointment_been_paid(appointment):
        raise PaymentError("Bu randevu için ödeme zaten tamamlanmış.")

    amount, currency = _resolve_session_amount(appointment)

    payment = Payment.objects.create(
        payer=appointment.client,
        appointment=appointment,
        payment_type=PaymentType.SINGLE_SESSION,
        flow=PaymentFlow.DIRECT,
        amount=amount,
        currency=currency,
        conversation_id=str(uuid.uuid4()),
    )

    if settings.IYZICO_MODE == 'mock':
        return _mock_complete_checkout(payment)

    if not settings.IYZICO_CALLBACK_URL:
        raise PaymentError("IYZICO_CALLBACK_URL tanımlı değil - sandbox/production modda ödeme başlatılamaz.")

    buyer, billing_address = _build_buyer_and_billing(appointment.client, request)
    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'price': str(amount),
        'paidPrice': str(amount),
        'currency': currency,
        'basketId': f'appointment-{appointment.id}',
        'paymentGroup': 'PRODUCT',
        'callbackUrl': settings.IYZICO_CALLBACK_URL,
        'buyer': buyer,
        'billingAddress': billing_address,
        'basketItems': _build_basket_items(appointment, amount),
    }

    result = iyzipay.CheckoutFormInitialize().create(request_data, _iyzico_options())
    response = json.load(result)

    if response.get('status') != 'success':
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = response.get('errorMessage')
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
        raise PaymentError(payment.failure_reason or "Ödeme başlatılamadı.")

    payment.provider_token = response.get('token')
    payment.save(update_fields=['provider_token', 'updated_at'])

    return {
        'payment_id': payment.id,
        'status': payment.status,
        'token': response.get('token'),
        'checkout_form_content': response.get('checkoutFormContent'),
        'payment_page_url': response.get('paymentPageUrl'),
    }


def handle_checkout_callback(token: str) -> Payment:
    """iyzico'nun callbackUrl'e POST ettiği token ile ödeme sonucunu sorgular
    (CheckoutForm.retrieve) ve eşleşen Payment kaydını günceller. DIRECT akışta
    başarılı sonuç doğrudan SUCCEEDED + Zoom oluşturma tetikler; PREAUTH akışta
    sadece AUTHORIZED'a çeker (Zoom erişimi capture_preauth'a kadar beklenir -
    bkz. modül docstring'i).

    payments/views.py::checkout_callback tarafından çağrılır.
    """
    payment = Payment.objects.filter(provider_token=token).first()
    if payment is None:
        raise PaymentError("Ödeme kaydı bulunamadı.")

    result = iyzipay.CheckoutForm().retrieve({'locale': 'tr', 'token': token}, _iyzico_options())
    response = json.load(result)

    if response.get('status') == 'success' and response.get('paymentStatus') == 'SUCCESS':
        payment.provider_payment_id = response.get('paymentId')
        if payment.flow == PaymentFlow.PREAUTH:
            payment.status = PaymentStatus.AUTHORIZED
            payment.save(update_fields=['status', 'provider_payment_id', 'updated_at'])
        else:
            payment.status = PaymentStatus.SUCCEEDED
            payment.save(update_fields=['status', 'provider_payment_id', 'updated_at'])
            if payment.appointment_id:
                from appointments.services import ensure_zoom_meeting
                ensure_zoom_meeting(payment.appointment)
                create_payment_succeeded_notification(payment)
    else:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = response.get('errorMessage') or response.get('paymentStatus')
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])

    return payment


# ---------------------------------------------------------------------------
# PREAUTH akış (preauth/ecom + postAuth + cancel) - hazır, henüz hiçbir yerden
# çağrılmıyor. Bkz. modül docstring'i.
# ---------------------------------------------------------------------------

def initiate_preauth_checkout(appointment, request=None) -> dict:
    """AYRI initialize akışı (preauth/ecom, iyzipay.CheckoutFormInitializePreAuth) -
    initiate_direct_checkout'un (auth/ecom) bir parametre varyasyonu DEĞİLDİR,
    iyzico bunları ayrı endpoint olarak sunuyor. Şu an hiçbir appointments
    akışından çağrılmıyor."""
    if has_appointment_been_paid(appointment):
        raise PaymentError("Bu randevu için ödeme zaten tamamlanmış.")

    amount, currency = _resolve_session_amount(appointment)

    payment = Payment.objects.create(
        payer=appointment.client,
        appointment=appointment,
        payment_type=PaymentType.SINGLE_SESSION,
        flow=PaymentFlow.PREAUTH,
        amount=amount,
        currency=currency,
        conversation_id=str(uuid.uuid4()),
    )

    if settings.IYZICO_MODE == 'mock':
        payment.status = PaymentStatus.AUTHORIZED
        payment.provider_token = f'mock-token-{payment.id}'
        payment.provider_payment_id = f'mock-payment-{payment.id}'
        payment.save(update_fields=['status', 'provider_token', 'provider_payment_id', 'updated_at'])
        return {'payment_id': payment.id, 'status': payment.status, 'token': payment.provider_token, 'mock': True}

    if not settings.IYZICO_CALLBACK_URL:
        raise PaymentError("IYZICO_CALLBACK_URL tanımlı değil - sandbox/production modda ödeme başlatılamaz.")

    buyer, billing_address = _build_buyer_and_billing(appointment.client, request)
    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'price': str(amount),
        'paidPrice': str(amount),
        'currency': currency,
        'basketId': f'appointment-{appointment.id}',
        'paymentGroup': 'PRODUCT',
        'callbackUrl': settings.IYZICO_CALLBACK_URL,
        'buyer': buyer,
        'billingAddress': billing_address,
        'basketItems': _build_basket_items(appointment, amount),
    }

    result = iyzipay.CheckoutFormInitializePreAuth().create(request_data, _iyzico_options())
    response = json.load(result)

    if response.get('status') != 'success':
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = response.get('errorMessage')
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
        raise PaymentError(payment.failure_reason or "Provizyon başlatılamadı.")

    payment.provider_token = response.get('token')
    payment.save(update_fields=['provider_token', 'updated_at'])

    return {
        'payment_id': payment.id,
        'status': payment.status,
        'token': response.get('token'),
        'checkout_form_content': response.get('checkoutFormContent'),
        'payment_page_url': response.get('paymentPageUrl'),
    }


def capture_preauth(payment: Payment) -> Payment:
    """Provizyon kapama (postAuth, iyzipay.PaymentPostAuth) - bloke edilmiş
    tutarı gerçek tahsilata çevirir. BKM kuralına göre preauth'tan itibaren 25
    gün içinde çağrılmalı (iyzico dokümanı, docs.iyzico.com/odeme-metotlari/
    on-provizyon). Başarılı olursa aynı appointments.services.ensure_zoom_meeting
    tetiklenir - DIRECT akışta callback anında olan Zoom erişimi burada postAuth
    anında gerçekleşir."""
    if payment.flow != PaymentFlow.PREAUTH or payment.status != PaymentStatus.AUTHORIZED:
        raise PaymentError("Bu ödeme provizyon kapamaya uygun durumda değil.")

    if settings.IYZICO_MODE == 'mock':
        payment.status = PaymentStatus.SUCCEEDED
        payment.save(update_fields=['status', 'updated_at'])
        if payment.appointment_id:
            from appointments.services import ensure_zoom_meeting
            ensure_zoom_meeting(payment.appointment)
            create_payment_succeeded_notification(payment)
        return payment

    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'paymentId': payment.provider_payment_id,
        'paidPrice': str(payment.amount),
        'currency': payment.currency,
    }
    result = iyzipay.PaymentPostAuth().create(request_data, _iyzico_options())
    response = json.load(result)

    if response.get('status') != 'success':
        payment.failure_reason = response.get('errorMessage')
        payment.save(update_fields=['failure_reason', 'updated_at'])
        raise PaymentError(payment.failure_reason or "Provizyon kapama başarısız.")

    payment.status = PaymentStatus.SUCCEEDED
    payment.save(update_fields=['status', 'updated_at'])
    if payment.appointment_id:
        from appointments.services import ensure_zoom_meeting
        ensure_zoom_meeting(payment.appointment)
        create_payment_succeeded_notification(payment)
    return payment


def void_preauth(payment: Payment, *, reason: str = 'other', description: str = '') -> Payment:
    """Provizyon iptali (cancel, iyzipay.Cancel) - bloke kaldırılır, para hiç
    çekilmemiş olur. Bu bir İADE değil (refund), tahsilat hiç yaşanmadığı için
    blokenin sessizce kaldırılmasıdır (kullanıcı notu). Uzman bir preauth'lı
    randevu talebini reddederse (ya da provizyon süresi dolmadan vazgeçilirse)
    çağrılması düşünülen fonksiyon - şu an hiçbir yerden çağrılmıyor."""
    if payment.flow != PaymentFlow.PREAUTH or payment.status != PaymentStatus.AUTHORIZED:
        raise PaymentError("Bu ödeme provizyon iptaline uygun durumda değil.")

    if settings.IYZICO_MODE == 'mock':
        payment.status = PaymentStatus.VOIDED
        payment.save(update_fields=['status', 'updated_at'])
        return payment

    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'paymentId': payment.provider_payment_id,
        'ip': '85.34.78.112',
        'reason': reason,
        'description': description,
    }
    result = iyzipay.Cancel().create(request_data, _iyzico_options())
    response = json.load(result)

    if response.get('status') != 'success':
        payment.failure_reason = response.get('errorMessage')
        payment.save(update_fields=['failure_reason', 'updated_at'])
        raise PaymentError(payment.failure_reason or "Provizyon iptali başarısız.")

    payment.status = PaymentStatus.VOIDED
    payment.save(update_fields=['status', 'updated_at'])
    return payment
