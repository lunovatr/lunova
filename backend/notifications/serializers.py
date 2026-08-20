from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    appointment_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'body',
            'appointment_id', 'is_read', 'read_at', 'created_at',
        ]

    def get_appointment_id(self, obj):
        # obj.appointment_id, FK'nin kendisi (ilişkili nesne) sorgulanmadan
        # doğrudan Django tarafından sağlanır - appointment=None ise None döner.
        return obj.appointment_id
