from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender_id', 'sender_name', 'body',
            'is_mine', 'is_read', 'created_at',
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name()

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and obj.sender_id == request.user.id)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(
        max_length=Message.MAX_LENGTH,
        allow_blank=False,
        trim_whitespace=True,
    )
