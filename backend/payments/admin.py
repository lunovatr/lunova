from django.contrib import admin
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


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_rule', 'valid_from', 'valid_until',
                     'max_redemptions', 'max_redemptions_per_user', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code',)


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'session_offering', 'expert', 'client_price', 'currency',
                     'commission_type', 'commission_value', 'is_active')
    list_filter = ('is_active', 'commission_type', 'session_offering', 'currency')
    search_fields = ('expert__user__first_name', 'expert__user__last_name', 'expert__user__email')
    autocomplete_fields = ('expert',)
    readonly_fields = ('price_preview',)
    fields = (
        'session_offering', 'expert', 'variant', 'client_price', 'currency',
        'commission_type', 'commission_value', 'price_preview',
        'effective_from', 'effective_until', 'is_active',
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
    list_display = ('id', 'payer', 'appointment', 'payment_type', 'flow', 'status', 'amount', 'currency',
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

    @admin.action(description="Seçilenleri 'İade Edildi' olarak işaretle")
    def mark_refunded(self, request, queryset):
        updated = queryset.exclude(status='refunded').update(status='refunded')
        self.message_user(request, f"{updated} ödeme iade edildi olarak işaretlendi.")


@admin.register(PackageDefinition)
class PackageDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'session_count', 'applies_to_offering', 'discount_percentage', 'is_active')
    list_filter = ('is_active', 'applies_to_offering')
    search_fields = ('name',)


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

    def remaining_sessions(self, obj):
        from .services import get_package_remaining_sessions
        return f"{get_package_remaining_sessions(obj)}/{obj.package_definition.session_count}"
    remaining_sessions.short_description = "Kalan Hak"
