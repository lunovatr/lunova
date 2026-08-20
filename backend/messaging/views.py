from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ClientProfile, ExpertProfile, UserRole
from notifications.services import create_message_notification
from .models import Conversation, Message
from .serializers import MessageCreateSerializer, MessageSerializer
from .services import (
    CLIENT_MESSAGE_LIMIT,
    CLIENT_MESSAGE_MAX_LENGTH,
    get_client_remaining_quota,
)


def _resolve_pair(user, other_user_id):
    """(expert_user_id, client_user_id) döner.

    `other_user_id` HER ZAMAN User.id olarak yorumlanır - forms/views.py'de
    bulunan ClientProfile.id/User.id karışıklığı bug'ının (bkz. kök claude.md,
    15. tur) burada tekrarlanmaması için bilinçli bir tasarım kararı.
    """
    if user.role == UserRole.EXPERT:
        expert_profile = get_object_or_404(ExpertProfile, user=user)
        client_profile = get_object_or_404(ClientProfile, user_id=other_user_id)
        if client_profile.expert_id != expert_profile.id:
            raise PermissionDenied("Bu danışana erişim yetkiniz yok.")
        return user.id, other_user_id

    if user.role == UserRole.CLIENT:
        client_profile = get_object_or_404(ClientProfile, user=user)
        if not client_profile.expert_id or client_profile.expert.user_id != other_user_id:
            raise PermissionDenied("Bu uzmana erişim yetkiniz yok.")
        return other_user_id, user.id

    raise PermissionDenied()


def _quota_payload(expert_id, client_id):
    return {
        "remaining": get_client_remaining_quota(expert_id, client_id),
        "limit": CLIENT_MESSAGE_LIMIT,
    }


class ConversationMessagesView(APIView):
    """
    GET  /api/v1/messaging/conversations/<other_user_id>/messages/
    POST /api/v1/messaging/conversations/<other_user_id>/messages/

    `other_user_id`, isteği atan uzmansa danışanın, danışansa uzmanın
    User.id'sidir (bkz. _resolve_pair).

    Danışanın mesaj hakkı seans-bazlı bir kotaya tabi (bkz. services.py) -
    uzmanın hiçbir sınırı yok. `client_quota`, kim isterse istesin (expert
    veya client) HER yanıtta dönüyor - client kendi hakkını, expert de
    danışanının hakkını görebilsin diye.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, other_user_id):
        expert_id, client_id = _resolve_pair(request.user, other_user_id)
        conversation = Conversation.objects.filter(
            expert_id=expert_id, client_id=client_id
        ).first()

        if conversation:
            conversation.messages.filter(is_read=False).exclude(
                sender=request.user
            ).update(is_read=True, read_at=timezone.now())
            messages = conversation.messages.all()
        else:
            messages = Message.objects.none()

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response({
            "messages": serializer.data,
            "client_quota": _quota_payload(expert_id, client_id),
        })

    def post(self, request, other_user_id):
        expert_id, client_id = _resolve_pair(request.user, other_user_id)
        is_client = request.user.role == UserRole.CLIENT

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data["body"]

        # Karakter limiti danışan için 200, uzman için model üst sınırı
        # (Message.MAX_LENGTH=1000) - frontend maxLength'i bypass edip
        # doğrudan API'ye istek atan bir kullanıcıya karşı sunucu taraflı
        # kesin kontrol (frontend kontrolü kozmetik, gerçek sınır burada).
        max_allowed = CLIENT_MESSAGE_MAX_LENGTH if is_client else Message.MAX_LENGTH
        if len(body) > max_allowed:
            return Response(
                {
                    "detail": f"Mesajınız {max_allowed} karakteri aşamaz.",
                    "code": "message_too_long",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_client:
            quota = _quota_payload(expert_id, client_id)
            if quota["remaining"] <= 0:
                return Response(
                    {
                        "detail": (
                            "Mesaj hakkınız kalmadı. Bir sonraki seans "
                            "sonrasında 5 hakkınız yeniden açılacaktır."
                        ),
                        "code": "quota_exceeded",
                        "client_quota": quota,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        conversation, _ = Conversation.objects.get_or_create(
            expert_id=expert_id, client_id=client_id
        )
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            body=body,
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at"])
        create_message_notification(message)

        response_data = MessageSerializer(message, context={"request": request}).data
        response_data["client_quota"] = _quota_payload(expert_id, client_id)
        return Response(response_data, status=status.HTTP_201_CREATED)


class ConversationListView(APIView):
    """
    GET /api/v1/messaging/conversations/

    Sadece uzmanlar için: her atanmış danışan için (hiç mesajlaşılmamış
    olsa bile) bir özet satırı döner - danışan tarafında zaten tek bir
    karşı taraf (kendi uzmanı) olduğundan bu roster'a ihtiyaç yok.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.EXPERT:
            return Response(status=status.HTTP_403_FORBIDDEN)

        expert_profile = get_object_or_404(ExpertProfile, user=request.user)
        clients = ClientProfile.objects.filter(
            expert=expert_profile
        ).select_related('user').order_by('user__first_name', 'user__last_name')

        conversations_by_client_id = {
            c.client_id: c
            for c in Conversation.objects.filter(expert=request.user)
        }

        results = []
        for client_profile in clients:
            client_user = client_profile.user
            conversation = conversations_by_client_id.get(client_user.id)

            last_message = None
            unread_count = 0
            if conversation:
                last = conversation.messages.last()
                if last:
                    last_message = {
                        "body": last.body,
                        "created_at": last.created_at,
                        "sender_id": last.sender_id,
                    }
                unread_count = conversation.messages.filter(
                    is_read=False
                ).exclude(sender=request.user).count()

            results.append({
                "client_id": client_user.id,
                "client_name": client_user.get_full_name(),
                "last_message": last_message,
                "unread_count": unread_count,
                "client_quota": _quota_payload(request.user.id, client_user.id),
            })

        return Response(results)
