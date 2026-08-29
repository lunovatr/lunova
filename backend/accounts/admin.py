from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from lunova_backend.admin_notes import admin_note
from .models import (
    User, ExpertProfile, ClientProfile, EmergencyContact, Service, Language,
    University, DegreeLevel, Major, Specialization, ApproachMethod,
    TargetGroup, SessionType, AddictionType, AdminProfile, Document, DocumentStatus
)
from . import services
from django.utils import timezone


# ====================================================================
# I. İÇ İLİŞKİLİ MODELLER (Alt tablolar)
# ====================================================================

class EmergencyContactInline(admin.TabularInline):
    """Danışan profil sayfasında acil iletişim bilgilerini alt tablo olarak gösterir."""
    model = EmergencyContact
    extra = 1
    fields = ('name', 'phone_number', 'relationship', 'is_primary')
    verbose_name = "Acil Durum Kişisi"
    verbose_name_plural = "Acil Durum Kişileri"


# ====================================================================
# II. KULLANICI YÖNETİMİ
# ====================================================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Liste görünümü
    list_display = (
        'email', 'role', 'first_name', 'last_name',
        'is_staff', 'is_active', 'is_deleted', 'date_joined'
    )
    list_filter = ('role', 'is_staff', 'is_active', 'is_deleted')
    search_fields = ('email', 'first_name', 'last_name', 'id_number', 'phone_number')
    ordering = ('email',)
    actions = ['activate_users', 'deactivate_users', 'restore_users', 'soft_delete_users']

    # Detay sayfası alan grupları
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Proje Bilgileri", {"fields": ("role", "is_deleted", "timezone")}),
        ("Ek Kişisel Bilgiler",
         {"fields": ("country", "national_id", "id_number", "birth_date", "gender", "phone_number")}),
    )

    verbose_name = "Kullanıcı"
    verbose_name_plural = "Kullanıcılar"

    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} kullanıcı aktifleştirildi.")
    activate_users.short_description = "Seçili kullanıcıları aktifleştir"

    def deactivate_users(self, request, queryset):
        # Kendi hesabını yanlışlıkla pasifleştirip admin'den kilitlenmeyi önler.
        updated = queryset.exclude(pk=request.user.pk).update(is_active=False)
        self.message_user(request, f"{updated} kullanıcı pasifleştirildi.")
    deactivate_users.short_description = "Seçili kullanıcıları pasifleştir"

    def restore_users(self, request, queryset):
        updated = queryset.update(is_deleted=False)
        self.message_user(request, f"{updated} kullanıcı geri yüklendi (is_deleted=False).")
    restore_users.short_description = "Seçili kullanıcıları geri yükle (silinmemiş yap)"

    def soft_delete_users(self, request, queryset):
        updated = queryset.exclude(pk=request.user.pk).update(is_deleted=True)
        self.message_user(request, f"{updated} kullanıcı soft-delete edildi.")
    soft_delete_users.short_description = "Seçili kullanıcıları soft-delete et"


# ====================================================================
# III. PROFİL YÖNETİMİ
# ====================================================================

@admin.register(ExpertProfile)
class ExpertProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'get_full_name', 'title', 'experience_years',
        'approval_status', 'get_pending_documents', 'rating_average', 'get_services_short'
    )
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'title', 'license_number'
    )
    list_filter = ('approval_status', 'services', 'specializations', 'availability_status')
    actions = ['approve_experts', 'revoke_expert_approval']

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "'Onay Durumu' (approval_status) bu paneldeki EN YÜKSEK ETKİLİ tek "
                "alandır - açık olduğu sürece bu uzman platformda arama sonuçlarında "
                "görünür ve danışanlardan randevu talebi alabilir. Kapatmak (ya da "
                "aşağıdaki 'Onayı Kaldır' toplu aksiyonu) uzmanı ANINDA arama "
                "sonuçlarından/yeni randevu akışından çıkarır - MEVCUT (zaten planlanmış) "
                "randevulara/ödemelere dokunmaz.\n\n"
                "'Ücret Bilgileri' burada görünen 'Seans Ücreti' (session_price) SADECE "
                "bir VARSAYILANDIR - Ödemeler bölümündeki bir Fiyatlandırma Kuralı bu "
                "uzman için tanımlıysa GERÇEK fiyat/tahsilat oradan gelir, buradaki "
                "değer görmezden gelinir.",
                severity='critical',
            ),
        }),
        ("Kullanıcı ve Onay Bilgileri", {"fields": ('user', 'title', 'approval_status')}),
        ("Temel Bilgiler", {"fields": (
            'university', 'degree_level', 'major', 'experience_years',
            'license_number', 'institution', 'about'
        )}),
        ("Seans ve Ücret Bilgileri", {"fields": (
            'session_price', 'currency', 'appointment_duration',
            'free_first_session', 'availability_status', 'video_intro_url'
        ), "description": admin_note(
            "'free_first_session' şu an HİÇBİR akış tarafından okunmuyor (ölü alan) - "
            "platformun GERÇEK 'ücretsiz ilk seans' politikası hesap bazında, ayrı bir "
            "yerde (Ödemeler modülü) yönetiliyor. Bu kutuyu işaretlemek/işaretsiz "
            "bırakmak GÖZLENEBİLİR HİÇBİR ŞEYİ değiştirmez.",
            severity='low',
        )}),
        ("Puanlama Bilgileri", {"fields": ('rating_average', 'rating_count')}),
    )

    filter_horizontal = (
        'services', 'specializations', 'languages',
        'approach_methods', 'target_groups'
    )

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Ad Soyad'

    def get_services_short(self, obj):
        services = obj.services.all()
        return ", ".join([s.name for s in services[:3]]) + ("..." if services.count() > 3 else "")
    get_services_short.short_description = "Hizmetler"

    def get_pending_documents(self, obj):
        count = obj.user.documents.filter(is_current=True, status=DocumentStatus.PENDING).count()
        if count == 0:
            return "-"
        return format_html('<span style="color: #ff9800; font-weight: bold;">{} bekliyor</span>', count)
    get_pending_documents.short_description = "Onay Bekleyen Belge"

    def approve_experts(self, request, queryset):
        updated = queryset.update(approval_status=True)
        self.message_user(request, f"{updated} uzman onaylandı.")
    approve_experts.short_description = "Seçili uzmanları onayla"

    def revoke_expert_approval(self, request, queryset):
        updated = queryset.update(approval_status=False)
        self.message_user(request, f"{updated} uzmanın onayı kaldırıldı.")
    revoke_expert_approval.short_description = "Seçili uzmanların onayını kaldır"

    verbose_name = "Uzman Profili"
    verbose_name_plural = "Uzman Profilleri"


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'expert', 'get_full_name', 'get_birth_date', 'get_gender',
        'get_phone_number', 'is_active_in_treatment', 'onboarding_complete', 'recovery_status'
    )
    list_filter = ('recovery_status',)

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "'Uzman' (expert) alanı bu danışanın ATANMIŞ uzmanıdır - bunu elle "
                "değiştirmek danışanı BAŞKA bir uzmana taşır, danışanın kendi panelinde "
                "gördüğü uzman/randevu geçmişi etkilenir. Sadece gerçekten bir atama "
                "hatasını düzeltiyorsanız değiştirin, rutin bir işlem değildir.",
                severity='high',
            ),
        }),
        ("Temel Bilgiler", {"fields": ('user', 'expert', 'support_goal')}),
        ("Süreç ve Durum", {"fields": (
            'onboarding_complete', 'is_active_in_treatment', 'received_service_before'
        )}),
        ("Bağımlılık Bilgileri", {"fields": ('substances_used',)}),
        # recovery_status normalde review_document() tarafından otomatik set
        # edilir (bkz. accounts/services.py) - burada salt-okunur, admin elle
        # bir hata durumunda düzeltebilsin diye readonly DEĞİL ama açıkça
        # "otomatik" olduğu belirtildi.
        ("Ex-User Doğrulaması (Faz 4)", {"fields": (
            'recovery_status', 'recovery_status_verified_by', 'recovery_status_verified_at',
        ), "description": "Normalde 'İyileşme Durumu Belgesi' onaylandığında otomatik doldurulur."}),
    )
    readonly_fields = ('recovery_status_verified_by', 'recovery_status_verified_at')

    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'expert__user__email'
    )
    list_filter = (
        'expert', 'is_active_in_treatment', 'onboarding_complete',
        'received_service_before', 'substances_used'
    )
    filter_horizontal = ('substances_used',)
    inlines = [EmergencyContactInline]

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Ad Soyad'

    def get_birth_date(self, obj):
        return obj.user.birth_date
    get_birth_date.short_description = 'Doğum Tarihi'

    def get_gender(self, obj):
        return obj.user.get_gender_display()
    get_gender.short_description = 'Cinsiyet'

    def get_phone_number(self, obj):
        return obj.user.phone_number
    get_phone_number.short_description = 'Telefon'

    verbose_name = "Danışan Profili"
    verbose_name_plural = "Danışan Profilleri"


# ====================================================================
# IV. DİĞER MODELLERİN YÖNETİMİ
# ====================================================================

@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'client_profile', 'phone_number', 'relationship', 'is_primary')
    list_filter = ('is_primary', 'relationship')
    search_fields = ('name', 'phone_number', 'client_profile__user__email')
    verbose_name = "Acil Durum Kişisi"
    verbose_name_plural = "Acil Durum Kişileri"


class DocumentPendingFilter(admin.SimpleListFilter):
    """Onay bekleyen belgeleri tek tıkla öne çıkarmak için - status alanının
    kendi list_filter'ı zaten bunu yapabilir ama bu proje genelinde
    (AppointmentAdmin -> AppointmentStatusFilter) yerleşmiş 'en sık aranan
    durumu ayrı, isimli bir filtre olarak üste koy' deseniyle tutarlı."""
    title = 'Hızlı Filtre'
    parameter_name = 'quick'

    def lookups(self, request, model_admin):
        return [('pending_current', 'Onay bekleyen (güncel belgeler)')]

    def queryset(self, request, queryset):
        if self.value() == 'pending_current':
            return queryset.filter(status=DocumentStatus.PENDING, is_current=True)
        return queryset


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'type', 'original_filename',
        'status_colored', 'is_primary', 'current_colored', 'uploaded_at'
    )
    list_filter = (DocumentPendingFilter, 'status', 'type', 'is_primary', 'is_current')
    search_fields = (
        'user__email',
        'user__first_name',
        'user__last_name',
        'file_key',
        'original_filename',
        'uid',
    )
    readonly_fields = (
        'user',
        'uid',
        'file_key',
        'original_filename',
        'uploaded_at',
        'updated_at',
        'verified',
        'verified_at',
    )
    ordering = ('-is_current', 'status', '-uploaded_at')
    actions = [
        'approve_documents', 'reject_documents', 'reset_documents_to_pending',
        'activate_documents', 'deactivate_documents',
    ]

    verbose_name = "Belge"
    verbose_name_plural = "Belgeler"
    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu, bir kullanıcının yüklediği TEK bir dosyanın (diploma, kimlik, "
                "profil fotoğrafı, 'İyileşme Durumu Belgesi' vb.) kaydıdır - dosyanın "
                "kendisi burada DEĞİL, harici bir depolama servisindedir (bu ekran sadece "
                "meta veriyi/onay durumunu tutar). 'İyileşme Durumu Belgesi' (Recovery "
                "Proof) türünü ONAYLAMAK, danışanın 'Ex-User Doğrulaması' durumunu "
                "OTOMATİK olarak günceller ve bazı grup seansı türlerine katılım "
                "uygunluğunu belirler - bu belge türünü onaylarken dikkatli olun.",
                severity='high',
            ),
        }),
        ("Temel Bilgiler", {
            "fields": ('user', 'type', 'original_filename')
        }),
        ("Onay Durumu", {
            "fields": ('status', 'verified', 'verified_at'),
            "description": (
                "Belgeyi onaylamak/reddetmek için 'status' alanını değiştirip "
                "kaydedin - kullanıcıya otomatik olarak bir bildirim gider. "
                "Birden çok belge için listeden seçip aşağıdaki toplu "
                "aksiyonları kullanabilirsiniz."
            ),
        }),
        ("Durum", {
            "fields": ('is_primary', 'is_current'),
            "description": (
                "'Aktif mi?' kullanıcının kendi belgesini silmesiyle (aslında "
                "deactivate) False'a çekilir - dosya storage'dan silinmez, "
                "burada listelenmeye ve dilenirse tekrar aktifleştirilmeye "
                "devam eder. Kullanıcı artık kendi belge listesinde/profilinde "
                "bu belgeyi görmez."
            ),
        }),
        ("Sistem Alanları", {
            "fields": ('uid', 'file_key', 'uploaded_at', 'updated_at')
        }),
    )

    def status_colored(self, obj):
        config = {
            DocumentStatus.PENDING: ('#ff9800', 'Onay Bekliyor'),
            DocumentStatus.APPROVED: ('#4caf50', 'Onaylandı'),
            DocumentStatus.REJECTED: ('#f44336', 'Reddedildi'),
        }
        color, text = config.get(obj.status, ('#000', obj.status))
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)
    status_colored.short_description = 'Onay Durumu'
    status_colored.admin_order_field = 'status'

    def current_colored(self, obj):
        if obj.is_current:
            return format_html('<span style="color: #4caf50; font-weight: bold;">Aktif</span>')
        return format_html('<span style="color: #9e9e9e; font-weight: bold;">Pasif</span>')
    current_colored.short_description = 'Aktif mi?'
    current_colored.admin_order_field = 'is_current'

    def has_add_permission(self, request):
        messages.warning(
            request,
            "Belgeler yalnızca sistem (API) üzerinden yüklenir. Admin panelinden belge eklenemez."
        )
        return False

    def get_actions(self, request):
        # Belgeler için toplu silme kasıtlı olarak kapalı (storage/DB
        # tutarlılığı - dosya storage'dan silinmeden DB satırı silinirse
        # yetim bir storage objesi kalır, bkz. DocumentDeleteView). Onay/red
        # aksiyonları eklerken bunu yeniden AÇMAMAK için `actions = None`
        # yerine burada özellikle delete_selected'ı çıkarıyoruz.
        actions = super().get_actions(request)
        actions.pop('delete_selected', None)
        return actions

    def save_model(self, request, obj, form, change):
        # review_document()'ın dar update_fields'ı burada KULLANILMAZ - bu
        # formda status DIŞINDA bir alan da (type, is_primary, is_current)
        # değişmiş olabilir, dar bir save o değişiklikleri sessizce
        # kaybederdi. Önce verified/verified_at'i belleğe senkronla, sonra
        # normal (tam) save_model ile formdaki HER değişikliği birlikte
        # kaydet, en son bildirim üret.
        status_changed = change and 'status' in form.changed_data
        if status_changed:
            services.sync_review_fields(obj)
        super().save_model(request, obj, form, change)
        if status_changed:
            services.apply_recovery_status_effect(obj, reviewed_by=request.user)
            services.notify_document_review(obj)

    def approve_documents(self, request, queryset):
        count = 0
        for doc in queryset.exclude(status=DocumentStatus.APPROVED):
            services.review_document(doc, DocumentStatus.APPROVED, reviewed_by=request.user)
            count += 1
        self.message_user(request, f"{count} belge onaylandı, kullanıcılara bildirim gönderildi.")
    approve_documents.short_description = "Seçili belgeleri onayla"

    def reject_documents(self, request, queryset):
        count = 0
        for doc in queryset.exclude(status=DocumentStatus.REJECTED):
            services.review_document(doc, DocumentStatus.REJECTED, reviewed_by=request.user)
            count += 1
        self.message_user(request, f"{count} belge reddedildi, kullanıcılara bildirim gönderildi.")
    reject_documents.short_description = "Seçili belgeleri reddet"

    def reset_documents_to_pending(self, request, queryset):
        count = 0
        for doc in queryset.exclude(status=DocumentStatus.PENDING):
            services.review_document(doc, DocumentStatus.PENDING)
            count += 1
        self.message_user(request, f"{count} belge yeniden 'onay bekliyor' durumuna alındı.")
    reset_documents_to_pending.short_description = "Seçili belgeleri 'onay bekliyor' durumuna al"

    def activate_documents(self, request, queryset):
        # Kullanıcının kendi "silme" (deactivate) işleminin admin tarafından
        # geri alınması - dosya zaten storage'da duruyor (bkz. DocumentDeleteView),
        # sadece is_current tekrar True'ya çekiliyor.
        updated = queryset.filter(is_current=False).update(is_current=True)
        self.message_user(request, f"{updated} belge yeniden aktifleştirildi.")
    activate_documents.short_description = "Seçili belgeleri aktifleştir"

    def deactivate_documents(self, request, queryset):
        updated = queryset.filter(is_current=True).update(is_current=False, is_primary=False)
        self.message_user(request, f"{updated} belge pasifleştirildi.")
    deactivate_documents.short_description = "Seçili belgeleri pasifleştir"
    reset_documents_to_pending.short_description = "Seçili belgeleri 'onay bekliyor' durumuna al"


# ====================================================================
# V. DİĞER YARDIMCI MODELLER (Basit Yönetim - Tier 2 taksonomi modelleri)
# ====================================================================

admin.site.register(AdminProfile)

_TAXONOMY_NOTE = admin_note(
    "Bu, uzman profillerinde/kayıt formlarında seçilebilir bir SEÇENEK "
    "LİSTESİDİR (taksonomi) - kendisi bir randevu/ödeme gibi işlem verisi "
    "TUTMAZ. Bir satırı SİLMEK, o seçeneği kullanan TÜM uzman profillerinden "
    "de KALDIRIR (çoktan-çoğa ilişki üzerinden) - geri dönüşü yoktur. Artık "
    "kullanılmasını istemediğiniz bir seçenek için ('Aktif mi?' alanı "
    "varsa) onu KAPATMAK, SİLMEKTEN çok daha güvenlidir - silme geçmiş "
    "profillerdeki referansı da kaldırır, kapatma sadece yeni seçimlerde "
    "görünmesini engeller.",
    severity='medium',
)


class _TaxonomyAdmin(admin.ModelAdmin):
    """Service/Language/University/... gibi basit, çoğunlukla tek-alanlı
    (sadece isim) seçenek listeleri için ORTAK, hafif bir admin (Tier 2 -
    bkz. kök claude.md admin dokümantasyon planı): bunlar ExpertProfile/
    Payment/GroupSession gibi yüksek etkili modeller DEĞİL, sadece bir
    dropdown'ın/çoklu-seçimin kaynağı - bu yüzden tam bir fieldsets/severity
    ayrımı yerine tek, paylaşılan bir model-seviyesi uyarı yeterli görüldü."""
    search_fields = ('name',)

    def get_list_display(self, request):
        field_names = {f.name for f in self.model._meta.get_fields()}
        fields = ['name']
        if 'is_active' in field_names:
            fields.append('is_active')
        return fields

    def get_list_filter(self, request):
        field_names = {f.name for f in self.model._meta.get_fields()}
        return ('is_active',) if 'is_active' in field_names else ()

    def get_fieldsets(self, request, obj=None):
        default_fieldsets = list(super().get_fieldsets(request, obj))
        if default_fieldsets and default_fieldsets[0][0] is None:
            _, opts = default_fieldsets[0]
            default_fieldsets[0] = ("Değerler", opts)
        return [(None, {'fields': (), 'description': _TAXONOMY_NOTE})] + default_fieldsets


for _model in (
    Service, Language, University, DegreeLevel, Major, Specialization,
    ApproachMethod, TargetGroup, SessionType, AddictionType,
):
    admin.site.register(_model, _TaxonomyAdmin)
