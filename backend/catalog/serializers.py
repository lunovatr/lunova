# catalog/serializers.py
"""Faz 4 (Frontend Yapılandırması planı) - uzmanın grup seansı oluşturma
formunun ihtiyaç duyduğu, katalogtaki seans tiplerini/varyantlarını listeleyen
salt-okunur serializer'lar. catalog app'i şimdiye kadar hiç bir REST view'ı
olmayan, sadece admin panelinden yönetilen bir modeldi."""
from rest_framework import serializers

from .models import SessionOffering, SessionOfferingVariant


class SessionOfferingVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionOfferingVariant
        fields = ['id', 'variant_key', 'variant_label']


class SessionOfferingSerializer(serializers.ModelSerializer):
    variants = serializers.SerializerMethodField()

    class Meta:
        model = SessionOffering
        fields = [
            'id', 'code', 'name', 'category', 'requires_multi_participant',
            'default_duration_minutes', 'variants',
        ]

    def get_variants(self, obj):
        return SessionOfferingVariantSerializer(
            obj.variants.filter(is_active=True), many=True,
        ).data
