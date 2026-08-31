"""
catalog app'i için besleme (seed) script'i - Seans Tipi Kataloğu (Katman 1).

`get_or_create` kullanır (code alanı üzerinden) - tekrar tekrar çalıştırılabilir,
var olan kayıtları çoğaltmaz. Diğer hiçbir app'e bağımlı değil, feed_db.py
sıralamasında en başta (accounts'tan bile önce) çalışabilir.
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

from catalog.models import SessionOffering, SessionOfferingCategory, SessionOfferingVariant

# Plan dokümanındaki (Seans Tipi Kataloğu & Fiyatlandırma Motoru, Faz 1) örnek
# senaryonun birebir aynısı: bireysel/çift + grup+psikoeğitim. Grup teklifleri
# (group_therapy/psychoeducation_group) Frontend Yapılandırması planının
# Faz 1'inde GroupSession rezervasyon motoru gerçekten kurulup uçtan uca
# doğrulandığı için artık is_active=True - önceki turlarda "Faz 5'i bekliyor"
# diye pasif tutuluyorlardı, o bağımlılık artık kapandı.
SESSION_OFFERINGS_DATA = [
    {
        "code": "individual_therapy", "name": "Bireysel Terapi",
        "category": SessionOfferingCategory.INDIVIDUAL,
        "requires_multi_participant": False, "default_duration_minutes": 45,
        "is_active": True,
    },
    {
        "code": "couple_therapy", "name": "Çift Terapisi",
        "category": SessionOfferingCategory.INDIVIDUAL,
        "requires_multi_participant": False, "default_duration_minutes": 60,
        "is_active": True,
    },
    {
        "code": "group_therapy", "name": "Grup Terapisi",
        "category": SessionOfferingCategory.GROUP,
        "requires_multi_participant": True, "default_duration_minutes": 90,
        "is_active": True,
    },
    {
        "code": "psychoeducation_individual", "name": "Psikoeğitim (Bireysel)",
        "category": SessionOfferingCategory.EDUCATIONAL,
        "requires_multi_participant": False, "default_duration_minutes": 45,
        "is_active": True,
    },
    {
        "code": "psychoeducation_group", "name": "Psikoeğitim (Grup)",
        "category": SessionOfferingCategory.EDUCATIONAL,
        "requires_multi_participant": True, "default_duration_minutes": 90,
        "is_active": True,
    },
]

# Faz 10 (Frontend Yapılandırması planı) - individual_therapy için kıdem
# kademeleri (payments/services.py::resolve_tier_variant_for_expert()'in
# aradığı "tier_<N>" deseni) + group_therapy için ex-user/karma grup ayrımı.
# Sadece kod/etiket - fiyatlandırması (varsa) payments/tests/feed_payments.py'de.
SESSION_OFFERING_VARIANTS_DATA = [
    ("individual_therapy", "tier_0", "Kademe 0 (0-10 ay)"),
    ("individual_therapy", "tier_1", "Kademe 1 (10-20 ay)"),
    ("individual_therapy", "tier_2", "Kademe 2 (20+ ay)"),
    ("group_therapy", "ex_user_only", "Sadece Ex-User"),
    ("group_therapy", "mixed_group", "Karma Grup"),
]


def main():
    print("\n-- SessionOffering (Seans Tipi Kataloğu) --")
    offerings_by_code = {}
    for data in SESSION_OFFERINGS_DATA:
        code = data.pop("code")
        obj, created = SessionOffering.objects.get_or_create(code=code, defaults=data)
        data["code"] = code  # sonraki çalıştırmalar için sözlüğü bozmayalım
        offerings_by_code[code] = obj

        changed_fields = []
        if not created:
            # get_or_create() var olan bir kayıtta defaults'u UYGULAMAZ - bu
            # scriptin kanonik kaynak veri değiştiğinde (örn. group_therapy'nin
            # bu turda is_active=False'tan True'ya çevrilmesi) eski çalıştırmalardan
            # kalma satırların sonsuza kadar bayat kalmasına yol açardı. Script
            # tekrar çalıştırıldığında alanlar burada kaynak veriyle senkronize edilir.
            changed_fields = [f for f, v in data.items() if f != "code" and getattr(obj, f) != v]
            if changed_fields:
                for f in changed_fields:
                    setattr(obj, f, data[f])
                obj.save(update_fields=changed_fields)

        if created:
            marker = "✓ oluşturuldu"
        elif changed_fields:
            marker = f"○ güncellendi ({', '.join(changed_fields)})"
        else:
            marker = "○ zaten mevcut"
        print(f"  {marker}: {obj.name} ({obj.code})")

    print("\n-- SessionOfferingVariant (Kıdem Kademeleri / Ex-User Ayrımı) --")
    for offering_code, variant_key, variant_label in SESSION_OFFERING_VARIANTS_DATA:
        offering = offerings_by_code.get(offering_code) or SessionOffering.objects.filter(code=offering_code).first()
        if offering is None:
            print(f"  ⚠️  atlandı: {offering_code} bulunamadı")
            continue
        obj, created = SessionOfferingVariant.objects.get_or_create(
            session_offering=offering, variant_key=variant_key,
            defaults={"variant_label": variant_label},
        )
        marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
        print(f"  {marker}: {offering.name} - {obj.variant_label} ({obj.variant_key})")


if __name__ == "__main__":
    main()
