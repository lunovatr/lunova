from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .services import cleanup_old_read_notifications, sync_appointment_reminders


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/

    Her çağrıda önce kullanıcının yaklaşan (3 gün içindeki) onaylanmış
    randevuları için eksik bildirimler oluşturulur, sonra 20 günden eski
    okunmuş bildirimler temizlenir - ardından güncel liste döner.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        sync_appointment_reminders(user)
        cleanup_old_read_notifications(user)
        return Notification.objects.filter(user=user)


class NotificationMarkReadView(APIView):
    """
    PATCH /api/v1/notifications/<id>/read/

    Bildirimi okunmuş işaretler (idempotent - zaten okunmuşsa dokunmaz).
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
