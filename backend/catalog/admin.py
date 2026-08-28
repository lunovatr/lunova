from django.contrib import admin

from .models import SessionOffering, SessionOfferingVariant


class SessionOfferingVariantInline(admin.TabularInline):
    model = SessionOfferingVariant
    extra = 0
    fields = ("variant_key", "variant_label", "is_active")


@admin.register(SessionOffering)
class SessionOfferingAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "category", "requires_multi_participant", "is_active"]
    list_filter = ["category", "requires_multi_participant", "is_active"]
    search_fields = ["name", "code"]
    prepopulated_fields = {"code": ("name",)}
    inlines = [SessionOfferingVariantInline]


@admin.register(SessionOfferingVariant)
class SessionOfferingVariantAdmin(admin.ModelAdmin):
    list_display = ["session_offering", "variant_key", "variant_label", "is_active"]
    list_filter = ["session_offering", "is_active"]
    search_fields = ["variant_key", "variant_label"]
