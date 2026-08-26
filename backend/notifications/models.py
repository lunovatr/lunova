from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Kullanıcıya özel bildirimler.

    Üç üretici kaynak var: randevu hatırlatmaları (bkz. services.py ->
    sync_appointment_reminders, appointment FK'sini kullanır), messaging
    app'inden gelen yeni not bildirimleri (bkz. messaging/views.py, ilgili
    konuşmanın karşı tarafını işaretlemek için related_user FK'sini kullanır)
    ve accounts.Document onay/red kararları (bkz. accounts/services.py ->
    review_document, hiçbir FK kullanmaz - belge sahibi zaten `user` alanının
    kendisidir, tıklanınca frontend sabit olarak kullanıcının kendi profil
    sayfasına yönlendirir). notification_type + generic FK yapısı ileride
    başka bildirim türlerinin eklenebilmesi için bilinçli olarak genel tutuldu.
    """

    TYPE_CHOICES = [
        ('appointment_reminder', 'Randevu Hatırlatması'),
        ('message', 'Yeni Not'),
        ('document_status', 'Belge Durumu'),
        ('payment_required', 'Ödeme Gerekiyor'),
        ('payment_succeeded', 'Ödeme Alındı'),
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
    # 'message' tipi için: bildirime tıklanınca hangi konuşmaya/kullanıcıya
    # gidileceğini belirten genel amaçlı işaretçi (appointment FK'sinin
    # 'message' türü için karşılığı - appointment_reminder bunu kullanmaz).
    related_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
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
