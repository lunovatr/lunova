from decimal import Decimal

from django.db import migrations


def backfill_pricing_rules(apps, schema_editor):
    """Her fiyatlandırılmış uzman (ExpertProfile.session_price dolu) için,
    mevcut session_price/currency'yi BİREBİR koruyan bir platform-geneli
    (session_offering=None) PricingRule satırı üretir - komisyon %0 (platform
    payı yok, tüm tutar uzmana ait) olarak başlar, bu YENİ Payment.amount'ın
    migration ÖNCESİ davranışla (komisyon ayrımı hiç yoktu, tüm tutar
    "uzmanın" sayılırdı) birebir aynı kalmasını sağlar - gerçek komisyon
    oranları admin panelinden ayrıca girilmeli, burada iş kararı verilmiyor."""
    ExpertProfile = apps.get_model('accounts', 'ExpertProfile')
    PricingRule = apps.get_model('payments', 'PricingRule')

    rules = [
        PricingRule(
            expert=expert,
            session_offering=None,
            client_price=expert.session_price,
            currency=expert.currency or 'TRY',
            commission_type='percentage',
            commission_value=Decimal('0'),
            is_active=True,
        )
        for expert in ExpertProfile.objects.filter(session_price__isnull=False)
    ]
    PricingRule.objects.bulk_create(rules)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_payment_expert_earning_payment_platform_commission_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_pricing_rules, noop_reverse),
    ]
