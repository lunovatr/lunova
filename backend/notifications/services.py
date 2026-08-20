from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone

from appointments.models import Appointment
from .models import Notification

# "2-3 gün içerisinde yaklaşan randevu" isteği - üst sınır 3 gün olarak seçildi.
UPCOMING_WINDOW = timedelta(days=3)
# Okunmuş bildirimler 20 gün sonra listeden (ve DB'den) kaldırılır.
READ_RETENTION = timedelta(days=20)


def _appointment_datetime(appointment):
    naive = datetime.combine(appointment.date, appointment.time)
    return timezone.make_aware(naive, timezone.get_default_timezone())


def _reminder_title(appointment, user):
    other_party = appointment.expert if appointment.client_id == user.id else appointment.client
    return f"Yaklaşan randevu: {other_party.get_full_name()}"


def _reminder_body(appointment):
    local_dt = timezone.localtime(_appointment_datetime(appointment))
    return f"{local_dt.strftime('%d.%m.%Y')} {local_dt.strftime('%H:%M')}"


def sync_appointment_reminders(user):
    """Kullanıcının önümüzdeki UPCOMING_WINDOW içindeki onaylanmış randevuları
    için (yoksa) bir Notification satırı oluşturur.

    `dedupe_key` üzerindeki unique constraint sayesinde `get_or_create`
    idempotent - bu fonksiyon her `GET /notifications/` çağrısında yeniden
    çalıştırılabilir, var olan (okunmuş ya da okunmamış) bir bildirimin
    üzerine yazmaz / read state'ini sıfırlamaz.
    """
    now = timezone.now()
    window_end = now + UPCOMING_WINDOW

    candidates = Appointment.objects.filter(
        Q(expert=user) | Q(client=user),
        status='confirmed',
        is_deleted=False,
        date__range=[now.date(), window_end.date()],
    )

    for appointment in candidates:
        appt_dt = _appointment_datetime(appointment)
        if not (now <= appt_dt <= window_end):
            continue

        Notification.objects.get_or_create(
            user=user,
            dedupe_key=f"appointment_reminder:{appointment.id}",
            defaults={
                'notification_type': 'appointment_reminder',
                'title': _reminder_title(appointment, user),
                'body': _reminder_body(appointment),
                'appointment': appointment,
            },
        )


def cleanup_old_read_notifications(user):
    """Okunma tarihinin üzerinden READ_RETENTION geçmiş bildirimleri siler."""
    cutoff = timezone.now() - READ_RETENTION
    Notification.objects.filter(
        user=user, is_read=True, read_at__lt=cutoff
    ).delete()
