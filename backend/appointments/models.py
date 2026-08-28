from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Appointment(models.Model):
    expert = models.ForeignKey(User, on_delete=models.CASCADE, related_name="appointments_as_expert")
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="appointments_as_client")

    date = models.DateField()
    time = models.TimeField()
    duration = models.IntegerField(default=45)

    # Seansın teslimat şekli (Online/Yüz Yüze/Karma) - accounts.SessionType.
    # Önceden ExpertProfile.session_types (M2M) olarak uzmanın sabit bir
    # niteliğiydi; teslimat şekli aslında seansın özelliği olduğu için buraya
    # taşındı (bkz. Seans Tipi Kataloğu planı, Faz 1). session_offering
    # (bireysel/grup/psikoeğitim - "hangi hizmet") ile KARIŞTIRILMAMALI.
    session_type = models.ForeignKey(
        "accounts.SessionType", verbose_name="Seans Türü (Online/Yüz Yüze/Karma)",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments"
    )
    # "Hangi hizmet" (bireysel/grup/psikoeğitim) - catalog.SessionOffering,
    # session_type (teslimat şekli) ile KARIŞTIRILMAMALI. Faz 2'nin PricingRule
    # çözümlemesi (session_offering bazlı kural arama) bu alana ihtiyaç
    # duyduğu için Faz 1'e ek olarak burada eklendi. Mevcut randevular data
    # migration'ıyla individual_therapy'e varsayılan atanır (bugüne kadar
    # booking akışı zaten sadece bireysel terapi üretiyordu).
    session_offering = models.ForeignKey(
        "catalog.SessionOffering", verbose_name="Seans Tipi (Hizmet)",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments"
    )

    is_confirmed = models.BooleanField(default=False)
    is_free_trial = models.BooleanField("Ücretsiz İlk Seans", default=False)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Beklemede'),                   # uzman tarafından oluşturuldu, onay bekliyor
            ('waiting_approval', 'Onay Bekliyor'),      # danışan tarafından oluşturuldu
            ('confirmed', 'Onaylandı'),
            ('cancel_requested', 'İptal Talep Edildi'), # danışan iptal istedi
            ('cancelled', 'İptal Edildi'),
            ('completed', 'Tamamlandı'),
        ],
        default='pending'
    )

    # Soft delete için alan
    is_deleted = models.BooleanField(default=False)

    # Zoom entegrasyonu için alanlar
    zoom_start_url = models.URLField(max_length=1000, null=True, blank=True)
    zoom_join_url = models.URLField(max_length=500, null=True, blank=True)
    zoom_meeting_id = models.CharField(max_length=128, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'appointments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.expert.get_full_name()} - {self.client.get_full_name()} ({self.date})"


class GroupSessionStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Planlandı'
    CANCELLED = 'cancelled', 'İptal Edildi'
    COMPLETED = 'completed', 'Tamamlandı'


class GroupSession(models.Model):
    """Grup terapisi/grup psikoeğitim seansı (Faz 5 - Seans Tipi Kataloğu
    planı). Appointment'tan BİLİNÇLİ OLARAK AYRIK bir model: Appointment'ı
    çok-katılımcılı hale getirmek payments/notifications/mailer/messaging/forms
    katmanlarının HER BİRİNE "kaç katılımcı var" dallanması eklemeyi
    gerektirirdi - ayrık model Appointment'ı tek-sorumluluklu bırakırken bu
    modelin baştan N-katılımcılı tasarlanmasına izin verir (bkz. plan
    dokümanının "Mimari karar" bölümü).

    Bir uzman aynı anda birden fazla GroupSession açabilir - burada bir kısıt
    yok (plan kararı).
    """
    expert = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_sessions_as_expert')
    session_offering = models.ForeignKey(
        'catalog.SessionOffering', on_delete=models.PROTECT, related_name='group_sessions',
        verbose_name="Seans Tipi",
    )
    session_type = models.ForeignKey(
        'accounts.SessionType', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='group_sessions', verbose_name="Seans Türü (Online/Yüz Yüze/Karma)",
    )
    variant = models.ForeignKey(
        'catalog.SessionOfferingVariant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='group_sessions', verbose_name="Varyant (örn. Ex-User Grubu)",
    )

    date = models.DateField()
    time = models.TimeField()
    duration = models.IntegerField(default=90)
    capacity = models.PositiveIntegerField("Kapasite")
    status = models.CharField(max_length=16, choices=GroupSessionStatus.choices, default=GroupSessionStatus.SCHEDULED)

    zoom_start_url = models.URLField(max_length=1000, null=True, blank=True)
    zoom_join_url = models.URLField(max_length=500, null=True, blank=True)
    zoom_meeting_id = models.CharField(max_length=128, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.session_offering.name} - {self.expert.get_full_name()} ({self.date})"

    class Meta:
        verbose_name = "Grup Seansı"
        verbose_name_plural = "Grup Seansları"
        ordering = ['-date', '-time']


class GroupSessionParticipantStatus(models.TextChoices):
    """Müsaitlik -> talep -> onay -> ödeme akışının durum makinesi (Frontend
    Yapılandırması planı, Faz 1). PENDING_APPROVAL: danışan talep gönderdi,
    uzman henüz karar vermedi - kapasiteyi TÜKETMEZ. APPROVED: uzman onayladı
    (ya da bekleme listesinden terfi etti) - kapasiteyi TÜKETİR, ödeme
    bekleniyor/tamamlanmış olabilir (bkz. GroupSessionParticipant.payment).
    REJECTED: uzman reddetti - kalıcı, tekrar talep edilebilir (unique
    constraint client+group_session olduğu için reddedilen bir talep
    silinmeden yeni bir talebe izin vermek üzere admin/servis katmanında
    ayrıca ele alınır)."""
    PENDING_APPROVAL = 'pending_approval', 'Onay Bekliyor'
    APPROVED = 'approved', 'Onaylandı'
    REJECTED = 'rejected', 'Reddedildi'


class GroupSessionParticipant(models.Model):
    """Bir katılımcının bir GroupSession'a kaydı - HER katılımcı KENDİ ödemesini
    yapar (plan kararı), bu yüzden her satırın kendine ait bir Payment'ı var
    (organizatör/toplu ödeme kavramı yok).

    `payment` nullable (Faz 1, DEĞİŞTİ) - bir talep PENDING_APPROVAL ya da
    REJECTED durumundayken hiç Payment yoktur, sadece APPROVED + ödeme
    tamamlanmış bir katılımcının payment'ı dolar (bkz.
    payments/services.py::initiate_group_participant_checkout)."""
    group_session = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='participants')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_session_participations')
    status = models.CharField(
        "Durum", max_length=20, choices=GroupSessionParticipantStatus.choices,
        default=GroupSessionParticipantStatus.PENDING_APPROVAL,
    )
    payment = models.ForeignKey(
        'payments.Payment', null=True, blank=True, on_delete=models.PROTECT,
        related_name='group_session_participation',
    )
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
        verbose_name="İnceleyen Uzman",
    )
    reviewed_at = models.DateTimeField("İncelenme Tarihi", null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Grup Seansı Katılımcısı"
        verbose_name_plural = "Grup Seansı Katılımcıları"
        constraints = [
            models.UniqueConstraint(fields=['group_session', 'client'], name='unique_group_session_participant'),
        ]

    def __str__(self):
        return f"{self.client.get_full_name()} -> {self.group_session} ({self.status})"


class GroupSessionWaitlist(models.Model):
    """Kapasite dolduğunda bir katılımcının düştüğü bekleme listesi (Faz 5,
    plan kararı: "kapasite dolduğunda bekleme listesi olsun"). FIFO sıralama
    joined_waitlist_at üzerinden. Bir yer açılınca sıradaki kişiye bildirim
    gider (notified_at dolar) ve claim_expires_at süresi içinde katılması
    beklenir - süre dolarsa sıradaki kişiye geçilir (bkz.
    payments/services.py::promote_next_from_waitlist)."""
    group_session = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='waitlist_entries')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_session_waitlist_entries')
    joined_waitlist_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    claim_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Grup Seansı Bekleme Listesi Kaydı"
        verbose_name_plural = "Grup Seansı Bekleme Listesi Kayıtları"
        constraints = [
            models.UniqueConstraint(fields=['group_session', 'client'], name='unique_group_session_waitlist_entry'),
        ]
        ordering = ['joined_waitlist_at']

    def __str__(self):
        return f"{self.client.get_full_name()} bekleme listesinde -> {self.group_session}"