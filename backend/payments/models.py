# payments/models.py
from django.conf import settings
from django.db import models


class PaymentType(models.TextChoices):
    """Neyin ödendiği. Şimdilik tek değer var - danışan her seans için ayrı
    öder. İleride toplu seans paketi eklenince (bkz. kök claude.md ->
    Geliştirme Fikirleri) buraya yeni bir choice eklenecek, mevcut satırlar
    etkilenmeyecek (basit bir migration)."""
    SINGLE_SESSION = 'single_session', 'Tekil Seans'


class PaymentFlow(models.TextChoices):
    """iyzico'nun ödemeyi HANGİ mekanizmayla işlediği - bkz. services.py modül
    docstring'i. DIRECT: tek adımda tahsilat (auth/ecom). PREAUTH: önce bloke,
    sonra ayrı bir postAuth çağrısıyla tahsilat ya da cancel ile bloke kaldırma
    (preauth/ecom) - şu an hiçbir appointments akışına bağlı değil, ileride
    "talep anında bloke" politikasına geçilirse kullanılacak."""
    DIRECT = 'direct', 'Direkt Satış'
    PREAUTH = 'preauth', 'Ön Provizyon'


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Beklemede'
    AUTHORIZED = 'authorized', 'Bloke Kondu'
    SUCCEEDED = 'succeeded', 'Tahsil Edildi'
    VOIDED = 'voided', 'Bloke Kaldırıldı'
    FAILED = 'failed', 'Başarısız'
    REFUNDED = 'refunded', 'İade Edildi'


class Payment(models.Model):
    """Jenerik, tek bir ödeme kaydı. `appointment` nullable - ileride bir
    randevuya bağlı olmayan toplu paket satın alımları da aynı modeli
    kullanacak. `metadata`, indirim/kupon gibi henüz var olmayan gelecekteki
    detayların şema değişmeden eklenebileceği serbest alan (bkz. kök claude.md
    -> Geliştirme Fikirleri, "%3 toplu alım indirimi" ve "indirim kodu").

    payer'da on_delete=PROTECT kullanılıyor - projedeki diğer User FK'ları
    (Appointment.expert/client vb.) CASCADE kullanıyor, ama burada bilinçli
    bir sapma: bir kullanıcı silinirse (ki User zaten is_deleted ile soft-delete
    ediliyor, gerçek DELETE pratikte hiç olmuyor) mali kayıtların sessizce yok
    olmaması tercih edildi.
    """
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='payments',
        verbose_name="Ödeyen",
    )
    appointment = models.ForeignKey(
        'appointments.Appointment', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='payments', verbose_name="Randevu",
    )

    payment_type = models.CharField(
        "Ödeme Tipi", max_length=32, choices=PaymentType.choices, default=PaymentType.SINGLE_SESSION,
    )
    flow = models.CharField("Akış", max_length=16, choices=PaymentFlow.choices, default=PaymentFlow.DIRECT)
    status = models.CharField(
        "Durum", max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING,
    )

    amount = models.DecimalField("Tutar", max_digits=8, decimal_places=2)
    currency = models.CharField("Para Birimi", max_length=8, default="TRY")

    # Bizim ürettiğimiz, iyzico'ya gönderdiğimiz eşleştirme anahtarı.
    conversation_id = models.CharField("Conversation ID", max_length=64, unique=True)
    # Checkout Form initialize yanıtından dönen, retrieve çağrısında kullanılan token.
    provider_token = models.CharField("iyzico Token", max_length=128, null=True, blank=True)
    # iyzico'nun kendi ödeme numarası - postAuth/cancel/refund çağrılarında gerekir.
    provider_payment_id = models.CharField("iyzico Payment ID", max_length=64, null=True, blank=True)

    failure_reason = models.TextField("Hata Nedeni", null=True, blank=True)
    metadata = models.JSONField("Ek Bilgi", default=dict, blank=True)

    created_at = models.DateTimeField("Oluşturulma Tarihi", auto_now_add=True)
    updated_at = models.DateTimeField("Güncellenme Tarihi", auto_now=True)

    class Meta:
        verbose_name = "Ödeme"
        verbose_name_plural = "Ödemeler"
        ordering = ['-created_at']

    def __str__(self):
        return f"Ödeme #{self.id} ({self.get_status_display()}) - {self.amount} {self.currency}"
