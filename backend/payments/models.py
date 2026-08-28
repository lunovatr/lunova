# payments/models.py
from decimal import Decimal

from django.conf import settings
from django.db import models


class PaymentType(models.TextChoices):
    """Neyin ödendiği. PACKAGE (Faz 7, YENİ) - bir PackagePurchase için ödenen
    toplu tutar; single_session'dan farkı appointment/group_session FK'sinin
    doldurulmaMASI (paket, satın alma anında belirli bir randevuya bağlı
    değildir - kullanım PackageUsage üzerinden ayrıca kaydedilir)."""
    SINGLE_SESSION = 'single_session', 'Tekil Seans'
    PACKAGE = 'package', 'Seans Paketi'


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


class CommissionType(models.TextChoices):
    PERCENTAGE = 'percentage', 'Yüzde'
    FIXED_AMOUNT = 'fixed_amount', 'Sabit Tutar'


class PricingRule(models.Model):
    """Katman 2 - Fiyatlandırma Modeli (bkz. Seans Tipi Kataloğu & Fiyatlandırma
    Motoru planı, Faz 2). Katman 1'deki `catalog.SessionOffering`'den BİLİNÇLİ
    OLARAK bağımsız bir modeldir - biri diğerini yeniden yazmadan değişebilsin
    diye ayrı app'te yaşıyor (catalog seans TÜRLERİNİ tanımlar, payments bu
    türlerin NASIL ücretlendirileceğini tanımlar).

    `session_offering=None` -> tüm seans tiplerine uygulanan genel varsayılan.
    `expert=None` -> platform geneli (uzmana özel değil).
    En spesifik eşleşme kazanır - bkz. services.py::resolve_pricing_rule().

    `commission_value`: commission_type=PERCENTAGE iken 0-100 arası bir yüzde,
    FIXED_AMOUNT iken client_price ile aynı para biriminde sabit bir tutar.
    """
    session_offering = models.ForeignKey(
        'catalog.SessionOffering', verbose_name="Seans Tipi", null=True, blank=True,
        on_delete=models.CASCADE, related_name='pricing_rules',
    )
    expert = models.ForeignKey(
        'accounts.ExpertProfile', verbose_name="Uzman", null=True, blank=True,
        on_delete=models.CASCADE, related_name='pricing_rules',
    )
    variant = models.ForeignKey(
        'catalog.SessionOfferingVariant', verbose_name="Varyant", null=True, blank=True,
        on_delete=models.CASCADE, related_name='pricing_rules',
        help_text="Kıdem seviyesi/ex-user grubu gibi bir alt kırılıma özel fiyat gerekiyorsa doldurulur.",
    )
    client_price = models.DecimalField("Danışan Fiyatı", max_digits=8, decimal_places=2)
    currency = models.CharField("Para Birimi", max_length=8, default="TRY")
    commission_type = models.CharField(
        "Komisyon Tipi", max_length=16, choices=CommissionType.choices, default=CommissionType.PERCENTAGE,
    )
    commission_value = models.DecimalField(
        "Komisyon Değeri", max_digits=8, decimal_places=2, default=Decimal('0'),
    )
    effective_from = models.DateTimeField("Geçerlilik Başlangıcı", null=True, blank=True)
    effective_until = models.DateTimeField("Geçerlilik Bitişi", null=True, blank=True)
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        scope = self.session_offering.name if self.session_offering_id else "Tüm Seans Tipleri"
        who = self.expert.user.get_full_name() if self.expert_id else "Platform Geneli"
        return f"{who} - {scope} ({self.client_price} {self.currency})"

    def clean(self):
        # Faz 8 - aynı (seans tipi, uzman, varyant) kapsamı için aynı anda
        # birden fazla AKTİF kural olmasını engeller. BİLİNÇLİ OLARAK bir DB
        # UniqueConstraint DEĞİL, model-seviyesi validasyon: session_offering/
        # expert/variant'ın üçü de nullable, ve SQL'de NULL hiçbir zaman
        # NULL'a "eşit" sayılmaz (partial unique index bile bunu yakalayamaz) -
        # en yaygın durum olan "platform geneli" (hepsi NULL) kuralda bu
        # yüzden bir DB constraint'i sessizce işe yaramaz kalırdı. Bu, Django
        # admin'in ModelForm'u (full_clean üzerinden) her kayıtta otomatik
        # çağırdığı için "admin panelinden yanlış veri girmeyi zorlaştırma"
        # hedefini (plan, Faz 8) karşılıyor; doğrudan ORM ile (migration/feed
        # script) oluşturulan kayıtlar validate_unique/clean() çağırmaz -
        # bilinçli, çünkü Faz 8'in kapsamı sadece admin arayüzü.
        from django.core.exceptions import ValidationError

        if not self.is_active:
            return

        conflicting = PricingRule.objects.filter(
            session_offering=self.session_offering,
            expert=self.expert,
            variant=self.variant,
            is_active=True,
        ).exclude(pk=self.pk)
        if conflicting.exists():
            raise ValidationError(
                "Bu seans tipi/uzman/varyant kapsamı için zaten AKTİF bir fiyatlandırma "
                "kuralı var. Önce onu pasifleştirin ya da bu kuralı pasif olarak kaydedin."
            )

    class Meta:
        verbose_name = "Fiyatlandırma Kuralı"
        verbose_name_plural = "Fiyatlandırma Kuralları"
        ordering = ['-created_at']


class DiscountType(models.TextChoices):
    PERCENTAGE = 'percentage', 'Yüzde'
    FIXED_AMOUNT = 'fixed_amount', 'Sabit Tutar'


class DiscountCostBearer(models.TextChoices):
    PLATFORM = 'platform', 'Platform'
    EXPERT = 'expert', 'Uzman'
    SHARED = 'shared', 'Platform + Uzman (Paylaşımlı)'


class DiscountSourceType(models.Model):
    """İndirimin KAYNAĞI (promosyon/sponsor/referans/iç test vb.) - admin
    panelinden ekle/çıkar/deactivate edilebilen bir lookup tablosu (Faz 1'deki
    SessionOffering.is_active deseniyle aynı - hardcoded TextChoices DEĞİL,
    kullanıcı "ekleme çıkarma yapabileyim" dediği için)."""
    name = models.CharField("Ad", max_length=64, unique=True)
    slug = models.SlugField("Slug", max_length=64, unique=True)
    is_active = models.BooleanField("Aktif mi?", default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "İndirim Kaynak Tipi"
        verbose_name_plural = "İndirim Kaynak Tipleri"
        ordering = ["name"]


class DiscountRule(models.Model):
    """İndirimin KENDİSİ - kullanıcıya hiç görünmez, sadece DiscountCode'lar
    buna bağlanır (bir kural, birden fazla kod tarafından paylaşılabilir).

    cost_bearer: bu indirimin maliyetini kim üstleniyor. SHARED iken
    expert_cost_share_percentage (0-100) maliyetin uzmana düşen yüzdesini
    belirler, kalanı platform üstlenir - bkz. services.py::apply_discount_to_pricing().
    """
    discount_type = models.CharField(
        "İndirim Tipi", max_length=16, choices=DiscountType.choices, default=DiscountType.PERCENTAGE,
    )
    value = models.DecimalField("Değer", max_digits=8, decimal_places=2)
    applies_to_offering = models.ForeignKey(
        'catalog.SessionOffering', verbose_name="Uygulanacağı Seans Tipi", null=True, blank=True,
        on_delete=models.CASCADE, related_name='discount_rules',
        help_text="Boş bırakılırsa tüm seans tiplerine uygulanır.",
    )
    source_type = models.ForeignKey(
        DiscountSourceType, verbose_name="Kaynak", on_delete=models.PROTECT, related_name='discount_rules',
    )
    sponsor_name = models.CharField("Sponsor Adı", max_length=128, null=True, blank=True)
    cost_bearer = models.CharField(
        "Maliyeti Kim Üstleniyor?", max_length=16, choices=DiscountCostBearer.choices,
        default=DiscountCostBearer.PLATFORM,
    )
    expert_cost_share_percentage = models.DecimalField(
        "Uzmanın Maliyet Payı (%)", max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Sadece cost_bearer=SHARED iken kullanılır.",
    )
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        value_display = f"%{self.value}" if self.discount_type == DiscountType.PERCENTAGE else f"{self.value} TRY"
        return f"{self.source_type.name} - {value_display}"

    class Meta:
        verbose_name = "İndirim Kuralı"
        verbose_name_plural = "İndirim Kuralları"
        ordering = ['-created_at']


class DiscountCode(models.Model):
    """Kullanıcının GİRDİĞİ kod - bir DiscountRule'a bağlanır. Kullanım sayısı
    ayrı bir sayaç ALANINDA TUTULMAZ, Payment.discount_code üzerinden
    hesaplanır (bkz. services.py::validate_discount_code) - projenin
    "hesapla, ayrı state tutma" ilkesiyle tutarlı (messaging kotası,
    ücretsiz-ilk-seans-hakkı ile aynı desen).

    Süresi dolan/artık kullanılmayan bir sponsor kodu SİLİNMEZ, is_active=False
    yapılır - sponsorlukla tekrar anlaşılırsa AYNI satır is_active=True +
    yeni valid_until ile yeniden açılır, geçmiş kullanım kaybolmaz (Document.
    is_current/Appointment.is_free_trial ile aynı "deactivate, silme" deseni).
    """
    code = models.CharField("Kod", max_length=64, unique=True)
    discount_rule = models.ForeignKey(
        DiscountRule, verbose_name="İndirim Kuralı", on_delete=models.CASCADE, related_name='codes',
    )
    valid_from = models.DateTimeField("Geçerlilik Başlangıcı", null=True, blank=True)
    valid_until = models.DateTimeField("Geçerlilik Bitişi", null=True, blank=True)
    max_redemptions = models.PositiveIntegerField("Maksimum Toplam Kullanım", null=True, blank=True)
    max_redemptions_per_user = models.PositiveIntegerField("Kullanıcı Başına Maksimum Kullanım", default=1)
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code

    class Meta:
        verbose_name = "İndirim Kodu"
        verbose_name_plural = "İndirim Kodları"
        ordering = ['-created_at']


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

    # Danışan fiyatı / uzman kazancı / platform payı üç ayrı değişken (Faz 2) -
    # `amount` danışanın ödediği toplam tutar (yukarıdaki client_price ile
    # aynı), bu ikisi onun platform/uzman arasındaki bölünüşü. Ücretsiz ilk
    # seans (amount=0) için ikisi de 0 kalır - gerçek para hareketi yok.
    platform_commission = models.DecimalField(
        "Platform Payı", max_digits=8, decimal_places=2, default=Decimal('0'),
    )
    expert_earning = models.DecimalField(
        "Uzman Kazancı", max_digits=8, decimal_places=2, default=Decimal('0'),
    )
    pricing_rule = models.ForeignKey(
        'PricingRule', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='payments', verbose_name="Uygulanan Fiyatlandırma Kuralı",
    )
    discount_code = models.ForeignKey(
        'DiscountCode', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='payments', verbose_name="Kullanılan İndirim Kodu",
    )

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


class PackageDefinition(models.Model):
    """Toplu seans paketi tanımı (Faz 7). KENDİ bir client_price alanı YOK -
    toplam fiyat satın alma anında platform-geneli (expert=None) PricingRule
    katmanından TÜRETİLİR: session_count × birim fiyat × (1 -
    discount_percentage/100) - bkz. services.py::compute_package_price().
    Bu, paketin "farklı uzmanlarda kullanılabilir" olması (plan kararı) ile
    tutarlı: tek bir uzmana özel bir fiyat baz alınamaz.
    """
    name = models.CharField("Ad", max_length=128)
    session_count = models.PositiveIntegerField("Seans Sayısı")
    applies_to_offering = models.ForeignKey(
        'catalog.SessionOffering', verbose_name="Seans Tipi", on_delete=models.CASCADE,
        related_name='package_definitions',
    )
    discount_percentage = models.DecimalField(
        "İndirim Yüzdesi", max_digits=5, decimal_places=2, default=Decimal('0'),
    )
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.session_count} seans)"

    class Meta:
        verbose_name = "Paket Tanımı"
        verbose_name_plural = "Paket Tanımları"
        ordering = ['name']


class PackagePurchase(models.Model):
    """Bir danışanın bir PackageDefinition'ı satın alması. `expert` FK'sı
    BİLİNÇLİ OLARAK YOK - paket satın alma anında belirli bir uzmana kilitli
    değil, hangi uzmanla kullanıldığı sadece PackageUsage.appointment/
    group_session üzerinden görülür (plan kararı). `valid_until` da YOK -
    paket hakları süresizdir (plan kararı)."""
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='package_purchases',
        verbose_name="Danışan",
    )
    package_definition = models.ForeignKey(
        PackageDefinition, on_delete=models.PROTECT, related_name='purchases', verbose_name="Paket",
    )
    payment = models.OneToOneField(
        'Payment', on_delete=models.PROTECT, related_name='package_purchase', verbose_name="Ödeme",
    )
    purchased_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client.get_full_name()} - {self.package_definition.name}"

    class Meta:
        verbose_name = "Paket Satın Alımı"
        verbose_name_plural = "Paket Satın Alımları"
        ordering = ['-purchased_at']


class PackageUsage(models.Model):
    """Bir paket hakkının TEK bir kullanımı - ya bir Appointment'a ya bir
    GroupSession'a bağlanır (ikisi birden değil, hiçbiri değil de olmaz -
    bkz. aşağıdaki CheckConstraint). 'Kalan hak' AYRI bir sayaç alanında
    TUTULMAZ, services.py::get_package_remaining_sessions() bu tablodaki
    satırları sayarak hesaplar (projenin genelindeki "hesapla, tutma"
    ilkesiyle tutarlı)."""
    package_purchase = models.ForeignKey(PackagePurchase, on_delete=models.CASCADE, related_name='usages')
    appointment = models.ForeignKey(
        'appointments.Appointment', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='package_usages',
    )
    group_session = models.ForeignKey(
        'appointments.GroupSession', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='package_usages',
    )
    used_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        target = self.appointment or self.group_session
        return f"{self.package_purchase} -> {target}"

    class Meta:
        verbose_name = "Paket Kullanımı"
        verbose_name_plural = "Paket Kullanımları"
        ordering = ['-used_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(appointment__isnull=False, group_session__isnull=True)
                    | models.Q(appointment__isnull=True, group_session__isnull=False)
                ),
                name='package_usage_exactly_one_target',
            ),
        ]

    def __str__(self):
        return f"Ödeme #{self.id} ({self.get_status_display()}) - {self.amount} {self.currency}"
