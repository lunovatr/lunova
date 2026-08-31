"""
payments app'i için besleme (seed) script'i - Fiyatlandırma/İndirim/Paket
Katmanı (Faz 10, Frontend Yapılandırması planı).

`get_or_create` kullanır - tekrar tekrar çalıştırılabilir, var olan kayıtları
çoğaltmaz. accounts (ExpertProfile için) VE catalog (SessionOffering için)
feed'lerinden SONRA çalıştırılmalı - bkz. backend/feed_db.py FEEDS sırası.

Amaç: yeni "Ödemeler" ekranındaki indirim kodu girişi, uzman panelinin grup
seansı fiyat gösterimi ve (henüz frontend'i olmayan ama backend'i hazır olan)
paket satın alma ucu BOŞ görünmesin diye gerçekten test edilebilir örnek veri
üretmek - hiçbiri gerçek bir iş kararı değil, sadece geliştirme/test amaçlı.
"""
import os
import sys

if __name__ == "__main__":
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../"))
    sys.path.insert(0, BACKEND_DIR)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lunova_backend.settings')
    import django
    django.setup()

from decimal import Decimal

from accounts.models import ExpertProfile, User
from catalog.models import SessionOffering, SessionOfferingVariant
from payments.models import (
    CommissionType, DiscountCode, DiscountCostBearer, DiscountRule, DiscountSourceType,
    DiscountType, PackageDefinition, PricingRule,
)

# yusuf@lunova.tr - accounts/tests/feed_accounts.py::NAMED_TEAM_REAL_INFO'daki
# gerçek kimlikli ekip uzmanlarından biri (bkz. o dosyanın NAMED_TEAM_REAL_INFO
# sözlüğü) - uzmana özel bir PricingRule örneği için sabit, bilinen bir hesap.
NAMED_EXPERT_EMAIL = "yakcakaya@lunova.tr"

DISCOUNT_SOURCE_TYPES_DATA = [
    {"name": "Promosyon", "slug": "promosyon"},
    {"name": "Sponsor", "slug": "sponsor"},
    {"name": "Referans", "slug": "referans"},
    {"name": "İç Test", "slug": "ic-test"},
]


def seed_discount_source_types():
    print("\n-- DiscountSourceType (İndirim Kaynak Tipleri) --")
    result = {}
    for data in DISCOUNT_SOURCE_TYPES_DATA:
        obj, created = DiscountSourceType.objects.get_or_create(slug=data["slug"], defaults=data)
        result[data["slug"]] = obj
        marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
        print(f"  {marker}: {obj.name}")
    return result


def seed_discount_code(source_types, individual_offering):
    print("\n-- DiscountRule / DiscountCode (Test Edilebilir Örnek: HOSGELDIN10) --")
    rule, created = DiscountRule.objects.get_or_create(
        source_type=source_types["promosyon"],
        applies_to_offering=individual_offering,
        discount_type=DiscountType.PERCENTAGE,
        value=Decimal("10"),
        defaults={
            "cost_bearer": DiscountCostBearer.PLATFORM,
            "is_active": True,
        },
    )
    marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
    print(f"  {marker}: DiscountRule ({rule.source_type.name}, %{rule.value})")

    code, created = DiscountCode.objects.get_or_create(
        code="HOSGELDIN10",
        defaults={
            "discount_rule": rule,
            "max_redemptions": None,
            "max_redemptions_per_user": 1,
            "is_active": True,
        },
    )
    marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
    print(f"  {marker}: DiscountCode '{code.code}' (bireysel terapide %10, danışan başına 1 kez)")


def seed_pricing_rules(individual_offering, group_offering):
    print("\n-- PricingRule (Platform Geneli / Uzmana Özel / Kıdem Kademesi Örnekleri) --")

    platform_wide, created = PricingRule.objects.get_or_create(
        session_offering=individual_offering, expert=None, variant=None,
        defaults={
            "client_price": Decimal("500"), "currency": "TRY",
            "commission_type": CommissionType.PERCENTAGE, "commission_value": Decimal("15"),
            "is_active": True,
        },
    )
    marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
    print(f"  {marker}: Platform geneli - Bireysel Terapi ({platform_wide.client_price} {platform_wide.currency})")

    group_wide, created = PricingRule.objects.get_or_create(
        session_offering=group_offering, expert=None, variant=None,
        defaults={
            "client_price": Decimal("350"), "currency": "TRY",
            "commission_type": CommissionType.PERCENTAGE, "commission_value": Decimal("20"),
            "is_active": True,
        },
    )
    marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
    print(f"  {marker}: Platform geneli - Grup Terapisi ({group_wide.client_price} {group_wide.currency})")

    named_expert_user = User.objects.filter(email=NAMED_EXPERT_EMAIL).first()
    if named_expert_user is not None:
        expert_profile = ExpertProfile.objects.filter(user=named_expert_user).first()
        if expert_profile is not None:
            expert_rule, created = PricingRule.objects.get_or_create(
                session_offering=individual_offering, expert=expert_profile, variant=None,
                defaults={
                    "client_price": Decimal("650"), "currency": "TRY",
                    "commission_type": CommissionType.PERCENTAGE, "commission_value": Decimal("12"),
                    "is_active": True,
                },
            )
            marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
            print(f"  {marker}: Uzmana özel ({named_expert_user.get_full_name()}) - Bireysel Terapi "
                  f"({expert_rule.client_price} {expert_rule.currency})")
    else:
        print(f"  ⚠️  atlandı (uzmana özel kural): {NAMED_EXPERT_EMAIL} bulunamadı - önce accounts feed'i çalıştırılmalı")

    tier_1 = SessionOfferingVariant.objects.filter(
        session_offering=individual_offering, variant_key="tier_1",
    ).first()
    if tier_1 is not None:
        tier_rule, created = PricingRule.objects.get_or_create(
            session_offering=individual_offering, expert=None, variant=tier_1,
            defaults={
                "client_price": Decimal("550"), "currency": "TRY",
                "commission_type": CommissionType.PERCENTAGE, "commission_value": Decimal("15"),
                "is_active": True,
            },
        )
        marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
        print(f"  {marker}: Kıdem kademesi ({tier_1.variant_label}) - Bireysel Terapi "
              f"({tier_rule.client_price} {tier_rule.currency})")
    else:
        print("  ⚠️  atlandı (kıdem kuralı): tier_1 varyantı bulunamadı - önce catalog feed'i çalıştırılmalı")


def seed_package_definitions(individual_offering):
    print("\n-- PackageDefinition (Paket Örnekleri) --")
    packages_data = [
        {"name": "5 Seanslik Bireysel Terapi Paketi", "session_count": 5, "discount_percentage": Decimal("10")},
        {"name": "10 Seanslik Bireysel Terapi Paketi", "session_count": 10, "discount_percentage": Decimal("18")},
    ]
    for data in packages_data:
        obj, created = PackageDefinition.objects.get_or_create(
            name=data["name"],
            defaults={
                "session_count": data["session_count"],
                "applies_to_offering": individual_offering,
                "discount_percentage": data["discount_percentage"],
                "is_active": True,
            },
        )
        marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
        print(f"  {marker}: {obj.name} (%{obj.discount_percentage} indirim)")


def main():
    individual_offering = SessionOffering.objects.filter(code="individual_therapy").first()
    group_offering = SessionOffering.objects.filter(code="group_therapy").first()
    if individual_offering is None or group_offering is None:
        print("❌ SessionOffering kayıtları bulunamadı - önce 'python feed_db.py --apps catalog' çalıştırılmalı.")
        return

    source_types = seed_discount_source_types()
    seed_discount_code(source_types, individual_offering)
    seed_pricing_rules(individual_offering, group_offering)
    seed_package_definitions(individual_offering)


if __name__ == "__main__":
    main()
