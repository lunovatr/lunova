from django.contrib import admin
from django.utils.html import format_html
from lunova_backend.admin_notes import admin_note
from .models import (
    DiscountCode, DiscountRule, DiscountSourceType, PackageDefinition, PackagePurchase,
    PackageUsage, Payment, PricingRule,
)


@admin.register(DiscountSourceType)
class DiscountSourceTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'applies_to_offering', 'source_type', 'cost_bearer',
                     'expert_cost_share_percentage', 'is_active')
    list_filter = ('is_active', 'discount_type', 'cost_bearer', 'source_type')
    search_fields = ('sponsor_name',)
    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu kural KULLANICIYA hiç görünmez - sadece aşağıdaki 'İndirim Kodları' "
                "buna bağlanır (bir kural, birden fazla kod tarafından paylaşılabilir). "
                "Yeni bir promosyon için genelde önce burada bir kural, sonra 'İndirim "
                "Kodları' ekranında o kurala bağlı bir kod oluşturursunuz.",
                severity='info',
            ),
        }),
        ("İndirim Tanımı", {'fields': ('discount_type', 'value', 'applies_to_offering', 'source_type', 'sponsor_name')}),
        ("Maliyet Paylaşımı", {
            'fields': ('cost_bearer', 'expert_cost_share_percentage'),
            'description': admin_note(
                "'Maliyeti Kim Üstleniyor?' = Uzman ya da Paylaşımlı seçilirse, indirimin "
                "bir kısmı UZMANIN KAZANCINDAN düşülür (danışan aynı indirimi görür, sadece "
                "kimin ödediği değişir) - bu, uzmanlarla önceden anlaşılmış bir promosyon "
                "değilse uzmanı habersiz bırakmamaya dikkat edin.",
                severity='high',
            ),
        }),
        ("Durum", {'fields': ('is_active',)}),
    )


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_rule', 'valid_from', 'valid_until',
                     'max_redemptions', 'max_redemptions_per_user', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code',)
    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "'code' kullanıcının GİRDİĞİ metindir (örn. HOSGELDIN10) - kaydettikten "
                "SONRA değiştirmeyin, o kodu paylaşmış olduğunuz kişiler artık eski kodu "
                "kullanamaz. Kullanım sayısı ayrı bir sayaç DEĞİLDİR, bu kodla yapılmış "
                "başarılı ödemeler sayılarak anlık hesaplanır - burada elle "
                "sıfırlanamaz/artırılamaz.\n\n"
                "Artık kullanılmasını istemediğiniz bir kodu SİLMEYİN, 'Aktif mi?' "
                "kutusunu kapatın - geçmiş kullanım kaydı (hangi ödemelerde kullanıldığı) "
                "böylece korunur.",
                severity='medium',
            ),
        }),
        ("Kod", {'fields': ('code', 'discount_rule', 'is_active')}),
        ("Geçerlilik", {'fields': ('valid_from', 'valid_until', 'max_redemptions', 'max_redemptions_per_user')}),
    )


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'session_offering', 'expert', 'client_price', 'currency',
                     'commission_type', 'commission_value', 'is_active')
    list_filter = ('is_active', 'commission_type', 'session_offering', 'currency')
    search_fields = ('expert__user__first_name', 'expert__user__last_name', 'expert__user__email')
    autocomplete_fields = ('expert',)
    readonly_fields = ('price_preview',)
    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu kural DANIŞANIN GÖRDÜĞÜ FİYAT ile GERÇEKTEN TAHSİL EDİLEN tutarın "
                "AYNI kaynağıdır (booking ekranındaki fiyat rozeti de buradan gelir) - "
                "kaydettiğiniz an ETKİLİDİR, ayrı bir yayına alma adımı yoktur.\n\n"
                "'Seans Tipi'/'Uzman'/'Varyant' boş bırakılırsa o boyut için GENEL "
                "(herkese/hepsine uygulanan) bir kural olur - en SPESİFİK (üçü de dolu) "
                "kural her zaman kazanır. Aynı kapsam (seans tipi+uzman+varyant "
                "kombinasyonu) için birden fazla AKTİF kural oluşturmaya çalışırsanız "
                "kaydetme sırasında hata alırsınız - önce eskisini pasifleştirin.",
                severity='critical',
            ),
        }),
        ("Kapsam", {'fields': ('session_offering', 'expert', 'variant')}),
        ("Fiyat ve Komisyon", {'fields': ('client_price', 'currency', 'commission_type', 'commission_value', 'price_preview')}),
        ("Geçerlilik", {'fields': ('effective_from', 'effective_until', 'is_active')}),
    )

    def price_preview(self, obj):
        # Faz 8 - "bu kuralı kaydedersem örnek bir seansın fiyatı ne olur"
        # önizlemesi. Henüz kaydedilmemiş (obj.pk yok) bir formda client_price
        # boş olabileceği için sessizce '-' döner, JS/AJAX gerektirmez.
        if not obj.pk or obj.client_price is None:
            return "-"
        from .services import compute_commission_split
        platform_commission, expert_earning = compute_commission_split(
            obj.client_price, obj.commission_type, obj.commission_value
        )
        return (
            f"Danışan öder: {obj.client_price} {obj.currency}  |  "
            f"Platform payı: {platform_commission} {obj.currency}  |  "
            f"Uzman kazancı: {expert_earning} {obj.currency}"
        )
    price_preview.short_description = "Fiyat Önizleme (kayıttan sonra güncellenir)"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """İadeler bu turda otomatikleştirilmedi (iyzico refund API'si bağlanmadı) -
    kalan tek para-iadesi senaryosu (onaylı+ödenmiş bir randevunun sonradan
    iptali) için şimdilik admin'in manuel 'İade Edildi' işaretlemesi yeterli
    görüldü, bkz. payments/services.py modül docstring'i ve kök claude.md'deki
    ödeme politikası tartışması."""
    list_display = ('id', 'payer', 'appointment', 'payment_type', 'flow', 'status_colored', 'amount', 'currency',
                     'platform_commission', 'expert_earning', 'discount_code', 'created_at')
    list_filter = ('status', 'flow', 'payment_type', 'currency')
    search_fields = ('payer__email', 'payer__first_name', 'payer__last_name', 'conversation_id', 'provider_payment_id')
    readonly_fields = (
        'payer', 'appointment', 'payment_type', 'flow', 'amount', 'currency',
        'platform_commission', 'expert_earning', 'pricing_rule', 'discount_code',
        'conversation_id', 'provider_token', 'provider_payment_id',
        'created_at', 'updated_at',
    )
    actions = ['mark_refunded']

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu, GERÇEK bir mali kayıttır - hemen hemen HER alanı salt-okunur "
                "(sistem tarafından ödeme sırasında üretilir), elle değiştirilemez. "
                "Tek elle yapılabilecek işlem: bir ödemeyi 'İade Edildi' olarak "
                "işaretlemek (aşağıdaki toplu aksiyon) - bu SADECE bir ETİKETTİR, "
                "iyzico'ya otomatik bir iade isteği GÖNDERMEZ. Gerçek parayı iyzico "
                "merchant panelinden (ya da iyzico destek hattından) ayrıca iade "
                "etmeniz gerekir - bu ekran sadece 'bu ödeme iade edildi, kayıt "
                "altına alalım' notunu tutar, muhasebe/raporlama içindir.",
                severity='critical',
            ),
        }),
        ("Kim, Ne İçin, Ne Kadar Ödedi", {
            'fields': ('payer', 'appointment', 'payment_type', 'amount', 'currency'),
            'description': admin_note(
                "'Randevu' alanı SADECE bireysel randevu ödemelerinde dolu olur - grup "
                "seansı/paket ödemelerinde boştur (ilgili grup/paket bilgisi 'Ek Bilgi' "
                "(metadata) alanında JSON olarak durur, ayrı bir görünür kolon değildir).",
                severity='info',
            ),
        }),
        ("Platform/Uzman Payı", {'fields': ('platform_commission', 'expert_earning', 'pricing_rule', 'discount_code')}),
        ("Durum", {'fields': ('status',)}),
        ("iyzico Teknik Bilgileri", {
            'fields': ('flow', 'conversation_id', 'provider_token', 'provider_payment_id'),
            'classes': ('collapse',),
        }),
        ("Sistem Bilgileri", {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def status_colored(self, obj):
        config = {
            'pending': ('#ff9800', 'Beklemede'),
            'authorized': ('#2196f3', 'Bloke Kondu'),
            'succeeded': ('#4caf50', 'Tahsil Edildi'),
            'voided': ('#9e9e9e', 'Bloke Kaldırıldı'),
            'failed': ('#f44336', 'Başarısız'),
            'refunded': ('#9e9e9e', 'İade Edildi'),
        }
        color, text = config.get(obj.status, ('#000', obj.get_status_display()))
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)
    status_colored.short_description = 'Durum'
    status_colored.admin_order_field = 'status'

    @admin.action(description="Seçilenleri 'İade Edildi' olarak işaretle")
    def mark_refunded(self, request, queryset):
        updated = queryset.exclude(status='refunded').update(status='refunded')
        self.message_user(
            request,
            f"{updated} ödeme iade edildi olarak işaretlendi. UNUTMAYIN: bu sadece bir "
            "etikettir, gerçek parayı iyzico panelinden ayrıca iade etmeniz gerekir.",
        )


@admin.register(PackageDefinition)
class PackageDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'session_count', 'applies_to_offering', 'discount_percentage', 'is_active')
    list_filter = ('is_active', 'applies_to_offering')
    search_fields = ('name',)
    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu paketin KENDİ bir fiyatı YOKTUR - toplam fiyat, satın alma anında "
                "PLATFORM GENELİ (uzmanı boş) bir Fiyatlandırma Kuralı'ndan türetilir "
                "(seans sayısı × birim fiyat × indirim). Bu seans tipi için platform "
                "geneli aktif bir Fiyatlandırma Kuralı yoksa danışan bu paketi SATIN "
                "ALAMAZ (hata alır) - yeni bir paket eklemeden önce ilgili Fiyatlandırma "
                "Kuralının var olduğundan emin olun.",
                severity='high',
            ),
        }),
        ("Paket Tanımı", {'fields': ('name', 'session_count', 'applies_to_offering', 'discount_percentage', 'is_active')}),
    )


class PackageUsageInline(admin.TabularInline):
    model = PackageUsage
    extra = 0
    fields = ('appointment', 'group_session', 'used_at')
    readonly_fields = ('used_at',)


@admin.register(PackagePurchase)
class PackagePurchaseAdmin(admin.ModelAdmin):
    list_display = ('client', 'package_definition', 'remaining_sessions', 'purchased_at')
    list_filter = ('package_definition',)
    search_fields = ('client__email', 'client__first_name', 'client__last_name')
    readonly_fields = ('client', 'package_definition', 'payment', 'purchased_at')
    inlines = [PackageUsageInline]

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "'Kalan Hak' ayrı bir sayaç ALANI DEĞİLDİR - aşağıdaki 'Paket "
                "Kullanımları' alt-tablosundaki satır sayısı ile hesaplanır. Bir hakkı "
                "elle 'geri vermek' istiyorsanız ilgili Paket Kullanımı satırını silin "
                "(dikkat: bu geri alınamaz bir işlemdir).\n\n"
                "Bu kayıt hiçbir uzmana kilitli DEĞİLDİR - danışan bu paketin haklarını "
                "farklı uzmanlarla yapılan randevularda/grup seanslarında kullanabilir.",
                severity='medium',
            ),
        }),
        ("Satın Alma Bilgileri", {'fields': ('client', 'package_definition', 'payment', 'purchased_at')}),
    )

    def remaining_sessions(self, obj):
        from .services import get_package_remaining_sessions
        return f"{get_package_remaining_sessions(obj)}/{obj.package_definition.session_count}"
    remaining_sessions.short_description = "Kalan Hak"
