from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """Eşleşen bir uzman-danışan çifti arasındaki tek not/mesaj hattı.

    Klasik chat DEĞİL - "yazıyor" durumu, çoklu konu/kanal gibi bir kavram
    yok, çift başına tek bir sürekli hat var. Bir Conversation satırı sadece
    ilk mesaj gönderildiğinde (get_or_create ile) oluşturulur - hiç
    mesajlaşmamış çiftler için boş satır birikmez (bkz. messaging/views.py).
    """

    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_expert',
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_client',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['expert', 'client'],
                name='unique_expert_client_conversation',
            ),
        ]

    def __str__(self):
        return f"{self.expert} <-> {self.client}"


class Message(models.Model):
    """Bir Conversation içindeki tek bir not.

    Karakter limiti (MAX_LENGTH) ve gönderim sıklığı limiti (bkz.
    messaging/views.py -> ScopedRateThrottle) bilinçli olarak uygulanıyor -
    amaç canlı bir sohbet değil, kompakt bir not bırakma mekanizması.
    """

    MAX_LENGTH = 1000

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    body = models.CharField(max_length=MAX_LENGTH)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender} @ {self.created_at:%Y-%m-%d %H:%M}"
