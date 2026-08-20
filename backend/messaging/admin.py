from django.contrib import admin

from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'expert', 'client', 'last_message_at', 'created_at']
    search_fields = ['expert__email', 'client__email']
    autocomplete_fields = ['expert', 'client']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'is_read', 'created_at']
    list_filter = ['is_read']
    search_fields = ['body', 'sender__email']
    autocomplete_fields = ['conversation', 'sender']
