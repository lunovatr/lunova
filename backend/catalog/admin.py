from django.contrib import admin

from lunova_backend.admin_notes import admin_note
from .models import SessionOffering, SessionOfferingVariant

_VARIANT_KEY_WARNING = admin_note(
    "'Varyant Anahtarı' (variant_key) sistem KODU tarafından DÜZ METİN KARŞILAŞTIRMASIYLA "
    "okunur - 'ex_user_only' (İyileşme sürecindekilere özel gruplar) ve 'tier_0'/'tier_1'/... "
    "(kıdem bazlı fiyat kademeleri) gibi değerler YAZILIMIN İÇİNE GÖMÜLÜDÜR.\n\n"
    "Bu anahtarı DEĞİŞTİRMEK ya da SİLMEK, yazılımda HİÇBİR HATA VERMEDEN ilgili "
    "özelliği (ex-user uygunluk kontrolü ya da kıdem bazlı fiyatlandırma) SESSİZCE "
    "devre dışı bırakır - sistem sadece 'eşleşen varyant yok' der ve varsayılan "
    "davranışa sessizce düşer. Bu tür bir varyant EKLEMENİZ gerekirse anahtarı "
    "YAZILIM EKİBİYLE teyit ederek girin; var olan bir 'ex_user_only'/'tier_N' "
    "anahtarını değiştirmeden önce MUTLAKA yazılım ekibine danışın.",
    severity='critical',
)


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

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu, sistemin tanıdığı bir 'seans türü' (Bireysel Terapi, Grup Terapisi, "
                "Psikoeğitim vb.) tanımıdır - FİYATI BURADA TUTULMAZ (Ödemeler bölümündeki "
                "Fiyatlandırma Kuralları'na bakın). 'Kod' alanı dahili bir teknik anahtardır, "
                "kullanıcıya hiç gösterilmez ve bir İNDİRİM KODU DEĞİLDİR - kaydettikten "
                "sonra değiştirmeyin (fiyatlandırma kuralları ve mevcut randevular buna "
                "bağlıdır).\n\n"
                "'Çok Katılımcılı mı?' işaretli bir seans türü, uzman panelinde 'Grup "
                "Seansları' oluşturma formunda seçilebilir hale gelir - işaretli DEĞİLSE "
                "sadece bireysel randevu akışında görünür. Bir seans türünü kullanımdan "
                "kaldırmak için SİLMEYİN, 'Aktif mi?' kutusunu kapatın (geçmiş "
                "randevular/ödemeler bu kayda bağlı olduğu için silmek hataya yol açar).",
                severity='high',
            ),
        }),
        ("Seans Tipi", {'fields': ('name', 'code', 'category', 'requires_multi_participant', 'default_duration_minutes', 'is_active')}),
    )


@admin.register(SessionOfferingVariant)
class SessionOfferingVariantAdmin(admin.ModelAdmin):
    list_display = ["session_offering", "variant_key", "variant_label", "is_active"]
    list_filter = ["session_offering", "is_active"]
    search_fields = ["variant_key", "variant_label"]

    fieldsets = (
        (None, {'fields': (), 'description': _VARIANT_KEY_WARNING}),
        ("Varyant", {'fields': ('session_offering', 'variant_key', 'variant_label', 'is_active')}),
    )
