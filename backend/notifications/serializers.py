from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    appointment_id = serializers.SerializerMethodField()
    related_user_id = serializers.SerializerMethodField()
    group_session_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'body',
            'appointment_id', 'related_user_id', 'group_session_id', 'is_read', 'read_at', 'created_at',
        ]

    def get_appointment_id(self, obj):
        # obj.appointment_id, FK'nin kendisi (ilişkili nesne) sorgulanmadan
        # doğrudan Django tarafından sağlanır - appointment=None ise None döner.
        return obj.appointment_id

    def get_related_user_id(self, obj):
        return obj.related_user_id

    def get_group_session_id(self, obj):
        # Faz 2/8 (Frontend Yapılandırması planı) - group_* bildirim türleri
        # için deep-link hedefi.
        return obj.group_session_id
