from django.urls import path

from .views import ConversationListView, ConversationMessagesView

app_name = 'messaging'

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversation_list'),
    path(
        'conversations/<int:other_user_id>/messages/',
        ConversationMessagesView.as_view(),
        name='conversation_messages',
    ),
]
