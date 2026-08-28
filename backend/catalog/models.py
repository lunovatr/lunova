from django.db import models


class SessionOfferingCategory(models.TextChoices):
    INDIVIDUAL = "individual", "Bireysel"
    GROUP = "group", "Grup"
    EDUCATIONAL = "educational", "Eğitim"


class SessionOffering(models.Model):
    """Sistemin arka planda tanıdığı seans türü (Katman 1 - Seans Tipi Kataloğu).

    `code` dahili bir teknik anahtardır, İNDİRİM/KAMPANYA KODU DEĞİLDİR ve
    kullanıcıya hiç gösterilmez (bkz. payments discount code sistemi, Faz 3).
    Fiyatlandırma bu modele değil, ayrı ve bağımsız bir katmana (PricingRule)
    bağlanır - bkz. Faz 2.
    """
    code = models.SlugField("Kod", max_length=64, unique=True)
    name = models.CharField("Ad", max_length=128)
    category = models.CharField(
        "Kategori", max_length=16, choices=SessionOfferingCategory.choices
    )
    requires_multi_participant = models.BooleanField(
        "Çok Katılımcılı mı?", default=False,
        help_text="True ise bu seans türü GroupSession rezervasyon motorunu gerektirir."
    )
    default_duration_minutes = models.PositiveIntegerField(
        "Varsayılan Süre (dk)", null=True, blank=True
    )
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Seans Tipi"
        verbose_name_plural = "Seans Tipi Kataloğu"
        ordering = ["name"]


class SessionOfferingVariant(models.Model):
    """Bir SessionOffering'in İÇİNDE farklılaşan alt kırılım (Faz 4) - hem
    kıdem seviyesi ("tier_0", "tier_1", ... - bkz. Faz 6'nın lazy hesaplaması)
    hem ex-user/karma grup ayrımı ("ex_user_only", "mixed_group" - bkz. Faz 5)
    aynı modeli kullanır, `variant_key` serbest bir string olduğu için yeni
    bir varyant türü eklemek migration gerektirmez.

    payments.PricingRule.variant buna bağlanır - bir varyant için farklı bir
    fiyat/komisyon tanımlamak istenirse.
    """
    session_offering = models.ForeignKey(
        SessionOffering, verbose_name="Seans Tipi", on_delete=models.CASCADE, related_name='variants',
    )
    variant_key = models.SlugField("Varyant Anahtarı", max_length=64)
    variant_label = models.CharField("Varyant Adı", max_length=128)
    is_active = models.BooleanField("Aktif mi?", default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.session_offering.name} - {self.variant_label}"

    class Meta:
        verbose_name = "Seans Tipi Varyantı"
        verbose_name_plural = "Seans Tipi Varyantları"
        constraints = [
            models.UniqueConstraint(
                fields=["session_offering", "variant_key"], name="unique_offering_variant_key",
            ),
        ]
        ordering = ["session_offering", "variant_key"]
