from django.urls import path
from .views import (
    AppointmentListView,
    ExpertAppointmentCreateView,
    ClientAppointmentRequestView,
    AppointmentDetailView,
    get_zoom_meeting_info,
    ExpertAppointmentsForClientView,
)
from .group_views import (
    GroupSessionListCreateView,
    GroupSessionDetailView,
    GroupSessionRequestJoinView,
    GroupSessionParticipantReviewView,
    MyGroupSessionsView,
)

app_name = 'appointments'

urlpatterns = [
    # Listeleme
    path('', AppointmentListView.as_view(), name='appointment_list'),

    # Randevu oluşturma (ayrı endpoint'ler)
    path('expert/create/', ExpertAppointmentCreateView.as_view(), name='expert_appointment_create'),
    path('client/request/', ClientAppointmentRequestView.as_view(), name='client_appointment_request'),

    # Randevu detay ve işlemler
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment_detail'),
    path('<int:pk>/status/', AppointmentDetailView.as_view(), name='appointment_status_update'),
    path('<int:appointment_id>/meeting-info/', get_zoom_meeting_info, name='meeting_info'),

    # Expert appointments for clients
    path('experts/<int:expert_id>/appointments/', ExpertAppointmentsForClientView.as_view(), name='expert_appointments'),

    # Grup Seansları (Faz 1, Frontend Yapılandırması planı) - 'mine' sabit
    # segmenti <int:pk>'den ÖNCE tanımlanmalı, aksi halde 'mine' bir pk gibi
    # yakalanmaya çalışılır.
    path('group-sessions/mine/', MyGroupSessionsView.as_view(), name='group_session_mine'),
    path('group-sessions/', GroupSessionListCreateView.as_view(), name='group_session_list_create'),
    path('group-sessions/<int:pk>/', GroupSessionDetailView.as_view(), name='group_session_detail'),
    path('group-sessions/<int:pk>/request-join/', GroupSessionRequestJoinView.as_view(), name='group_session_request_join'),
    path(
        'group-sessions/<int:pk>/participants/<int:participant_id>/',
        GroupSessionParticipantReviewView.as_view(), name='group_session_participant_review',
    ),
]