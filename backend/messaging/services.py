from datetime import datetime, timedelta

from django.utils import timezone

from appointments.models import Appointment
from .models import Message

# Danışan seans başına (iki seans arası) toplam CLIENT_MESSAGE_LIMIT kadar not
# hakkına sahip - kullanıcı talebiyle bilinçli olarak zaman-bazlı (saatte X)
# değil, seans-bazlı bir kota. Uzmanın hiçbir mesaj sınırı yok.
CLIENT_MESSAGE_LIMIT = 5
CLIENT_MESSAGE_MAX_LENGTH = 200


def _appointment_end_datetime(appointment):
    naive = datetime.combine(appointment.date, appointment.time)
    start = timezone.make_aware(naive, timezone.get_default_timezone())
    return start + timedelta(minutes=appointment.duration)


def _quota_window_start(expert_id, client_id):
    """En son TAMAMLANMIŞ seansın bitiş zamanını döner - kota bu andan
    sonraki danışan mesajlarını sayar ("her seans sonrası yenilenir").
    Hiç tamamlanmış seans yoksa None döner (konuşmanın başından itibaren say).
    """
    last_completed = (
        Appointment.objects.filter(
            expert_id=expert_id,
            client_id=client_id,
            status="completed",
            is_deleted=False,
        )
        .order_by("-date", "-time")
        .first()
    )
    if not last_completed:
        return None
    return _appointment_end_datetime(last_completed)


def get_client_remaining_quota(expert_id, client_id):
    """Danışanın bu uzmanla mevcut kota penceresinde kalan not hakkı."""
    window_start = _quota_window_start(expert_id, client_id)
    qs = Message.objects.filter(
        conversation__expert_id=expert_id,
        conversation__client_id=client_id,
        sender_id=client_id,
    )
    if window_start:
        qs = qs.filter(created_at__gte=window_start)
    used = qs.count()
    return max(0, CLIENT_MESSAGE_LIMIT - used)
