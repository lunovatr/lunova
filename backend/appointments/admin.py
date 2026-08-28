from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Appointment, GroupSession, GroupSessionParticipant, GroupSessionWaitlist


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
        ('Randevu Bilgileri', {
            'fields': ('expert', 'client', 'date', 'time', 'duration'),
            'classes': ('wide',)
        }),
        ('Durum ve Notlar', {
            'fields': ('status', 'is_confirmed', 'notes'),
            'classes': ('wide',)
        }),
        ('Zoom Entegrasyonu', {
            'fields': ('zoom_start_url', 'zoom_join_url', 'zoom_meeting_id'),
            'classes': ('collapse', 'wide')
        }),
        ('Sistem Bilgileri', {
            'fields': ('is_deleted', 'created_at', 'updated_at'),
            'classes': ('collapse',)
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
        """Seçili randevuları iptal edilmiş olarak işaretle"""
        updated = queryset.update(status='cancelled', is_confirmed=False)
        self.message_user(request, f'{updated} randevu iptal edildi.')
    mark_as_cancelled.short_description = "Seçili randevuları iptal et"

    def soft_delete(self, request, queryset):
        """Seçili randevuları soft delete yap"""
        updated = queryset.update(is_deleted=True)
        self.message_user(request, f'{updated} randevu silindi (soft delete).')
    soft_delete.short_description = "Seçili randevuları sil (soft delete)"


class GroupSessionParticipantInline(admin.TabularInline):
    model = GroupSessionParticipant
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
                     'capacity', 'participant_count', 'status')
    list_filter = ('status', 'session_offering', 'session_type')
    search_fields = ('expert__first_name', 'expert__last_name', 'session_offering__name')
    date_hierarchy = 'date'
    inlines = [GroupSessionParticipantInline, GroupSessionWaitlistInline]

    def participant_count(self, obj):
        approved = obj.participants.filter(status='approved').count()
        return f"{approved}/{obj.capacity}"
    participant_count.short_description = "Doluluk (onaylı)"

