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


def ensure_group_session_zoom_meeting(group_session) -> None:
    """ensure_zoom_meeting()'in GroupSession karşılığı (Faz 5) - TÜM
    katılımcılar AYNI toplantıyı paylaşır, bu yüzden ilk katılımcının ödemesi
    tamamlandığında bir kez oluşturulur (idempotency guard'ı zoom_meeting_id
    kontrolüyle aynı), sonraki katılımcılar için tekrar oluşturulmaz."""
    if group_session.zoom_meeting_id:
        return

    try:
        meeting_datetime = datetime.combine(group_session.date, group_session.time)
        topic = f"Grup Seansı: {group_session.session_offering.name} - Uzman {group_session.expert.get_full_name()}"

        if settings.ENVIRONMENT == 'Production':
            zoom_info = create_zoom_meeting(topic=topic, start_time=meeting_datetime, duration=group_session.duration)
        else:
            zoom_info = create_mock_zoom_meeting(group_session.id)

        group_session.zoom_start_url = zoom_info.get('start_url')
        group_session.zoom_join_url = zoom_info.get('join_url')
        group_session.zoom_meeting_id = str(zoom_info.get('id'))
        group_session.save(update_fields=['zoom_start_url', 'zoom_join_url', 'zoom_meeting_id'])
    except Exception:
        logger.exception("Zoom meeting creation failed for group session %s", group_session.id)


def cancel_appointment(appointment, *, actor) -> None:
    """Bir randevuyu iptal eder - appointments/views.py::status_update()'in
    'cancelled' dalındaki (status + is_confirmed set + mail) mantığın tek bir
    fonksiyona çıkarılmış hâli (Admin Panel Dokümantasyon/Güvenlik turu,
    YENİ). `status_update()`'in KENDİSİNE BİLİNÇLİ OLARAK dokunulmadı - zaten
    doğru çalışıyor, regresyon riski almaya gerek yok. Bu fonksiyon SADECE
    appointments/admin.py::AppointmentAdmin.mark_as_cancelled tarafından
    çağrılıyor - önceden orada `queryset.update(status='cancelled',
    is_confirmed=False)` ile ham bir toplu güncelleme yapılıyordu, bu
    send_appointment_cancellation_email'i (mail bildirimi) tamamen atlıyordu
    (Sağlık Kontrolü turunda AppointmentAdmin okunurken bulunan, bu turda
    düzeltilen ilişkili bir bug - kullanıcı kararı: bireysel randevu için de
    aynı düzeltme yapılsın).

    `actor` iptali yapan User - admin panelinden çağrıldığında bu admin'in
    kendisi olur; send_appointment_cancellation_email actor'ı ne expert ne
    client olarak tanımadığı için (fonksiyonun kendi mantığı: actor client
    değilse recipient=client varsayar) bu durumda bildirim DANIŞANA gider,
    uzmana gitmez - bu mailer fonksiyonunun var olan tasarımının bir sonucu,
    bu turda genişletilmedi (kapsam sadece mark_as_cancelled'ın mail'i hiç
    atlamaması, kime gittiği ayrı bir konu)."""
    from mailer.services import send_appointment_cancellation_email
    from notifications.services import create_appointment_cancellation_notification

    appointment.status = 'cancelled'
    appointment.is_confirmed = False
    appointment.save(update_fields=['status', 'is_confirmed', 'updated_at'])
    send_appointment_cancellation_email(appointment, actor=actor)
    create_appointment_cancellation_notification(appointment, actor=actor)


def grant_appointment_access_if_paid(appointment) -> bool:
    """True dönerse Zoom meeting oluşturuldu (ya da zaten vardı). False dönerse
    danışanın ödemesi bekleniyor - appointment'a hiç dokunulmadı."""
    from payments.services import resolve_appointment_payment

    if not resolve_appointment_payment(appointment):
        return False

    ensure_zoom_meeting(appointment)
    return True
