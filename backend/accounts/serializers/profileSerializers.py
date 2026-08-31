from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from accounts.models import ExpertProfile, ClientProfile
from accounts.serializers.serializers import AddictionTypeSerializer, EmergencyContactSerializer
from accounts.serializers.document_serializers import DocumentSerializer

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "country",
            "birth_date",
            "gender",
            "phone_number",
            "timezone",
            "id_number",
            "national_id",
        ]


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    substances_used = AddictionTypeSerializer(many=True, read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    # source="user.documents" (bir Manager) + DRF'in ListSerializer.to_representation()'ı
    # bir Manager gördüğünde otomatik .all() çağırması sayesinde, ProfileView.get_object()'teki
    # Prefetch(queryset=Document.objects.filter(is_current=True)) burada AYNEN devreye giriyor -
    # yani "silinmiş" (is_current=False) belgeler zaten hiç görünmüyor, EK bir filtreleme
    # (örn. bir SerializerMethodField ile .filter() çağırmak) hem gereksiz hem de prefetch
    # cache'ini bypass edip fazladan bir DB sorgusuna sebep olurdu.
    documents = DocumentSerializer(source="user.documents", many=True, read_only=True)

    expert = serializers.SerializerMethodField()

    class Meta:
        model = ClientProfile
        fields = [
            "user",
            "support_goal",
            "received_service_before",
            "onboarding_complete",
            "is_active_in_treatment",
            "substances_used",
            "emergency_contacts",
            "expert",
            "documents",
            "recovery_status",
        ]
        read_only_fields = ["recovery_status"]

    def get_expert(self, obj):
        if not obj.expert:
            return None

        return {
            # User.id (ExpertProfile.id DEĞİL) - messaging app'i konuşma
            # eşleşmesini her yerde User.id üzerinden kurduğu için (bkz.
            # backend/messaging/views.py), client bu id'yi doğrudan kullanır.
            "id": obj.expert.user_id,
            "full_name": obj.expert.user.get_full_name(),
            "title": obj.expert.title,
        }


class ExpertProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    services = serializers.StringRelatedField(many=True)
    specializations = serializers.StringRelatedField(many=True)
    languages = serializers.StringRelatedField(many=True)
    approach_methods = serializers.StringRelatedField(many=True)
    target_groups = serializers.StringRelatedField(many=True)

    # Bkz. ClientProfileSerializer.documents - aynı gerekçe (Prefetch zaten filtreliyor).
    documents = DocumentSerializer(source="user.documents", many=True, read_only=True)

    university = serializers.StringRelatedField()
    degree_level = serializers.StringRelatedField()
    major = serializers.StringRelatedField()

    class Meta:
        model = ExpertProfile
        fields = [
            "user",

            # Profil bilgileri
            "about",
            "title",
            "experience_years",
            "license_number",
            "institution",

            # Eğitim
            "university",
            "degree_level",
            "major",

            # Hizmet / uzmanlık
            "services",
            "specializations",
            "languages",
            "approach_methods",
            "target_groups",

            # Seans bilgileri
            "session_price",
            "currency",
            "appointment_duration",
            "free_first_session",
            "video_intro_url",
            "availability_status",

            # Rating & status
            "approval_status",
            "rating_average",
            "rating_count",

            # Belgeler
            "documents",

            # Meta
            "created_at",
            "updated_at",
        ]
