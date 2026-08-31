# appointments/group_views.py
"""Grup seansı (GroupSession) uçları - Faz 1, Frontend Yapılandırması planı.

"Müsaitlik -> talep -> onay -> ödeme" akışı: uzman GroupSessionListCreateView
(POST) ile bir slot açar, danışan GroupSessionRequestJoinView ile talep
gönderir, uzman GroupSessionParticipantReviewView ile onaylar/reddeder,
danışan onaydan sonra payments app'indeki checkout ucuyla kendi ödemesini
başlatır (bkz. payments/views.py::GroupSessionParticipantCheckoutView).
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole
from payments.services import (
    PaymentError, approve_group_join_request, cancel_group_session,
    reject_group_join_request, request_join_group_session,
)

from .models import (
    GroupSession, GroupSessionParticipant, GroupSessionStatus, GroupSessionWaitlist,
)
from .permissions import IsGroupSessionOwnerPermission
from .serializers import (
    GroupSessionCreateSerializer, GroupSessionParticipantSerializer, GroupSessionSerializer,
    GroupSessionWaitlistSerializer, MyGroupParticipationSerializer,
)


class GroupSessionListCreateView(generics.ListCreateAPIView):
    """GET: rol bazlı filtre - client ise sadece is_active+scheduled+eligible
    (ex_user_only ise recovery_status kontrolü) olanlar, opsiyonel
    ?expert_id=; expert ise SADECE KENDİ grup seanslarını (hepsi, geçmiş
    dahil) döner.
    POST: sadece expert - yeni GroupSession oluşturur."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupSessionCreateSerializer
        return GroupSessionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = GroupSession.objects.select_related(
            'expert', 'expert__expertprofile', 'session_offering', 'session_type', 'variant'
        ).prefetch_related('participants', 'waitlist_entries')

        role = getattr(user, 'role', None)
        if role == UserRole.EXPERT:
            return qs.filter(expert=user)

        if role != UserRole.CLIENT:
            return qs.none()

        qs = qs.filter(status=GroupSessionStatus.SCHEDULED, date__gte=timezone.localdate())

        expert_id = self.request.query_params.get('expert_id')
        if expert_id:
            qs = qs.filter(expert_id=expert_id)

        client_profile = getattr(user, 'clientprofile', None)
        recovery_status = client_profile.recovery_status if client_profile else None
        if recovery_status != 'in_recovery':
            qs = qs.exclude(variant__variant_key='ex_user_only')

        return qs

    def perform_create(self, serializer):
        if getattr(self.request.user, 'role', None) != UserRole.EXPERT:
            raise PermissionDenied("Sadece uzmanlar grup seansı oluşturabilir.")
        serializer.save(expert=self.request.user)


class GroupSessionDetailView(generics.RetrieveAPIView):
    """GET: detay + katılımcı listesi (approved olanlar - "grup arkadaşları"
    için; talep sahibi sadece KENDİ talebini + approved katılımcıları görür,
    expert HEPSİNİ görür - bkz. GroupSessionSerializer.get_participants)."""
    serializer_class = GroupSessionSerializer
    queryset = GroupSession.objects.select_related('expert', 'expert__expertprofile', 'session_offering', 'session_type', 'variant')

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [permissions.IsAuthenticated(), IsGroupSessionOwnerPermission()]
        return [permissions.IsAuthenticated()]

    def patch(self, request, *args, **kwargs):
        """Sadece durum güncellemesi (örn. 'cancelled') için - kapasite/tarih
        gibi alanların sonradan değişmesi var olan talep/onay/ödeme akışını
        tutarsız hale getirir, bilinçli olarak desteklenmiyor.

        'cancelled' hedefi artık payments.services.cancel_group_session()
        üzerinden geçiyor (Admin Panel Dokümantasyon/Güvenlik turu, YENİ) -
        önceden burada ham bir .save() vardı, onaylanmış/bekleme listesindeki
        katılımcılara hiç dokunmuyordu (bkz. o fonksiyonun docstring'i). Bu
        aynı zamanda Django admin'deki "Grup Seansını İptal Et" aksiyonunun
        da çağırdığı fonksiyon - tek bir doğru davranış kaynağı."""
        instance = self.get_object()  # get_object() zaten check_object_permissions() çağırır

        new_status = request.data.get('status')
        if new_status not in dict(GroupSessionStatus.choices):
            return Response({'detail': 'Geçersiz durum.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == GroupSessionStatus.CANCELLED:
            try:
                instance = cancel_group_session(instance, cancelled_by=request.user)
            except PaymentError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            instance.status = new_status
            instance.save(update_fields=['status', 'updated_at'])

        return Response(self.get_serializer(instance).data)


class GroupSessionRequestJoinView(APIView):
    """POST /api/v1/appointments/group-sessions/<id>/request-join/ - sadece
    client, request_join_group_session() çağırır."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', None) != UserRole.CLIENT:
            return Response(
                {'detail': 'Sadece danışanlar katılım talebi gönderebilir.'}, status=status.HTTP_403_FORBIDDEN,
            )

        group_session = get_object_or_404(GroupSession, pk=pk)
        try:
            result = request_join_group_session(group_session, request.user)
        except PaymentError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if isinstance(result, GroupSessionWaitlist):
            return Response(
                GroupSessionWaitlistSerializer(result, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            GroupSessionParticipantSerializer(result, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class GroupSessionParticipantReviewView(APIView):
    """PATCH /api/v1/appointments/group-sessions/<id>/participants/<participant_id>/
    body: {"status": "approved"|"rejected"} - sadece expert (kendi grubu)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, participant_id):
        group_session = get_object_or_404(GroupSession, pk=pk)
        if group_session.expert_id != request.user.id:
            return Response({'detail': 'Bu grup seansı üzerinde yetkiniz yok.'}, status=status.HTTP_403_FORBIDDEN)

        participant = get_object_or_404(GroupSessionParticipant, pk=participant_id, group_session=group_session)
        new_status = request.data.get('status')
        if new_status not in ('approved', 'rejected'):
            return Response(
                {'detail': "status 'approved' ya da 'rejected' olmalıdır."}, status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if new_status == 'approved':
                participant = approve_group_join_request(participant, reviewed_by=request.user)
            else:
                participant = reject_group_join_request(participant, reviewed_by=request.user)
        except PaymentError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(GroupSessionParticipantSerializer(participant, context={'request': request}).data)


class MyGroupSessionsView(APIView):
    """GET /api/v1/appointments/group-sessions/mine/ - sadece client - kendi
    TÜM katılımlarını (pending_approval/approved/rejected, geçmiş dahil) +
    bekleme listesi kayıtlarını döner - "Grup Seanslarım" sayfasının tek veri
    kaynağı."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) != UserRole.CLIENT:
            return Response({'participations': [], 'waitlist': []})

        participants = GroupSessionParticipant.objects.filter(client=request.user).select_related(
            'group_session', 'group_session__expert', 'group_session__expert__expertprofile',
            'group_session__session_offering', 'group_session__session_type', 'group_session__variant',
            'payment',
        ).prefetch_related('group_session__participants')

        waitlist_entries = GroupSessionWaitlist.objects.filter(client=request.user).select_related(
            'group_session', 'group_session__expert', 'group_session__expert__expertprofile',
            'group_session__session_offering', 'group_session__session_type', 'group_session__variant',
        )

        return Response({
            'participations': MyGroupParticipationSerializer(
                participants, many=True, context={'request': request}
            ).data,
            'waitlist': GroupSessionWaitlistSerializer(
                waitlist_entries, many=True, context={'request': request}
            ).data,
        })
