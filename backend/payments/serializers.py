# payments/serializers.py
"""Faz 2/7 (Frontend Yapılandırması planı) - PackageDefinition/PackagePurchase
için salt-okunur serializer'lar. payments app'i şimdiye kadar hiç serializer
kullanmıyordu (checkout view'ları services.py'nin döndürdüğü ham dict'leri
doğrudan Response'a veriyordu) - paket listeleme/görüntüleme gerçek bir model
listesi olduğu için burada ilk kez bir ModelSerializer kullanılıyor.
"""
from rest_framework import serializers

from .models import PackageDefinition, PackagePurchase


class PackageDefinitionSerializer(serializers.ModelSerializer):
    applies_to_offering_name = serializers.CharField(source='applies_to_offering.name', read_only=True)
    price = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = PackageDefinition
        fields = [
            'id', 'name', 'session_count', 'applies_to_offering', 'applies_to_offering_name',
            'discount_percentage', 'price', 'currency',
        ]

    def _pricing(self, obj):
        from .services import compute_package_price
        try:
            return compute_package_price(obj)
        except Exception:
            return {'amount': None, 'currency': 'TRY'}

    def get_price(self, obj):
        return self._pricing(obj)['amount']

    def get_currency(self, obj):
        return self._pricing(obj)['currency']


class PackagePurchaseSerializer(serializers.ModelSerializer):
    package_definition = PackageDefinitionSerializer(read_only=True)
    remaining_sessions = serializers.SerializerMethodField()

    class Meta:
        model = PackagePurchase
        fields = ['id', 'package_definition', 'remaining_sessions', 'purchased_at']

    def get_remaining_sessions(self, obj):
        from .services import get_package_remaining_sessions
        return get_package_remaining_sessions(obj)
