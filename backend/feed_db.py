"""
Lunova backend - ana veritabanı besleme (seed) script'i.

Her app'in kendi `**/tests/feed_*.py` script'i var (bkz. aşağıdaki FEEDS listesi) -
bu script hepsini TEK bir Django kurulumuyla, doğru bağımlılık sırasıyla art arda
çalıştırır. Sıra ÖNEMLİ ve rastgele değil:

    catalog -> accounts -> payments -> availability -> appointments -> group_sessions
    -> messaging -> notifications -> forms

- catalog: Seans Tipi Kataloğu (SessionOffering/SessionOfferingVariant) - hiçbir
  app'e bağımlı değil, bu yüzden en başta.
- accounts: temel Kullanıcı/Uzman/Danışan verisi + NAMED_TEAM_MEMBERS ekip
  hesapları (bkz. accounts/tests/feed_accounts.py). Diğer HER şey buna bağımlı.
- payments: PricingRule/DiscountCode/PackageDefinition (Faz 10, Frontend
  Yapılandırması planı) - ExpertProfile (accounts) VE SessionOffering/Variant
  (catalog) gerektirir, bu yüzden ikisinden de SONRA; appointments/group_sessions'tan
  ÖNCE gelmesi zorunlu değil ama fiyat gösteriminin baştan doğru görünmesi için
  önce çalıştırılıyor.
- availability: uzmanların haftalık müsaitlik/istisna takvimi (sadece ExpertProfile'a bağımlı).
- appointments: randevular + ekip çiftleri için hedefli senaryolar (mesaj kotası
  ve bildirim testleri BUNLARA bağımlı - bkz. appointments'taki
  NAMED_PAIR_APPOINTMENT_SCENARIOS).
- group_sessions: GroupSession/GroupSessionParticipant/GroupSessionWaitlist örnek
  verisi (Faz 10) - isimlendirilmiş ekip hesaplarına (accounts) VE group_therapy/
  psychoeducation_group SessionOffering'lerine (catalog) bağımlı, appointments'tan
  bağımsız ama okunabilirlik için ondan hemen sonra sıralandı.
- messaging: örnek sohbetler - kota penceresini appointments'ın oluşturduğu
  TAMAMLANMIŞ randevulardan okur, bu yüzden appointments'tan SONRA gelmeli.
- notifications: randevu hatırlatmalarını (appointments'a bağımlı) senkronize
  eder; not/mesaj bildirimleri zaten messaging feed'i çalışırken oluşturulmuş
  olur (messaging/views.py'deki gerçek POST akışıyla aynı fonksiyon çağrılarak).
- forms: sadece accounts'taki 'client' rolündeki kullanıcılara bağımlı, sırası
  esnek ama DİKKAT: her çalıştığında var olan TÜM Form/FormResponse verisini
  SİLİP yeniden oluşturur (bkz. forms/tests/feed_forms.py) - bu yüzden listenin
  sonuna alındı.

`zoom/` app'i için AYRI bir feed script'i YOK ve bilinçli olarak eklenmedi:
kendi modeli yok, appointments feed'i zaten `zoom_start_url`/`zoom_join_url`/
`zoom_meeting_id` alanlarını randevu oluştururken (generate_zoom_data() ile)
dolduruyor - appointments'tan bağımsız bir "zoom verisi" kavramı yok.

Kullanım:
    python feed_db.py                          # hepsini sırayla çalıştırır
    python feed_db.py --apps accounts,messaging # sadece belirtilenleri (yine de yazdığın sırada değil, yukarıdaki kanonik sırada) çalıştırır
    python feed_db.py --list                    # sırayı ve script yollarını listeler, hiçbir şey çalıştırmaz
    python feed_db.py --skip-forms              # forms hariç hepsini çalıştırır (Form/FormResponse verisini SİLMEZ)
"""

import argparse
import importlib.util
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lunova_backend.settings')
import django  # noqa: E402
django.setup()

# (key, açıklama, script'in backend köküne göre göreli yolu, o script içindeki giriş fonksiyonu adı)
FEEDS = [
    ("catalog", "Seans Tipi Kataloğu (SessionOffering) - hiçbir app'e bağımlı değil",
     "catalog/tests/feed_catalog.py", "main"),
    ("accounts", "Temel kullanıcı/uzman/danışan verisi + isimlendirilmiş ekip hesapları (ZORUNLU)",
     "accounts/tests/feed_accounts.py", "main"),
    ("payments", "PricingRule/DiscountCode/PackageDefinition örnekleri (Faz 10)",
     "payments/tests/feed_payments.py", "main"),
    ("availability", "Uzmanların haftalık müsaitlik + istisna takvimi",
     "availability/tests/feed_availability.py", "create_availability_and_exceptions"),
    ("appointments", "Randevular + ekip çiftleri için hedefli senaryolar",
     "appointments/tests/feed_appointments.py", "main"),
    ("group_sessions", "GroupSession/GroupSessionParticipant/GroupSessionWaitlist örnekleri (Faz 10)",
     "appointments/tests/feed_group_sessions.py", "main"),
    ("messaging", "Uzman-danışan örnek sohbetler (Notlar özelliği)",
     "messaging/tests/feed_messaging.py", "main"),
    ("notifications", "Randevu hatırlatma bildirimlerini senkronize eder + okunma durumu çeşitlendirir",
     "notifications/tests/feed_notifications.py", "main"),
    ("forms", "Klinik tarama formları + örnek yanıtlar (⚠️ her çalıştığında mevcut form verisini SİLİP yeniden oluşturur)",
     "forms/tests/feed_forms.py", "create_sample_forms"),
]


def _load_and_run(key, relative_path, entry_func_name):
    script_path = os.path.join(BACKEND_DIR, relative_path)
    if not os.path.exists(script_path):
        print(f"❌ [{key}] script bulunamadı: {script_path}")
        return False

    module_name = f"_lunova_feed_{key}"
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

    entry = getattr(module, entry_func_name, None)
    if entry is None:
        print(f"❌ [{key}] '{entry_func_name}' fonksiyonu bulunamadı ({relative_path})")
        return False

    entry()
    return True


def print_summary():
    from accounts.models import User, ExpertProfile, ClientProfile, UserRole
    from appointments.models import Appointment, GroupSession, GroupSessionParticipant, GroupSessionWaitlist
    from availability.models import WeeklyAvailability, AvailabilityException
    from messaging.models import Conversation, Message
    from notifications.models import Notification
    from forms.models import Form, FormResponse
    from catalog.models import SessionOffering, SessionOfferingVariant
    from payments.models import DiscountCode, PackageDefinition, PricingRule

    print("\n" + "=" * 60)
    print("📊 Veritabanı Özeti")
    print("=" * 60)
    print(f"Seans Tipi Kataloğu    : {SessionOffering.objects.count()} "
          f"(aktif: {SessionOffering.objects.filter(is_active=True).count()}, "
          f"varyant: {SessionOfferingVariant.objects.count()})")
    print(f"Kullanıcılar          : {User.objects.count()} "
          f"(uzman: {User.objects.filter(role=UserRole.EXPERT).count()}, "
          f"danışan: {User.objects.filter(role=UserRole.CLIENT).count()}, "
          f"admin: {User.objects.filter(role=UserRole.ADMIN).count()})")
    print(f"Uzman/Danışan profili : {ExpertProfile.objects.count()} / {ClientProfile.objects.count()} "
          f"(atanmış danışan: {ClientProfile.objects.filter(expert__isnull=False).count()})")
    print(f"Fiyatlandırma/İndirim  : {PricingRule.objects.count()} PricingRule, "
          f"{DiscountCode.objects.count()} DiscountCode, {PackageDefinition.objects.count()} PackageDefinition")
    print(f"Randevular             : {Appointment.objects.count()}")
    print(f"Grup Seansları         : {GroupSession.objects.count()} "
          f"({GroupSessionParticipant.objects.count()} katılımcı, {GroupSessionWaitlist.objects.count()} bekleme listesi)")
    print(f"Haftalık müsaitlik     : {WeeklyAvailability.objects.count()} (+ {AvailabilityException.objects.count()} istisna)")
    print(f"Konuşmalar / Notlar    : {Conversation.objects.count()} / {Message.objects.count()}")
    print(f"Bildirimler            : {Notification.objects.count()} (okunmamış: {Notification.objects.filter(is_read=False).count()})")
    print(f"Formlar / Yanıtlar     : {Form.objects.count()} / {FormResponse.objects.count()}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Lunova backend ana veritabanı besleme script'i.")
    parser.add_argument(
        "--apps", type=str, default=None,
        help="Virgülle ayrılmış app listesi (örn: accounts,messaging). Belirtilmezse hepsi çalışır."
    )
    parser.add_argument("--skip-forms", action="store_true", help="forms feed'ini atla (Form/FormResponse verisini SİLMEZ).")
    parser.add_argument("--list", action="store_true", help="Sırayı ve script yollarını listele, hiçbir şey çalıştırma.")
    args = parser.parse_args()

    if args.list:
        print("Çalıştırma sırası:")
        for i, (key, desc, path, _) in enumerate(FEEDS, 1):
            print(f"  {i}. {key:14s} — {desc}\n{'':17s}({path})")
        return

    selected_keys = None
    if args.apps:
        selected_keys = {k.strip() for k in args.apps.split(",") if k.strip()}
        unknown = selected_keys - {f[0] for f in FEEDS}
        if unknown:
            print(f"❌ Bilinmeyen app adı/adları: {', '.join(sorted(unknown))}")
            print(f"   Geçerli değerler: {', '.join(f[0] for f in FEEDS)}")
            sys.exit(1)

    print("🌱🌱🌱 Lunova Backend - Tüm Veritabanı Besleme Süreci Başlatılıyor 🌱🌱🌱")
    print("=" * 60)

    ran, skipped, failed = [], [], []
    for key, desc, path, entry_func_name in FEEDS:
        if selected_keys is not None and key not in selected_keys:
            skipped.append(key)
            continue
        if key == "forms" and args.skip_forms:
            print(f"\n⏭️  [{key}] --skip-forms bayrağıyla atlandı.")
            skipped.append(key)
            continue

        print(f"\n{'#' * 60}")
        print(f"# [{key}] {desc}")
        print(f"{'#' * 60}")
        try:
            ok = _load_and_run(key, path, entry_func_name)
            (ran if ok else failed).append(key)
        except SystemExit as e:
            # Alt script'lerin kendi sys.exit(1) çağrılarını yakala, süreci
            # tamamen durdurma - diğer app'lerin beslemesi denenmeye devam etsin.
            if e.code not in (0, None):
                print(f"❌ [{key}] script hata ile sonlandı (exit code {e.code}).")
                failed.append(key)
            else:
                ran.append(key)
        except Exception as e:
            print(f"❌ [{key}] beklenmeyen hata: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            failed.append(key)

    print("\n" + "=" * 60)
    print(f"✅ Tamamlanan: {', '.join(ran) or '-'}")
    if skipped:
        print(f"⏭️  Atlanan: {', '.join(skipped)}")
    if failed:
        print(f"❌ Hata ile sonuçlanan: {', '.join(failed)}")

    print_summary()

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
