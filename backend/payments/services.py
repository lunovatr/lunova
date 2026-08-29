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
from datetime import timedelta
from decimal import Decimal

import iyzipay
from django.conf import settings
from django.db import transaction

from django.db.models import Q
from django.utils import timezone

from .models import (
    CommissionType, DiscountCode, DiscountCostBearer, DiscountType,
    Payment, PaymentFlow, PaymentStatus, PaymentType, PricingRule,
)
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


def resolve_pricing_rule(expert_profile, session_offering=None, variant=None) -> PricingRule | None:
    """En spesifik eşleşen aktif PricingRule'u döner - bulunamazsa None.

    Üç bağımsız boyut var (uzman / seans tipi / varyant [Faz 4-6: kıdem
    seviyesi ya da ex-user grubu]) - her biri dolu ya da None olabilir. Önce
    verilen boyutların TAMAMEN eşleştiği en spesifik kural denenir, sonra
    sırayla genelleşerek platform geneli varsayılana kadar iner. Verilmeyen
    (None geçilen) boyutlar hiç aday üretmez - örn. variant=None çağrıldığında
    davranış Faz 2/3'teki orijinal 2-boyutlu çözümlemeyle birebir aynı kalır.
    effective_from/until penceresi dışında ya da is_active=False kurallar hiç
    değerlendirilmez.
    """
    now = timezone.now()
    base = PricingRule.objects.filter(is_active=True)
    base = base.filter(Q(effective_from__isnull=True) | Q(effective_from__lte=now))
    base = base.filter(Q(effective_until__isnull=True) | Q(effective_until__gte=now))

    candidate_filters = []
    if variant is not None and session_offering is not None:
        candidate_filters.append({'expert': expert_profile, 'session_offering': session_offering, 'variant': variant})
        candidate_filters.append({'expert__isnull': True, 'session_offering': session_offering, 'variant': variant})
    if session_offering is not None:
        candidate_filters.append({'expert': expert_profile, 'session_offering': session_offering, 'variant__isnull': True})
        candidate_filters.append({'expert__isnull': True, 'session_offering': session_offering, 'variant__isnull': True})
    if variant is not None:
        candidate_filters.append({'expert': expert_profile, 'session_offering__isnull': True, 'variant': variant})
        candidate_filters.append({'expert__isnull': True, 'session_offering__isnull': True, 'variant': variant})
    candidate_filters.append({'expert': expert_profile, 'session_offering__isnull': True, 'variant__isnull': True})
    candidate_filters.append({'expert__isnull': True, 'session_offering__isnull': True, 'variant__isnull': True})

    for filters in candidate_filters:
        rule = base.filter(**filters).order_by('-id').first()
        if rule:
            return rule
    return None


def compute_commission_split(
    client_price: Decimal, commission_type: str, commission_value: Decimal,
) -> tuple[Decimal, Decimal]:
    """(platform_commission, expert_earning) - ikisi toplamda client_price eder."""
    if commission_type == CommissionType.PERCENTAGE:
        platform_commission = (client_price * commission_value / Decimal('100')).quantize(Decimal('0.01'))
    else:
        platform_commission = min(commission_value, client_price)
    platform_commission = max(platform_commission, Decimal('0'))
    expert_earning = client_price - platform_commission
    return platform_commission, expert_earning


def get_effective_price(expert_profile, session_offering=None, variant=None) -> dict:
    """Bir uzman + (opsiyonel) seans tipi için GÜNCEL danışan fiyatını döner -
    fiyat GÖSTERİMİNİN (booking ekranı, randevu listesi - bkz. Faz 0) ve
    GERÇEK ödeme tutarının (bkz. _resolve_pricing) her zaman AYNI kaynaktan
    (PricingRule katmanı) gelmesini sağlamak için tek geçiş noktası. Hiçbir
    PricingRule uygulanamıyorsa ExpertProfile.session_price'a düşer. Salt
    okunur gösterim amaçlı kullanılabilsin diye hata fırlatmaz - fiyat hiç
    tanımlı değilse 'amount': None döner.
    """
    rule = resolve_pricing_rule(expert_profile, session_offering=session_offering, variant=variant)
    if rule is not None:
        return {'amount': rule.client_price, 'currency': rule.currency, 'pricing_rule': rule}
    if expert_profile is None:
        # Uzmandan bağımsız bir sorgu (örn. Faz 7 paket fiyatlaması) ve hiç
        # platform-geneli PricingRule yok - düşecek bir session_price yok.
        return {'amount': None, 'currency': 'TRY', 'pricing_rule': None}
    return {
        'amount': expert_profile.session_price,
        'currency': expert_profile.currency,
        'pricing_rule': None,
    }


def _resolve_pricing(appointment) -> dict:
    """Bir randevu için danışan fiyatı + platform payı + uzman kazancını
    çözer (get_effective_price'ın üzerine komisyon hesaplamasını + hata
    fırlatma davranışını ekler - bu fonksiyon SADECE gerçek bir ödeme
    başlatılırken kullanılır, gösterim için get_effective_price kullanılmalı).
    """
    expert_profile = getattr(appointment.expert, 'expertprofile', None)
    if expert_profile is None:
        raise PaymentError("Uzman profili bulunamadı, ödeme başlatılamıyor.")

    # Faz 2 (Frontend Yapılandırması planı) - kıdem bazlı fiyatlandırmayı
    # (Faz 6, resolve_tier_variant_for_expert) gerçek ödeme akışına bağlar.
    # session_offering yoksa (eski veri) ya da eşleşen bir tier_N varyantı hiç
    # tanımlanmamışsa None döner - bu durumda get_effective_price aşağıdaki
    # variant=None çağrısıyla BİREBİR ÖNCEKİ (Faz 2 öncesi) davranışa düşer,
    # sıfır-davranış-değişikliği garantisi (plan kararı) böyle sağlanıyor.
    tier_variant = None
    if appointment.session_offering_id:
        tier_variant = resolve_tier_variant_for_expert(expert_profile, appointment.session_offering)

    pricing = get_effective_price(
        expert_profile, session_offering=appointment.session_offering, variant=tier_variant,
    )
    if pricing['amount'] is None:
        raise PaymentError("Uzmanın seans ücreti tanımlı değil, ödeme başlatılamıyor.")

    if pricing['pricing_rule'] is not None:
        rule = pricing['pricing_rule']
        platform_commission, expert_earning = compute_commission_split(
            rule.client_price, rule.commission_type, rule.commission_value
        )
    else:
        platform_commission, expert_earning = Decimal('0'), pricing['amount']

    return {
        'amount': pricing['amount'],
        'currency': pricing['currency'],
        'pricing_rule': pricing['pricing_rule'],
        'platform_commission': platform_commission,
        'expert_earning': expert_earning,
    }


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
    """Danışan hesabı bazında, ömür boyu bir kez, SADECE bireysel randevular
    için (kullanıcı kararı - bkz. kök claude.md, Sağlık Kontrolü turu). Daha
    önce bir RANDEVU için başarılı bir ödemesi - ücretsiz seans dahil, o da
    amount=0 SUCCEEDED olarak kaydedilir - yoksa hak henüz kullanılmamıştır.

    `appointment__isnull=False` filtresi BİLİNÇLİ: grup seansı/paket ödemeleri
    (Payment.appointment her zaman None) bu hakkı TÜKETMEMELİ - onlar ayrı
    ürünler, ücretsiz ilk seans politikası sadece bireysel randevu akışına
    özgü. Bu filtre olmadan bir danışan grup seansı ya da paket satın alınca
    bireysel randevu için hâlâ sahip olduğu ücretsiz hakkı kaybediyordu (bug,
    Sağlık Kontrolü turunda bulundu)."""
    return not Payment.objects.filter(
        payer=client, status=PaymentStatus.SUCCEEDED, appointment__isnull=False,
    ).exists()


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
# İndirim kodu (Faz 3) - kullanıcının GİRDİĞİ kod, DiscountRule'a bağlanır.
# ---------------------------------------------------------------------------

def validate_discount_code(code: str, client, session_offering=None) -> DiscountCode:
    """Bir kodun şu an, bu danışan ve (varsa) bu seans tipi için kullanılabilir
    olup olmadığını kontrol eder - geçersizse PaymentError fırlatır, geçerliyse
    DiscountCode nesnesini döner. Kullanım sayıları AYRI bir alanda tutulmuyor,
    Payment.discount_code üzerinden SUCCEEDED ödemeler sayılarak hesaplanıyor."""
    now = timezone.now()
    try:
        discount_code = DiscountCode.objects.select_related('discount_rule').get(code=code)
    except DiscountCode.DoesNotExist:
        raise PaymentError("Geçersiz indirim kodu.")

    if not discount_code.is_active or not discount_code.discount_rule.is_active:
        raise PaymentError("Bu indirim kodu artık aktif değil.")
    if discount_code.valid_from and now < discount_code.valid_from:
        raise PaymentError("Bu indirim kodunun geçerlilik süresi henüz başlamadı.")
    if discount_code.valid_until and now > discount_code.valid_until:
        raise PaymentError("Bu indirim kodunun süresi dolmuş.")

    offering_id = discount_code.discount_rule.applies_to_offering_id
    if offering_id and session_offering is not None and offering_id != session_offering.id:
        raise PaymentError("Bu indirim kodu bu seans tipi için geçerli değil.")

    if discount_code.max_redemptions is not None:
        total_used = Payment.objects.filter(
            discount_code=discount_code, status=PaymentStatus.SUCCEEDED
        ).count()
        if total_used >= discount_code.max_redemptions:
            raise PaymentError("Bu indirim kodunun kullanım limiti doldu.")

    user_used = Payment.objects.filter(
        discount_code=discount_code, payer=client, status=PaymentStatus.SUCCEEDED
    ).count()
    if user_used >= discount_code.max_redemptions_per_user:
        raise PaymentError("Bu indirim kodunu daha önce kullandınız.")

    return discount_code


def _lock_and_recheck_discount_code(discount_code: "DiscountCode", client) -> None:
    """validate_discount_code()'daki max_redemptions/max_redemptions_per_user
    sayım kontrollerini, DiscountCode satırını select_for_update() ile
    kilitleyip TEKRAR çalıştırır. Çağıranın kendi transaction.atomic() bloğu
    İÇİNDE, Payment.objects.create()'den HEMEN ÖNCE çağrılmalı.

    Neden gerekli: validate_discount_code() (fiyat hesaplanmadan önce, hızlı
    başarısız olsun diye erkenden) yaptığı ilk sayım ile asıl Payment satırının
    yazılması arasında geçen sürede başka bir eşzamanlı istek aynı kodu
    tüketmiş olabilir - iki eşzamanlı istek ikisi de "0 kullanım" görüp
    max_redemptions_per_user=1 olan bir kodu iki kez kullanabiliyordu (yarış
    durumu, Sağlık Kontrolü turunda bulundu). approve_group_join_request()'teki
    AYNI select_for_update deseni: PostgreSQL'de (prod) gerçek bir satır
    kilidi, SQLite'ta (dev) no-op - projenin genelindeki kabul edilen
    asimetri (bkz. confirm_free_trial() docstring'i)."""
    locked = DiscountCode.objects.select_for_update().get(pk=discount_code.pk)
    if locked.max_redemptions is not None:
        total_used = Payment.objects.filter(
            discount_code=locked, status=PaymentStatus.SUCCEEDED
        ).count()
        if total_used >= locked.max_redemptions:
            raise PaymentError("Bu indirim kodunun kullanım limiti doldu.")

    user_used = Payment.objects.filter(
        discount_code=locked, payer=client, status=PaymentStatus.SUCCEEDED
    ).count()
    if user_used >= locked.max_redemptions_per_user:
        raise PaymentError("Bu indirim kodunu daha önce kullandınız.")


def apply_discount_to_pricing(pricing: dict, discount_rule) -> dict:
    """`pricing` (get_effective_price/_resolve_pricing çıktısı) üzerine bir
    DiscountRule uygular - indirim tutarını ÖNCE orijinal fiyattan hesaplar,
    sonra cost_bearer'a göre platform/uzman arasında böler. Örnek (plan
    dokümanındaki senaryonun birebir aynısı): client_price=800, %20 indirim
    -> discount_amount=160, danışan öder 640. cost_bearer=SHARED %50 ise
    platform 80, uzman 80 TRY üstlenir; platformun/uzmanın orijinal
    (indirimsiz) komisyon/kazancından bu paylar düşülür."""
    original_amount = pricing['amount']

    if discount_rule.discount_type == DiscountType.PERCENTAGE:
        discount_amount = (original_amount * discount_rule.value / Decimal('100')).quantize(Decimal('0.01'))
    else:
        discount_amount = discount_rule.value
    discount_amount = min(discount_amount, original_amount)

    if discount_rule.cost_bearer == DiscountCostBearer.PLATFORM:
        platform_absorbs, expert_absorbs = discount_amount, Decimal('0')
    elif discount_rule.cost_bearer == DiscountCostBearer.EXPERT:
        platform_absorbs, expert_absorbs = Decimal('0'), discount_amount
    else:
        share = (discount_rule.expert_cost_share_percentage or Decimal('0')) / Decimal('100')
        expert_absorbs = (discount_amount * share).quantize(Decimal('0.01'))
        platform_absorbs = discount_amount - expert_absorbs

    original_platform_commission = pricing.get('platform_commission', Decimal('0'))
    original_expert_earning = pricing.get('expert_earning', original_amount - original_platform_commission)

    return {
        **pricing,
        'amount': original_amount - discount_amount,
        'platform_commission': max(original_platform_commission - platform_absorbs, Decimal('0')),
        'expert_earning': max(original_expert_earning - expert_absorbs, Decimal('0')),
        'discount_amount': discount_amount,
    }


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


def initiate_direct_checkout(appointment, request=None, discount_code: str | None = None) -> dict:
    """Tekil seans için DIRECT (auth/ecom) Checkout Form başlatır.

    has_appointment_been_paid() kontrolü burada TEKRAR yapılıyor (çağıran view
    zaten resolve_appointment_payment ile kontrol etmiş olmalı) - bu ikinci bir
    güvenlik katmanı, çift ödemeyi engeller.

    discount_code verilirse (Faz 3) validate_discount_code + apply_discount_to_pricing
    ile fiyat/komisyon bölünmesi indirime göre yeniden hesaplanır. Payment
    satırının yazılması transaction.atomic() + _lock_and_recheck_discount_code()
    ile korunur (Sağlık Kontrolü turunda bulunan yarış durumu düzeltmesi -
    bkz. o fonksiyonun docstring'i).
    """
    if has_appointment_been_paid(appointment):
        raise PaymentError("Bu randevu için ödeme zaten tamamlanmış.")

    pricing = _resolve_pricing(appointment)

    applied_discount_code = None
    if discount_code:
        applied_discount_code = validate_discount_code(
            discount_code, appointment.client, session_offering=appointment.session_offering
        )
        pricing = apply_discount_to_pricing(pricing, applied_discount_code.discount_rule)

    amount, currency = pricing['amount'], pricing['currency']
    is_mock = settings.IYZICO_MODE == 'mock'

    with transaction.atomic():
        if applied_discount_code is not None:
            _lock_and_recheck_discount_code(applied_discount_code, appointment.client)

        payment = Payment.objects.create(
            payer=appointment.client,
            appointment=appointment,
            payment_type=PaymentType.SINGLE_SESSION,
            flow=PaymentFlow.DIRECT,
            amount=amount,
            currency=currency,
            conversation_id=str(uuid.uuid4()),
            pricing_rule=pricing['pricing_rule'],
            platform_commission=pricing['platform_commission'],
            expert_earning=pricing['expert_earning'],
            discount_code=applied_discount_code,
        )
        if is_mock:
            # Kilit tutulurken SUCCEEDED'a çekilir - aksi halde bu payment
            # henüz PENDING'ken lock serbest kalır ve hemen ardından gelen
            # eşzamanlı bir istek "0 kullanım" görmeye devam eder (yarış
            # durumu kapanmamış olur). Provider alanları/Zoom/bildirim
            # _mock_complete_checkout() ile kilidin DIŞINDA tamamlanıyor.
            payment.status = PaymentStatus.SUCCEEDED
            payment.save(update_fields=['status', 'updated_at'])

    if is_mock:
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
            elif payment.metadata.get('group_session_id'):
                # Faz 1 - katılımcı (approved) ödemeden ÖNCE zaten var
                # (initiate_group_participant_checkout onu payment'a bağladı),
                # burada sadece Zoom'u tetikleyip başarı bildirimini gönderiyoruz.
                from appointments.models import GroupSession
                from appointments.services import ensure_group_session_zoom_meeting
                from notifications.services import create_group_payment_succeeded_notification
                group_session = GroupSession.objects.filter(pk=payment.metadata['group_session_id']).first()
                if group_session is not None:
                    ensure_group_session_zoom_meeting(group_session)
                participant = payment.group_session_participation.first()
                if participant is not None:
                    create_group_payment_succeeded_notification(participant)
            elif payment.metadata.get('package_definition_id'):
                # Faz 7 - PackagePurchase satın alma anında değil, ödeme
                # gerçekten SUCCEEDED olunca oluşturulur (grup seansındaki
                # "koltuğu tut" ihtiyacı burada yok - kapasite kavramı yok).
                from .models import PackageDefinition, PackagePurchase
                package_definition = PackageDefinition.objects.filter(
                    pk=payment.metadata['package_definition_id']
                ).first()
                if package_definition is not None:
                    PackagePurchase.objects.get_or_create(
                        payment=payment,
                        defaults={'client': payment.payer, 'package_definition': package_definition},
                    )
    else:
        payment.status = PaymentStatus.FAILED
        payment.failure_reason = response.get('errorMessage') or response.get('paymentStatus')
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
        # Grup seansı katılımcısı (Faz 1'den itibaren) ödemeden BAĞIMSIZ,
        # onay anında zaten var - burada SİLİNMEZ (approved durumu korunur,
        # kapasite/waitlist bu yüzden etkilenmez), danışan initiate_group_
        # participant_checkout() ile ödemeyi tekrar deneyebilir.

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

    pricing = _resolve_pricing(appointment)
    amount, currency = pricing['amount'], pricing['currency']

    payment = Payment.objects.create(
        payer=appointment.client,
        appointment=appointment,
        payment_type=PaymentType.SINGLE_SESSION,
        flow=PaymentFlow.PREAUTH,
        amount=amount,
        currency=currency,
        conversation_id=str(uuid.uuid4()),
        pricing_rule=pricing['pricing_rule'],
        platform_commission=pricing['platform_commission'],
        expert_earning=pricing['expert_earning'],
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


# ---------------------------------------------------------------------------
# Kıdem Bazlı Fiyatlandırma (Faz 6) - kademe DB'de bir alan olarak TUTULMAZ,
# messaging.services.get_client_remaining_quota()'nın "hesapla, ayrı state
# tutma" felsefesiyle aynı şekilde her çağrıda ANLIK hesaplanır. Scheduler/cron
# GEREKMEZ - "otomatik artış" bunun DOĞAL sonucu (bir sonraki hesaplamada
# kendiliğinden yeni kademeyi yansıtır).
# ---------------------------------------------------------------------------

def compute_expert_tenure_tier(expert_profile, *, months_per_tier: int = 10) -> int:
    """Uzmanın platform kıdemine (ExpertProfile.created_at'ten bu yana geçen
    süre) göre kademe indeksini (0, 1, 2, ...) döner - varsayılan her 10 ayda
    bir kademe artışı (plan kararı). Mesleki deneyim yılı (experience_years)
    DEĞİL platform kıdemi kullanılıyor - "otomatik artsın" isteğiyle uyumlu
    olan bu (experience_years dışarıdan elle girilen bir sayı, kendiliğinden
    büyümez)."""
    now = timezone.now()
    tenure_months = (now - expert_profile.created_at).days // 30
    return max(tenure_months, 0) // months_per_tier


def resolve_tier_variant_for_expert(expert_profile, session_offering, *, months_per_tier: int = 10):
    """compute_expert_tenure_tier()'ın döndürdüğü kademeye karşılık gelen
    SessionOfferingVariant'ı bulur (variant_key='tier_<N>' deseni, bkz.
    catalog/tests/feed_catalog.py örnek varyantları) - böyle bir varyant hiç
    tanımlanmamışsa (admin henüz kademe fiyatlandırması kurmamışsa) None döner,
    bu durumda get_effective_price varyantsız (genel) kurala düşer."""
    from catalog.models import SessionOfferingVariant

    tier_index = compute_expert_tenure_tier(expert_profile, months_per_tier=months_per_tier)
    return SessionOfferingVariant.objects.filter(
        session_offering=session_offering, variant_key=f"tier_{tier_index}", is_active=True,
    ).first()


# ---------------------------------------------------------------------------
# Grup Seansları (Faz 5) - her katılımcı KENDİ ödemesini yapar (plan kararı),
# kapasite/bekleme listesi transaction.atomic()+select_for_update() ile
# korunuyor (confirm_free_trial()'daki aynı desen).
# ---------------------------------------------------------------------------

class GroupSessionFullError(PaymentError):
    """Kapasite dolu - onay anında (approve_group_join_request) yarış
    durumunda oluşabilir, çağıran taraf (view) bunu 400 olarak döner."""


def _resolve_group_session_pricing(group_session) -> dict:
    expert_profile = getattr(group_session.expert, 'expertprofile', None)
    if expert_profile is None:
        raise PaymentError("Uzman profili bulunamadı, ödeme başlatılamıyor.")

    pricing = get_effective_price(
        expert_profile, session_offering=group_session.session_offering, variant=group_session.variant,
    )
    if pricing['amount'] is None:
        raise PaymentError("Bu grup seansı için fiyat tanımlı değil.")

    if pricing['pricing_rule'] is not None:
        rule = pricing['pricing_rule']
        platform_commission, expert_earning = compute_commission_split(
            rule.client_price, rule.commission_type, rule.commission_value
        )
    else:
        platform_commission, expert_earning = Decimal('0'), pricing['amount']

    return {**pricing, 'platform_commission': platform_commission, 'expert_earning': expert_earning}


def _check_ex_user_eligibility(group_session, client) -> None:
    if not group_session.variant_id or group_session.variant.variant_key != 'ex_user_only':
        return
    client_profile = getattr(client, 'clientprofile', None)
    if client_profile is None or client_profile.recovery_status != 'in_recovery':
        raise PaymentError("Bu grup seansı sadece ex-user doğrulaması yapılmış danışanlar içindir.")


def has_group_participant_been_paid(participant) -> bool:
    return participant.payment_id is not None and participant.payment.status == PaymentStatus.SUCCEEDED


def request_join_group_session(group_session, client):
    """Danışanın "müsaitlik -> talep -> onay -> ödeme" akışının ilk adımı -
    KATILMAZ, sadece TALEP oluşturur (Faz 1, Frontend Yapılandırması planı).
    Ödeme burada hiç başlatılmaz, uzman onaylayana kadar hiçbir Payment
    kaydı oluşmaz (bireysel randevu politikasıyla - "onaydan sonra öde" -
    birebir tutarlı).

    Kapasite (yalnızca APPROVED katılımcı sayısına göre - pending_approval
    talepler kapasiteyi TÜKETMEZ) talep anında dolu bulunursa talep hiç
    oluşturulmaz, danışan doğrudan bekleme listesine düşer (incelemeye bile
    gerek yok, zaten yer yok). Daha önce reddedilmiş bir talep varsa tekrar
    pending_approval'a döndürülür (aynı unique constraint korunur, silinip
    yeniden oluşturulmaz - reviewed_by/reviewed_at sıfırlanır).

    ex_user_only bir varyanta, recovery_status='in_recovery' olmayan bir
    danışan talep gönderemez (bkz. _check_ex_user_eligibility).
    """
    from appointments.models import (
        GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus, GroupSessionWaitlist,
    )

    with transaction.atomic():
        group_session = GroupSession.objects.select_for_update().get(pk=group_session.pk)

        _check_ex_user_eligibility(group_session, client)

        existing = GroupSessionParticipant.objects.filter(group_session=group_session, client=client).first()
        if existing is not None:
            if existing.status == GroupSessionParticipantStatus.REJECTED:
                existing.status = GroupSessionParticipantStatus.PENDING_APPROVAL
                existing.reviewed_by = None
                existing.reviewed_at = None
                existing.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
                participant = existing
            else:
                raise PaymentError("Bu grup seansı için zaten bir talebiniz ya da katılımınız var.")
        else:
            if GroupSessionWaitlist.objects.filter(group_session=group_session, client=client).exists():
                raise PaymentError("Zaten bekleme listesindesiniz.")

            approved_count = GroupSessionParticipant.objects.filter(
                group_session=group_session, status=GroupSessionParticipantStatus.APPROVED,
            ).count()
            if approved_count >= group_session.capacity:
                return GroupSessionWaitlist.objects.create(group_session=group_session, client=client)

            participant = GroupSessionParticipant.objects.create(group_session=group_session, client=client)

    from notifications.services import create_group_join_requested_notification
    from mailer.services import send_group_join_requested_email
    create_group_join_requested_notification(participant)
    send_group_join_requested_email(participant)
    return participant


def approve_group_join_request(participant, reviewed_by) -> "GroupSessionParticipant":
    """Uzmanın bekleyen bir talebi onaylaması - `transaction.atomic()` +
    `select_for_update()` ile kapasite TEKRAR kontrol edilir (iki talep
    neredeyse eşzamanlı onaylanırsa kapasiteyi aşan ikinci istek
    GroupSessionFullError fırlatır). Ödeme burada BAŞLATILMAZ, sadece
    danışana "ödeme gerekiyor" bildirimi+maili gider - danışan Ödemeler
    sayfasından kendi ödemesini başlatır (initiate_group_participant_checkout)."""
    from appointments.models import GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus

    with transaction.atomic():
        participant = GroupSessionParticipant.objects.select_for_update().get(pk=participant.pk)
        group_session = GroupSession.objects.select_for_update().get(pk=participant.group_session_id)

        if participant.status != GroupSessionParticipantStatus.PENDING_APPROVAL:
            raise PaymentError("Bu talep zaten incelenmiş, tekrar işlem yapılamaz.")

        approved_count = GroupSessionParticipant.objects.filter(
            group_session=group_session, status=GroupSessionParticipantStatus.APPROVED,
        ).count()
        if approved_count >= group_session.capacity:
            raise GroupSessionFullError("Bu grup seansı dolu, talebi onaylayamazsınız.")

        participant.status = GroupSessionParticipantStatus.APPROVED
        participant.reviewed_by = reviewed_by
        participant.reviewed_at = timezone.now()
        participant.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

    from notifications.services import create_group_payment_required_notification
    from mailer.services import send_group_payment_required_email
    create_group_payment_required_notification(participant)
    send_group_payment_required_email(participant)
    return participant


def reject_group_join_request(participant, reviewed_by) -> "GroupSessionParticipant":
    """Uzmanın bekleyen bir talebi reddetmesi - kapasite kontrolü gerekmez
    (bir talebi reddetmek asla kapasiteyi değiştirmez)."""
    from appointments.models import GroupSessionParticipant, GroupSessionParticipantStatus

    participant = GroupSessionParticipant.objects.get(pk=participant.pk)
    if participant.status != GroupSessionParticipantStatus.PENDING_APPROVAL:
        raise PaymentError("Bu talep zaten incelenmiş, tekrar işlem yapılamaz.")

    participant.status = GroupSessionParticipantStatus.REJECTED
    participant.reviewed_by = reviewed_by
    participant.reviewed_at = timezone.now()
    participant.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

    from notifications.services import create_group_join_rejected_notification
    create_group_join_rejected_notification(participant)
    return participant


def initiate_group_participant_checkout(participant, request=None, discount_code: str | None = None) -> dict:
    """Onaylanmış (approved) bir katılımcının KENDİ ödemesini başlatması -
    initiate_direct_checkout()'un grup seansı karşılığı. Sadece
    status=APPROVED ve henüz ödenmemiş bir katılımcı için çalışır."""
    from appointments.models import GroupSessionParticipantStatus

    if participant.status != GroupSessionParticipantStatus.APPROVED:
        raise PaymentError("Bu katılım talebi onaylanmadan ödeme başlatılamaz.")
    if has_group_participant_been_paid(participant):
        raise PaymentError("Bu grup seansı için ödeme zaten tamamlanmış.")

    group_session = participant.group_session
    pricing = _resolve_group_session_pricing(group_session)

    applied_discount_code = None
    if discount_code:
        applied_discount_code = validate_discount_code(
            discount_code, participant.client, session_offering=group_session.session_offering,
        )
        pricing = apply_discount_to_pricing(pricing, applied_discount_code.discount_rule)

    amount, currency = pricing['amount'], pricing['currency']
    is_mock = settings.IYZICO_MODE == 'mock'

    with transaction.atomic():
        if applied_discount_code is not None:
            _lock_and_recheck_discount_code(applied_discount_code, participant.client)

        payment = Payment.objects.create(
            payer=participant.client,
            appointment=None,
            payment_type=PaymentType.SINGLE_SESSION,
            flow=PaymentFlow.DIRECT,
            amount=amount,
            currency=currency,
            conversation_id=str(uuid.uuid4()),
            pricing_rule=pricing['pricing_rule'],
            platform_commission=pricing['platform_commission'],
            expert_earning=pricing['expert_earning'],
            discount_code=applied_discount_code,
            metadata={'group_session_id': group_session.id, 'group_participant_id': participant.id},
        )
        participant.payment = payment
        participant.save(update_fields=['payment'])

        if is_mock:
            # bkz. initiate_direct_checkout'taki aynı yorum - kilit tutulurken
            # SUCCEEDED'a çekilir, aksi halde yarış durumu kapanmaz.
            payment.status = PaymentStatus.SUCCEEDED
            payment.save(update_fields=['status', 'updated_at'])

    if is_mock:
        payment.provider_token = f'mock-token-{payment.id}'
        payment.provider_payment_id = f'mock-payment-{payment.id}'
        payment.save(update_fields=['provider_token', 'provider_payment_id', 'updated_at'])

        from appointments.services import ensure_group_session_zoom_meeting
        from notifications.services import create_group_payment_succeeded_notification
        ensure_group_session_zoom_meeting(group_session)
        create_group_payment_succeeded_notification(participant)
        return {
            'participant_id': participant.id, 'payment_id': payment.id, 'status': payment.status,
            'token': payment.provider_token, 'checkout_form_content': None, 'payment_page_url': None,
            'mock': True,
        }

    if not settings.IYZICO_CALLBACK_URL:
        raise PaymentError("IYZICO_CALLBACK_URL tanımlı değil - sandbox/production modda ödeme başlatılamaz.")

    buyer, billing_address = _build_buyer_and_billing(participant.client, request)
    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'price': str(amount),
        'paidPrice': str(amount),
        'currency': currency,
        'basketId': f'group-session-{group_session.id}',
        'paymentGroup': 'PRODUCT',
        'callbackUrl': settings.IYZICO_CALLBACK_URL,
        'buyer': buyer,
        'billingAddress': billing_address,
        'basketItems': [{
            'id': f'group-session-{group_session.id}',
            'name': f'Grup Seansı ({group_session.session_offering.name})',
            'category1': 'Danışmanlık',
            'itemType': 'VIRTUAL',
            'price': str(amount),
        }],
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
        'participant_id': participant.id,
        'payment_id': payment.id,
        'status': payment.status,
        'token': response.get('token'),
        'checkout_form_content': response.get('checkoutFormContent'),
        'payment_page_url': response.get('paymentPageUrl'),
    }


def promote_next_from_waitlist(group_session):
    """Bir yer açıldığında (approved+ödenmiş bir katılımcı iptal ettiğinde)
    bekleme listesindeki (joined_waitlist_at'e göre FIFO) ilk kişiyi
    DOĞRUDAN approved'a geçirir - tekrar uzman incelemesi istenmez (zaten bir
    kez sıraya girip beklemişti, plan kararı). Hem "sıra size geldi"
    (group_waitlist_spot_available) hem "ödeme bekleniyor"
    (group_payment_required) bildirimi art arda gönderilir."""
    from appointments.models import (
        GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus, GroupSessionWaitlist,
    )
    from notifications.services import (
        create_group_payment_required_notification,
        create_group_waitlist_spot_available_notification,
    )
    from mailer.services import send_group_payment_required_email

    with transaction.atomic():
        group_session = GroupSession.objects.select_for_update().get(pk=group_session.pk)
        entry = GroupSessionWaitlist.objects.select_for_update().filter(
            group_session=group_session,
        ).order_by('joined_waitlist_at').first()
        if entry is None:
            return None

        approved_count = GroupSessionParticipant.objects.filter(
            group_session=group_session, status=GroupSessionParticipantStatus.APPROVED,
        ).count()
        if approved_count >= group_session.capacity:
            return None

        # Bildirim, entry silinmeden ÖNCE üretilir (dedupe_key entry.id'ye
        # bağlı - silindikten sonra pk None'a düşer).
        create_group_waitlist_spot_available_notification(entry)
        client = entry.client
        entry.delete()

        participant, _created = GroupSessionParticipant.objects.update_or_create(
            group_session=group_session, client=client,
            defaults={'status': GroupSessionParticipantStatus.APPROVED, 'reviewed_at': timezone.now()},
        )
        create_group_payment_required_notification(participant)
        send_group_payment_required_email(participant)

    return participant


def cancel_group_session_participation(group_session, client) -> None:
    """Bir katılımcı iptal ettiğinde çağrılır - katılımcı satırını siler
    (Payment'a dokunulmaz, iade admin panelinden manuel işaretlenir - bkz.
    PaymentAdmin.mark_refunded, tekil randevu iptalleriyle aynı politika).
    Sadece APPROVED (kapasiteyi gerçekten tüketmiş) bir katılımcının iptali
    bekleme listesindeki bir sonraki kişiyi terfi ettirir - pending_approval/
    rejected bir talebin "iptali" hiçbir yer açmaz."""
    from appointments.models import GroupSessionParticipant, GroupSessionParticipantStatus

    with transaction.atomic():
        participant = GroupSessionParticipant.objects.select_related('group_session').get(
            group_session=group_session, client=client,
        )
        freed_group_session = participant.group_session
        was_approved = participant.status == GroupSessionParticipantStatus.APPROVED
        participant.delete()

    if was_approved:
        promote_next_from_waitlist(freed_group_session)


# ---------------------------------------------------------------------------
# Paket/Abonelik Modeli (Faz 7) - paket hakları süresiz, farklı uzmanlarda
# kullanılabilir (plan kararları). "Kalan hak" ayrı bir sayaç DEĞİL,
# PackageUsage satırları sayılarak hesaplanır.
# ---------------------------------------------------------------------------

def compute_package_price(package_definition) -> dict:
    """PackageDefinition'ın KENDİ bir fiyatı YOK - toplam fiyat platform-geneli
    (expert=None) PricingRule katmanından türetilir: session_count × birim
    fiyat × (1 - discount_percentage/100). Uygulanabilir platform-geneli bir
    PricingRule yoksa (admin henüz kurmadıysa) PaymentError fırlatır - paket
    farklı uzmanlarda kullanılabildiği için (plan kararı) tek bir uzmanın
    fiyatına düşülemez."""
    unit_pricing = get_effective_price(None, session_offering=package_definition.applies_to_offering)
    if unit_pricing['amount'] is None:
        raise PaymentError(
            "Bu paket için platform geneli bir fiyatlandırma kuralı tanımlı değil "
            "(PricingRule: uzman=boş, seans tipi=paketin seans tipi)."
        )

    unit_price = unit_pricing['amount']
    gross_total = unit_price * package_definition.session_count
    discount_multiplier = (Decimal('100') - package_definition.discount_percentage) / Decimal('100')
    total = (gross_total * discount_multiplier).quantize(Decimal('0.01'))
    return {'amount': total, 'currency': unit_pricing['currency'], 'unit_price': unit_price}


def purchase_package(package_definition, client, request=None, discount_code: str | None = None) -> dict:
    """Danışanın bir PackageDefinition'ı satın alması - kapasite/koltuk
    kavramı olmadığı için (group session'ın aksine) PackagePurchase satırı
    SADECE ödeme gerçekten SUCCEEDED olunca oluşturulur (mock modda burada
    senkron, gerçek modda handle_checkout_callback içinde).

    discount_code (Sağlık Kontrolü turunda EKLENDİ - önceden bu parametre hiç
    yoktu, PackageCheckoutView'ın body'den okuduğu kod sessizce yok
    sayılıyordu, bug) verilirse initiate_direct_checkout/
    initiate_group_participant_checkout ile AYNI validate_discount_code +
    apply_discount_to_pricing + _lock_and_recheck_discount_code deseni
    uygulanır."""
    from .models import PackagePurchase

    if not package_definition.is_active:
        raise PaymentError("Bu paket artık satışta değil.")

    pricing = compute_package_price(package_definition)

    applied_discount_code = None
    if discount_code:
        applied_discount_code = validate_discount_code(
            discount_code, client, session_offering=package_definition.applies_to_offering,
        )
        pricing = apply_discount_to_pricing(pricing, applied_discount_code.discount_rule)

    amount, currency = pricing['amount'], pricing['currency']
    is_mock = settings.IYZICO_MODE == 'mock'

    with transaction.atomic():
        if applied_discount_code is not None:
            _lock_and_recheck_discount_code(applied_discount_code, client)

        payment = Payment.objects.create(
            payer=client,
            appointment=None,
            payment_type=PaymentType.PACKAGE,
            flow=PaymentFlow.DIRECT,
            amount=amount,
            currency=currency,
            conversation_id=str(uuid.uuid4()),
            discount_code=applied_discount_code,
            metadata={'package_definition_id': package_definition.id},
        )

        if is_mock:
            # bkz. initiate_direct_checkout'taki aynı yorum - kilit tutulurken
            # SUCCEEDED'a çekilir, aksi halde yarış durumu kapanmaz.
            payment.status = PaymentStatus.SUCCEEDED
            payment.save(update_fields=['status', 'updated_at'])
            purchase = PackagePurchase.objects.create(
                client=client, package_definition=package_definition, payment=payment,
            )

    if is_mock:
        payment.provider_token = f'mock-token-{payment.id}'
        payment.provider_payment_id = f'mock-payment-{payment.id}'
        payment.save(update_fields=['provider_token', 'provider_payment_id', 'updated_at'])
        return {
            'purchase_id': purchase.id, 'payment_id': payment.id, 'status': payment.status,
            'token': payment.provider_token, 'checkout_form_content': None, 'payment_page_url': None,
            'mock': True,
        }

    if not settings.IYZICO_CALLBACK_URL:
        raise PaymentError("IYZICO_CALLBACK_URL tanımlı değil - sandbox/production modda ödeme başlatılamaz.")

    buyer, billing_address = _build_buyer_and_billing(client, request)
    request_data = {
        'locale': 'tr',
        'conversationId': payment.conversation_id,
        'price': str(amount),
        'paidPrice': str(amount),
        'currency': currency,
        'basketId': f'package-{package_definition.id}',
        'paymentGroup': 'PRODUCT',
        'callbackUrl': settings.IYZICO_CALLBACK_URL,
        'buyer': buyer,
        'billingAddress': billing_address,
        'basketItems': [{
            'id': f'package-{package_definition.id}',
            'name': f'Paket: {package_definition.name}',
            'category1': 'Danışmanlık',
            'itemType': 'VIRTUAL',
            'price': str(amount),
        }],
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


def cancel_group_session(group_session, *, cancelled_by) -> "GroupSession":
    """Bir grup seansını iptal eder (Admin Panel Dokümantasyon/Güvenlik turu,
    YENİ) - appointments/group_views.py::GroupSessionDetailView.patch()'in
    ('cancelled' dalı) GERÇEK arka ucu, Django admin'deki "Grup Seansını
    İptal Et" aksiyonunun da ikinci çağıranı. Önceden bu iki yüzey de
    grubu ham bir .save() ile CANCELLED'a çekiyordu - onaylanmış+ödemiş
    katılımcılara/bekleme listesine/bildirime hiç dokunulmuyordu (Sağlık
    Kontrolü turunda bulunan, o turda bilinçli olarak ERTELENEN bulgu).

    Onaylanmış (approved) katılımcılara BİLİNÇLİ OLARAK dokunulmaz - onları
    "açıkta kalan" yapan şey zaten budur (status=APPROVED AND group_session.
    status=CANCELLED sorgusuyla hesaplanır, bkz. DisplacedParticipantFilter,
    admin.py). Admin bu turda kurulan "başka bir gruba aktar" aksiyonuyla
    (reassign_group_participant) onları elle işleme alır - otomatik bir
    iade/aktarma burada YAPILMAZ (kullanıcı kararı, ayrı bir "geçici çözüm"
    olarak tasarlandı).

    Onay bekleyen (pending_approval) talepler otomatik reddedilir (var olan
    reject_group_join_request() yeniden kullanılır - DRY, bildirim/mail
    dahil). Bekleme listesi kayıtlarına ÖNCE bilgilendirme bildirimi gider,
    SONRA silinir (promote_next_from_waitlist()'teki "önce bildir, sonra sil"
    sırasıyla tutarlı, kullanıcı kararı: waitlist'e de haber verilsin)."""
    from appointments.models import (
        GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus,
        GroupSessionStatus, GroupSessionWaitlist,
    )
    from notifications.services import (
        create_group_session_cancelled_notification, create_group_join_rejected_notification,
    )
    from mailer.services import send_group_session_cancelled_email

    with transaction.atomic():
        group_session = GroupSession.objects.select_for_update().get(pk=group_session.pk)

        if group_session.status != GroupSessionStatus.SCHEDULED:
            raise PaymentError("Sadece planlanmış bir grup seansı iptal edilebilir.")

        group_session.status = GroupSessionStatus.CANCELLED
        group_session.save(update_fields=['status', 'updated_at'])

        pending = list(GroupSessionParticipant.objects.select_for_update().filter(
            group_session=group_session, status=GroupSessionParticipantStatus.PENDING_APPROVAL,
        ))
        for participant in pending:
            participant.status = GroupSessionParticipantStatus.REJECTED
            participant.reviewed_by = cancelled_by
            participant.reviewed_at = timezone.now()
            participant.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
            create_group_join_rejected_notification(participant)

        approved = list(GroupSessionParticipant.objects.filter(
            group_session=group_session, status=GroupSessionParticipantStatus.APPROVED,
        ))
        waitlist_entries = list(
            GroupSessionWaitlist.objects.select_for_update().filter(group_session=group_session).select_related('client')
        )
        for entry in waitlist_entries:
            create_group_session_cancelled_notification(entry.client, group_session)
        GroupSessionWaitlist.objects.filter(group_session=group_session).delete()

        for participant in approved:
            create_group_session_cancelled_notification(participant.client, group_session)

    for entry in waitlist_entries:
        send_group_session_cancelled_email(entry.client, group_session)
    for participant in approved:
        send_group_session_cancelled_email(participant.client, group_session)

    return group_session


def reassign_group_participant(participant, target_group_session, *, reassigned_by) -> "GroupSessionParticipant":
    """Açıkta kalan (iptal edilmiş bir grubun approved) bir katılımcıyı başka,
    benzer bir grup seansına aktarır (Admin Panel Dokümantasyon/Güvenlik
    turu, YENİ) - kullanıcının açıkça istediği "geçici çözüm": admin panelden
    manuel olarak, danışan tekrar ödeme yapmadan (payment FK'si AYNEN taşınır)
    aktarım yapılabilsin diye.

    Doğrulamalar (sırasıyla): katılımcı approved mı, hedef scheduled+gelecek
    tarihli mi, hedef AYNI session_offering'e mi ait (kullanıcı kararı -
    variant esnek, örn. tier_0'dan tier_1'e aktarım engellenmez), ex-user
    uygunluğu (_check_ex_user_eligibility() yeniden kullanılır), hedefte
    aynı danışan için zaten bir kayıt var mı (UniqueConstraint'e IntegrityError
    olarak çarpmadan önce net bir PaymentError), kapasite müsait mi
    (select_for_update() ile approve_group_join_request()'teki AYNI yarış
    durumu koruması).

    original_group_session SADECE İLK aktarımda doldurulur (bir danışan
    ikinci kez aktarılırsa hep "gerçekten en baştaki" grubu gösterir).
    payment FK'si dokunulmadan taşınır - danışan tekrar ödeme yapmaz."""
    from appointments.models import (
        GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus, GroupSessionStatus,
    )
    from appointments.services import ensure_group_session_zoom_meeting
    from notifications.services import create_group_participant_reassigned_notification
    from mailer.services import send_group_participant_reassigned_email

    with transaction.atomic():
        participant = GroupSessionParticipant.objects.select_for_update().get(pk=participant.pk)
        target_group_session = GroupSession.objects.select_for_update().get(pk=target_group_session.pk)

        if participant.status != GroupSessionParticipantStatus.APPROVED:
            raise PaymentError("Sadece onaylanmış bir katılımcı başka bir gruba aktarılabilir.")

        if target_group_session.pk == participant.group_session_id:
            raise PaymentError("Hedef grup seansı, katılımcının zaten bulunduğu grupla aynı olamaz.")

        if target_group_session.status != GroupSessionStatus.SCHEDULED:
            raise PaymentError("Hedef grup seansı planlanmış (scheduled) durumda olmalıdır.")
        if target_group_session.date < timezone.localdate():
            raise PaymentError("Hedef grup seansı geçmiş bir tarihte olamaz.")
        if target_group_session.session_offering_id != participant.group_session.session_offering_id:
            raise PaymentError("Hedef grup seansı aynı seans tipine (hizmete) ait olmalıdır.")

        _check_ex_user_eligibility(target_group_session, participant.client)

        if GroupSessionParticipant.objects.filter(
            group_session=target_group_session, client=participant.client,
        ).exists():
            raise PaymentError("Bu danışanın hedef grup seansında zaten bir kaydı var.")

        approved_count = GroupSessionParticipant.objects.filter(
            group_session=target_group_session, status=GroupSessionParticipantStatus.APPROVED,
        ).count()
        if approved_count >= target_group_session.capacity:
            raise GroupSessionFullError("Hedef grup seansı dolu, aktarım yapılamaz.")

        source_group_session = participant.group_session
        if participant.original_group_session_id is None:
            participant.original_group_session = source_group_session
        participant.group_session = target_group_session
        participant.reviewed_by = reassigned_by
        participant.reviewed_at = timezone.now()
        participant.save(update_fields=[
            'group_session', 'original_group_session', 'reviewed_by', 'reviewed_at',
        ])

    ensure_group_session_zoom_meeting(target_group_session)
    create_group_participant_reassigned_notification(
        participant, source_group_session=source_group_session, target_group_session=target_group_session,
    )
    send_group_participant_reassigned_email(
        participant, source_group_session=source_group_session, target_group_session=target_group_session,
    )
    return participant


def get_package_remaining_sessions(package_purchase) -> int:
    from .models import PackageUsage
    used = PackageUsage.objects.filter(package_purchase=package_purchase).count()
    return max(package_purchase.package_definition.session_count - used, 0)


def redeem_package_usage(package_purchase, *, appointment=None, group_session=None):
    """Paketin bir hakkını bir randevu ya da grup seansı için tüketir - ikisi
    birden ya da hiçbiri verilirse hata. select_for_update() ile korunuyor
    (aynı paketten iki hakkın neredeyse eşzamanlı tüketilip kalan hakkı
    negatife düşürmesini engeller)."""
    from .models import PackagePurchase, PackageUsage

    if bool(appointment) == bool(group_session):
        raise PaymentError("Bir paket kullanımı ya bir randevuya ya bir grup seansına bağlanmalı (ikisi birden değil).")

    with transaction.atomic():
        package_purchase = PackagePurchase.objects.select_for_update().get(pk=package_purchase.pk)
        if get_package_remaining_sessions(package_purchase) <= 0:
            raise PaymentError("Bu paketin kalan hakkı yok.")
        return PackageUsage.objects.create(
            package_purchase=package_purchase, appointment=appointment, group_session=group_session,
        )
