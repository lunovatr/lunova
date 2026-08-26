from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """İadeler bu turda otomatikleştirilmedi (iyzico refund API'si bağlanmadı) -
    kalan tek para-iadesi senaryosu (onaylı+ödenmiş bir randevunun sonradan
    iptali) için şimdilik admin'in manuel 'İade Edildi' işaretlemesi yeterli
    görüldü, bkz. payments/services.py modül docstring'i ve kök claude.md'deki
    ödeme politikası tartışması."""
    list_display = ('id', 'payer', 'appointment', 'payment_type', 'flow', 'status', 'amount', 'currency', 'created_at')
    list_filter = ('status', 'flow', 'payment_type', 'currency')
    search_fields = ('payer__email', 'payer__first_name', 'payer__last_name', 'conversation_id', 'provider_payment_id')
    readonly_fields = (
        'payer', 'appointment', 'payment_type', 'flow', 'amount', 'currency',
        'conversation_id', 'provider_token', 'provider_payment_id',
        'created_at', 'updated_at',
    )
    actions = ['mark_refunded']

    @admin.action(description="Seçilenleri 'İade Edildi' olarak işaretle")
    def mark_refunded(self, request, queryset):
        updated = queryset.exclude(status='refunded').update(status='refunded')
        self.message_user(request, f"{updated} ödeme iade edildi olarak işaretlendi.")
