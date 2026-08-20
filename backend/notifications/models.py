from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Kullanıcıya özel bildirimler.

    Şu an tek üretici kaynak randevu hatırlatmaları (bkz. services.py ->
    sync_appointment_reminders), ama notification_type + generic appointment
    FK yapısı, ileride mesajlaşma gibi başka bildirim türlerinin de aynı
    modele (appointment=None, farklı bir notification_type ile) eklenebilmesi
    için bilinçli olarak genel tutuldu.
    """

    TYPE_CHOICES = [
        ('appointment_reminder', 'Randevu Hatırlatması'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    # Aynı kaynak olay (örn. aynı randevu) için tekrar tekrar bildirim
    # satırı oluşturulmasını (ve dolayısıyla "okunmuş" durumunun sıfırlanmasını)
    # engelleyen idempotency anahtarı - bkz. aşağıdaki UniqueConstraint.
    dedupe_key = models.CharField(max_length=255)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500, blank=True)
    appointment = models.ForeignKey(
        'appointments.Appointment',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'dedupe_key'],
                name='unique_user_notification_dedupe_key',
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.title}"
