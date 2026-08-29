from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.template.response import TemplateResponse
from django.utils import timezone
from datetime import timedelta
from lunova_backend.admin_notes import admin_note
from .models import (
    Appointment, GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus,
    GroupSessionStatus, GroupSessionWaitlist,
)


class AppointmentStatusFilter(admin.SimpleListFilter):
    """Custom filter for appointment status with counts"""
    title = 'Durum'
    parameter_name = 'status_group'

    def lookups(self, request, model_admin):
        return [
            ('active', 'Aktif Randevular'),
            ('pending', 'Bekleyenler'),
            ('upcoming', 'Yaklaşan'),
            ('today', 'Bugün'),
            ('past', 'Geçmiş'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'active':
            return queryset.filter(status__in=['pending', 'waiting_approval', 'confirmed'])
        if self.value() == 'pending':
            return queryset.filter(status__in=['pending', 'waiting_approval'])
        if self.value() == 'upcoming':
            today = timezone.now().date()
            return queryset.filter(date__gte=today, status__in=['confirmed', 'pending'])
        if self.value() == 'today':
            today = timezone.now().date()
            return queryset.filter(date=today)
        if self.value() == 'past':
            today = timezone.now().date()
            return queryset.filter(date__lt=today)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'expert', 'client', 'appointment_datetime', 'duration',
        'status_colored', 'zoom_meeting_link', 'days_until', 'created_at_short'
    ]
    list_filter = [
        AppointmentStatusFilter, 'status', 'is_confirmed', 'date', 'expert', 'client', 'is_deleted'
    ]
    search_fields = [
        'expert__first_name', 'expert__last_name',
        'client__first_name', 'client__last_name',
        'zoom_meeting_id', 'notes'
    ]
    ordering = ['-date', '-time']
    actions = [
        'mark_as_confirmed', 'mark_as_completed', 'mark_as_cancelled',
        'soft_delete'
    ]
    date_hierarchy = 'date'
    list_per_page = 25

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu bir BİREYSEL (1:1 uzman-danışan) randevu kaydıdır - grup seansları "
                "ayrı bir modelde (Grup Seansları) yönetilir, bu ekranda görünmezler.\n\n"
                "Bir randevunun ödeme/Zoom durumu bu formda GÖRÜNMEZ (Ödemeler ekranına "
                "bakın, Payment modeli ayrı) - status alanı sadece randevunun kendi "
                "yaşam döngüsünü (beklemede/onaylı/iptal/tamamlandı) tutar.",
                severity='info',
            ),
        }),
        ('Randevu Bilgileri', {
            'fields': ('expert', 'client', 'date', 'time', 'duration'),
            'classes': ('wide',)
        }),
        ('Durum ve Notlar', {
            'fields': ('status', 'is_confirmed', 'notes'),
            'classes': ('wide',),
            'description': admin_note(
                "'status' alanını burada elle değiştirmek yerine MÜMKÜNSE aşağıdaki "
                "'Seçili randevuları iptal et/onayla/tamamla' toplu aksiyonlarını "
                "kullanın - onlar mail bildirimini de otomatik gönderir "
                "(iptal aksiyonu artık Sağlık Kontrolü/Admin Panel turunda düzeltildi: "
                "eskiden mail göndermeden ham bir toplu güncelleme yapıyordu). Bu formdan "
                "doğrudan 'status'ü değiştirip kaydetmek HİÇBİR mail/bildirim üretmez, "
                "danışan/uzman habersiz kalır - sadece gerçekten istisnai bir düzeltme "
                "gerektiğinde (örn. hatalı veri temizliği) elle değiştirin.",
                severity='medium',
            ),
        }),
        ('Zoom Entegrasyonu', {
            'fields': ('zoom_start_url', 'zoom_join_url', 'zoom_meeting_id'),
            'classes': ('collapse', 'wide'),
            'description': admin_note(
                "Bu alanlar sistem tarafından otomatik doldurulur (randevu onaylanıp "
                "ödeme tamamlanınca) - elle boşaltmak/değiştirmek danışanın/uzmanın "
                "görüşme bağlantısını KIRAR. Sadece gerçekten bozuk bir kaydı düzeltmek "
                "için, ne yaptığınızdan eminseniz dokunun.",
                severity='high',
            ),
        }),
        ('Sistem Bilgileri', {
            'fields': ('is_deleted', 'created_at', 'updated_at'),
            'classes': ('collapse',),
            'description': admin_note(
                "'is_deleted' gerçek bir silme DEĞİL (soft delete) - True yapmak kaydı "
                "listelerden gizler ama veritabanından silmez, geri almak için tekrar "
                "False yapmak yeterli.",
                severity='info',
            ),
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def appointment_datetime(self, obj):
        """Tarih ve saati birlikte göster"""
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.date.strftime('%d.%m.%Y'),
            obj.time.strftime('%H:%M')
        )
    appointment_datetime.short_description = 'Tarih/Saat'
    appointment_datetime.admin_order_field = 'date'

    def status_colored(self, obj):
        """Duruma göre renkli gösterim"""
        status_config = {
            'pending': {'color': '#ff9800', 'text': 'Beklemede'},
            'waiting_approval': {'color': '#2196f3', 'text': 'Onay Bekliyor'},
            'confirmed': {'color': '#4caf50', 'text': 'Onaylandı'},
            'cancel_requested': {'color': '#f44336', 'text': 'İptal İsteği'},
            'cancelled': {'color': '#9e9e9e', 'text': 'İptal Edildi'},
            'completed': {'color': '#2e7d32', 'text': 'Tamamlandı'},
        }

        config = status_config.get(obj.status, {'color': '#000', 'text': obj.get_status_display()})
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            config['color'], config['text']
        )
    status_colored.short_description = 'Durum'

    def zoom_meeting_link(self, obj):
        """Zoom meeting linki varsa göster"""
        if obj.zoom_meeting_id:
            return format_html(
                '<a href="{}" target="_blank" style="color: #2196f3;">🎥 Zoom</a><br>'
                '<small>{}</small>',
                obj.zoom_join_url or '#',
                obj.zoom_meeting_id[:20] + '...' if len(obj.zoom_meeting_id) > 20 else obj.zoom_meeting_id
            )
        return '-'
    zoom_meeting_link.short_description = 'Zoom Meeting'

    def days_until(self, obj):
        """Randevuya kaç gün kaldığını göster"""
        today = timezone.now().date()
        days = (obj.date - today).days

        if days < 0:
            return format_html('<span style="color: #9e9e9e;">Geçti</span>')
        elif days == 0:
            return format_html('<span style="color: #f44336; font-weight: bold;">BUGÜN</span>')
        elif days == 1:
            return format_html('<span style="color: #ff9800;">Yarın</span>')
        elif days <= 7:
            return format_html('<span style="color: #2196f3;">{} gün</span>', days)
        else:
            return format_html('<span style="color: #4caf50;">{} gün</span>', days)
    days_until.short_description = 'Kalan Gün'

    def created_at_short(self, obj):
        """Kısaltılmış oluşturulma tarihi"""
        return obj.created_at.strftime('%d.%m.%Y %H:%M')
    created_at_short.short_description = 'Oluşturulma'
    created_at_short.admin_order_field = 'created_at'

    def get_queryset(self, request):
        """Soft delete edilmiş kayıtları gösterme ve ek bilgiler"""
        return super().get_queryset(request).filter(is_deleted=False).select_related('expert', 'client')

    def changelist_view(self, request, extra_context=None):
        """Dashboard bilgileri ekle"""
        response = super().changelist_view(request, extra_context)

        if hasattr(response, 'context_data'):
            queryset = self.get_queryset(request)

            # İstatistikler
            stats = {
                'total': queryset.count(),
                'confirmed': queryset.filter(status='confirmed').count(),
                'pending': queryset.filter(status__in=['pending', 'waiting_approval']).count(),
                'today': queryset.filter(date=timezone.now().date()).count(),
                'upcoming': queryset.filter(date__gte=timezone.now().date(), status='confirmed').count(),
            }

            response.context_data['appointment_stats'] = stats

        return response

    # Custom actions
    def mark_as_confirmed(self, request, queryset):
        """Seçili randevuları onaylanmış olarak işaretle"""
        updated = queryset.filter(status__in=['pending', 'waiting_approval']).update(status='confirmed', is_confirmed=True)
        self.message_user(request, f'{updated} randevu onaylandı.')
    mark_as_confirmed.short_description = "Seçili randevuları onayla"

    def mark_as_completed(self, request, queryset):
        """Seçili randevuları tamamlanmış olarak işaretle"""
        updated = queryset.filter(status='confirmed').update(status='completed')
        self.message_user(request, f'{updated} randevu tamamlandı olarak işaretlendi.')
    mark_as_completed.short_description = "Seçili randevuları tamamla"

    def mark_as_cancelled(self, request, queryset):
        """Seçili randevuları iptal edilmiş olarak işaretle - artık
        appointments.services.cancel_appointment() üzerinden geçiyor (önceden
        ham bir queryset.update() kullanılıyordu, bu iptal mailini hiç
        göndermiyordu - bkz. cancel_appointment()'ın docstring'i)."""
        from .services import cancel_appointment
        count = 0
        for appointment in queryset.exclude(status__in=['cancelled', 'completed']):
            cancel_appointment(appointment, actor=request.user)
            count += 1
        self.message_user(request, f'{count} randevu iptal edildi (mail bildirimi gönderildi).')
    mark_as_cancelled.short_description = "Seçili randevuları iptal et"

    def soft_delete(self, request, queryset):
        """Seçili randevuları soft delete yap"""
        updated = queryset.update(is_deleted=True)
        self.message_user(request, f'{updated} randevu silindi (soft delete).')
    soft_delete.short_description = "Seçili randevuları sil (soft delete)"


class GroupSessionParticipantInline(admin.TabularInline):
    """Bir GroupSession kaydının içinden katılımcılarına GÖZ ATMAK için -
    toplu 'başka bir gruba aktar' işlemi burada YAPILAMAZ (Django inline'lar
    hiçbir zaman `actions` desteklemez), bunun için aşağıdaki bağımsız
    GroupSessionParticipantAdmin kullanılmalı."""
    model = GroupSessionParticipant
    fk_name = 'group_session'
    extra = 0
    fields = ('client', 'status', 'payment', 'reviewed_by', 'reviewed_at', 'joined_at')
    readonly_fields = ('joined_at',)
    autocomplete_fields = ('client', 'reviewed_by')


class GroupSessionWaitlistInline(admin.TabularInline):
    model = GroupSessionWaitlist
    extra = 0
    fields = ('client', 'joined_waitlist_at', 'notified_at', 'claim_expires_at')
    readonly_fields = ('joined_waitlist_at',)
    autocomplete_fields = ('client',)


@admin.register(GroupSession)
class GroupSessionAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'expert', 'session_offering', 'variant', 'date', 'time',
                     'capacity', 'participant_count', 'status_colored')
    list_filter = ('status', 'session_offering', 'session_type')
    search_fields = ('expert__first_name', 'expert__last_name', 'session_offering__name')
    date_hierarchy = 'date'
    inlines = [GroupSessionParticipantInline, GroupSessionWaitlistInline]
    actions = ['cancel_group_sessions']
    readonly_fields = ('status_colored', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu bir GRUP seansıdır (birden fazla danışan aynı toplantıya katılır) - "
                "bireysel 1:1 randevularla KARIŞTIRMAYIN, onlar 'Randevular' ekranındadır.\n\n"
                "Bir grubu iptal etmek için aşağıdaki listeden seçip 'Grup Seansını İptal "
                "Et' toplu aksiyonunu kullanın - bu, onaylanmış/ödemiş katılımcılara ve "
                "bekleme listesindekilere otomatik bilgilendirme gönderir, bekleme "
                "listesini temizler. İptal edilen bir grupta 'açıkta kalan' (ödemiş ama "
                "artık grubu olmayan) danışanları bulup başka bir gruba aktarmak için "
                "'Grup Seansı Katılımcıları' ekranındaki 'Açıkta Kalanlar' filtresini "
                "kullanın.",
                severity='info',
            ),
        }),
        ("Grup Seansı Bilgileri", {
            'fields': ('expert', 'session_offering', 'session_type', 'variant', 'date', 'time', 'duration'),
        }),
        ("Kapasite", {
            'fields': ('capacity',),
            'description': admin_note(
                "Kapasiteyi ONAYLANMIŞ katılımcı sayısının ALTINA düşürmek, sistemin "
                "kapasite kontrolünü (yeni onaylar/aktarımlar için) sıkılaştırır ama "
                "ZATEN onaylanmış katılımcıları OTOMATİK OLARAK çıkarmaz/iptal etmez - "
                "yani grup görünürde 'aşırı dolu' kalabilir. En az 2 olmalı (bir 'grup' "
                "tanım gereği tek kişilik olamaz, booking formunda da bu şekilde "
                "doğrulanıyor).",
                severity='medium',
            ),
        }),
        ("Durum", {
            'fields': ('status_colored',),
            'description': admin_note(
                "Durum artık bu formdan DOĞRUDAN değiştirilemez - SADECE 'Grup Seansını "
                "İptal Et' toplu aksiyonuyla (aşağıdaki listeden seçip) değiştirilebilir. "
                "Bu BİLİNÇLİ bir kısıtlama: durumu ham bir formdan 'cancelled' yapmak "
                "katılımcılara/bekleme listesine hiç dokunmazdı (eskiden tam olarak bu "
                "şekilde çalışıyordu ve ödemiş danışanlar sessizce açıkta kalıyordu).",
                severity='high',
            ),
        }),
        ("Zoom Entegrasyonu", {
            'fields': ('zoom_start_url', 'zoom_join_url', 'zoom_meeting_id'),
            'classes': ('collapse',),
            'description': admin_note(
                "TÜM onaylı katılımcılar AYNI Zoom toplantısını paylaşır - sistem "
                "tarafından ilk ödeme tamamlandığında otomatik oluşturulur, elle "
                "değiştirmeyin.",
                severity='high',
            ),
        }),
        ("Sistem Bilgileri", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def participant_count(self, obj):
        approved = obj.participants.filter(status='approved').count()
        return f"{approved}/{obj.capacity}"
    participant_count.short_description = "Doluluk (onaylı)"

    def status_colored(self, obj):
        config = {
            GroupSessionStatus.SCHEDULED: ('#4caf50', 'Planlandı'),
            GroupSessionStatus.CANCELLED: ('#9e9e9e', 'İptal Edildi'),
            GroupSessionStatus.COMPLETED: ('#2e7d32', 'Tamamlandı'),
        }
        color, text = config.get(obj.status, ('#000', obj.status))
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)
    status_colored.short_description = 'Durum'
    status_colored.admin_order_field = 'status'

    @admin.action(description="Grup Seansını İptal Et (katılımcılara/bekleme listesine bildirim gider)")
    def cancel_group_sessions(self, request, queryset):
        from payments.services import PaymentError, cancel_group_session
        count = 0
        for group_session in queryset.exclude(status=GroupSessionStatus.CANCELLED):
            try:
                cancel_group_session(group_session, cancelled_by=request.user)
                count += 1
            except PaymentError as e:
                self.message_user(request, f"{group_session}: {e}", level=messages.WARNING)
        if count:
            self.message_user(request, f"{count} grup seansı iptal edildi, bildirimler gönderildi.")


class DisplacedParticipantFilter(admin.SimpleListFilter):
    """"Açıkta kalan" (grubu iptal edilmiş ama kendisi hâlâ approved olan)
    katılımcıları tek tıkla öne çıkarır - Sağlık Kontrolü turunda bulunup bu
    turda ele alınan bulgunun doğrudan admin karşılığı. İkinci seçenek
    (kullanıcı kararı - refund görünürlüğü) bunların içinden ÖDEMESİ
    TAMAMLANMIŞ olanları öne çıkarır - iade/aktarma önceliklendirmesi için en
    kritik alt küme (para tahsil edilmiş ama artık hizmet verilecek bir grubu
    yok)."""
    title = 'Açıkta Kalanlar'
    parameter_name = 'displaced'

    def lookups(self, request, model_admin):
        return [
            ('displaced', 'Açıkta kalanlar (grubu iptal edildi)'),
            ('displaced_paid', 'Açıkta + ödemesi tamamlanmış (iade/aktarma öncelikli)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'displaced':
            return queryset.filter(
                status=GroupSessionParticipantStatus.APPROVED,
                group_session__status=GroupSessionStatus.CANCELLED,
            )
        if self.value() == 'displaced_paid':
            return queryset.filter(
                status=GroupSessionParticipantStatus.APPROVED,
                group_session__status=GroupSessionStatus.CANCELLED,
                payment__status='succeeded',
            )
        return queryset


@admin.register(GroupSessionParticipant)
class GroupSessionParticipantAdmin(admin.ModelAdmin):
    """GroupSessionParticipantInline'ın (yukarıda) ÜST-SEVİYE, bağımsız
    karşılığı - SADECE bu ekran toplu 'başka bir gruba aktar' aksiyonunu
    destekler (inline'lar hiç `actions` desteklemez, bkz. yukarısı). Normal
    zamanda bir katılımcıyı görmek/düzenlemek için ilgili GroupSession
    kaydının kendi sayfasına gidin - bu ekranı ÖZELLİKLE bir grup iptal
    edildikten SONRA açıkta kalan danışanları bulup aktarmak için kullanın
    (bkz. DisplacedParticipantFilter)."""
    list_display = (
        'client', 'group_session', 'status_colored', 'original_group_session',
        'payment_link', 'reviewed_by', 'reviewed_at',
    )
    list_filter = (DisplacedParticipantFilter, 'status', 'group_session__status')
    search_fields = (
        'client__first_name', 'client__last_name', 'client__email',
        'group_session__session_offering__name',
    )
    autocomplete_fields = ('client', 'group_session', 'reviewed_by', 'original_group_session')
    readonly_fields = ('joined_at',)
    actions = ['reassign_to_group_session']

    fieldsets = (
        (None, {
            'fields': (),
            'description': admin_note(
                "Bu, 'Grup Seansları' ekranındaki katılımcı alt-tablosunun (inline) "
                "AYNI verisinin bağımsız/üst-seviye görünümü - SADECE burada toplu "
                "aktarım mümkün. GEÇİCİ bir araç: grup iptalinde açıkta kalan "
                "danışanları ilerleyen dönemde operasyon ekibinin kendi paneli "
                "üstlenecek, bu ekran o zamana kadar bir köprü görevi görüyor.",
                severity='info',
            ),
        }),
        ("Katılım Bilgileri", {'fields': ('client', 'group_session', 'status')}),
        ("Aktarım Geçmişi (Audit)", {
            'fields': ('original_group_session',),
            'description': admin_note(
                "Sadece bir katılımcı 'başka bir gruba aktar' aksiyonuyla taşındıysa "
                "dolar - danışanın İLK (iptal edilmiş) grubunu gösterir, elle "
                "DEĞİŞTİRMEYİN (geçmiş izini bozar).",
                severity='low',
            ),
        }),
        ("Ödeme ve İnceleme", {'fields': ('payment', 'reviewed_by', 'reviewed_at', 'joined_at')}),
    )

    def status_colored(self, obj):
        config = {
            GroupSessionParticipantStatus.PENDING_APPROVAL: ('#2196f3', 'Onay Bekliyor'),
            GroupSessionParticipantStatus.APPROVED: ('#4caf50', 'Onaylandı'),
            GroupSessionParticipantStatus.REJECTED: ('#f44336', 'Reddedildi'),
        }
        color, text = config.get(obj.status, ('#000', obj.status))
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)
    status_colored.short_description = 'Durum'
    status_colored.admin_order_field = 'status'

    def payment_link(self, obj):
        if obj.payment_id is None:
            return "-"
        url = reverse('admin:payments_payment_change', args=[obj.payment_id])
        color = {'succeeded': '#4caf50', 'refunded': '#9e9e9e', 'failed': '#f44336'}.get(obj.payment.status, '#ff9800')
        return format_html(
            '<a href="{}" style="color: {}; font-weight: bold;">{}</a>',
            url, color, obj.payment.get_status_display(),
        )
    payment_link.short_description = "Ödeme"

    @admin.action(description="Seçilenleri başka bir grup seansına aktar")
    def reassign_to_group_session(self, request, queryset):
        """Django'nun 'ara onay sayfalı aksiyon' deseni (delete_selected'ın
        AYNI mekanizması): 'apply' POST'ta yoksa hedef seçim formunu gösterir,
        varsa her seçili katılımcı için payments.services.reassign_group_participant()
        çağırıp başarı/hata özetini message_user() ile bildirir. Farklı
        danışanları farklı hedeflere aktarmak için: farklı alt-kümeler seçilip
        aksiyon ayrı ayrı çalıştırılır (satır-bazlı ayrı bir arayüz gerekmez)."""
        from payments.services import PaymentError, reassign_group_participant

        if 'apply' in request.POST:
            target_id = request.POST.get('target_group_session')
            try:
                target = GroupSession.objects.select_related('session_offering').get(pk=target_id)
            except (GroupSession.DoesNotExist, ValueError, TypeError):
                self.message_user(request, "Geçerli bir hedef grup seansı seçmelisiniz.", level=messages.ERROR)
                return None

            success_count = 0
            for participant in queryset.select_related('client', 'group_session'):
                try:
                    reassign_group_participant(participant, target, reassigned_by=request.user)
                    success_count += 1
                except PaymentError as e:
                    self.message_user(
                        request, f"{participant.client.get_full_name()}: {e}", level=messages.WARNING,
                    )
            if success_count:
                self.message_user(request, f"{success_count} katılımcı '{target}' grubuna aktarıldı.")
            return None

        selected_offering_ids = set(
            queryset.values_list('group_session__session_offering_id', flat=True)
        )
        source_group_session_ids = set(queryset.values_list('group_session_id', flat=True))
        targets = GroupSession.objects.filter(
            status=GroupSessionStatus.SCHEDULED,
            date__gte=timezone.localdate(),
            session_offering_id__in=selected_offering_ids,
        ).exclude(pk__in=source_group_session_ids).select_related('session_offering', 'expert').order_by('date', 'time')

        context = {
            **self.admin_site.each_context(request),
            'title': "Seçilen katılımcıları başka bir grup seansına aktar",
            'opts': self.model._meta,
            'participants': queryset.select_related('client', 'group_session', 'group_session__session_offering'),
            'targets': targets,
            'action_checkbox_name': admin.helpers.ACTION_CHECKBOX_NAME,
        }
        return TemplateResponse(
            request, 'admin/appointments/groupsessionparticipant/reassign_confirmation.html', context,
        )

