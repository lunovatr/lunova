"""
Database seeding script for appointments app
Run this script after migrations to populate initial appointment data
"""

import os
import sys
import django

# Script nereden çalıştırılırsa çalışsın, proje kökünü bul
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))  # script dizini
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../"))  # 2 seviye yukarı backend
sys.path.insert(0, BACKEND_DIR)

# Django ayarlarını yükle
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lunova_backend.settings')  # settings.py konumuna göre değiştir
django.setup()

import random
from datetime import date, time, datetime, timedelta
from appointments.models import Appointment
from accounts.models import User, UserRole

# Sample appointment notes
APPOINTMENT_NOTES = [
    "İlk görüşme - tanı değerlendirmesi",
    "Düzenli terapi seansı",
    "Aile terapisi oturumu",
    "Kriz müdahalesi",
    "İlerleme değerlendirmesi",
    "Son seans - bitirme görüşmesi",
    "Acil durum görüşmesi",
    "Online terapi seansı",
    "Grup terapisi hazırlığı",
    "İlaç tedavisi değerlendirmesi",
    "First consultation - diagnostic assessment",
    "Regular therapy session",
    "Family therapy session",
    "Crisis intervention",
    "Progress evaluation",
    "Final session - termination interview",
    "Emergency consultation",
    "Online therapy session",
    "Group therapy preparation",
    "Medication evaluation"
]

# Time slots for appointments (9 AM to 6 PM)
TIME_SLOTS = [
    time(9, 0), time(9, 30), time(10, 0), time(10, 30), time(11, 0), time(11, 30),
    time(12, 0), time(12, 30), time(13, 0), time(13, 30), time(14, 0), time(14, 30),
    time(15, 0), time(15, 30), time(16, 0), time(16, 30), time(17, 0), time(17, 30)
]


# ==============================================================================
# İsimlendirilmiş Ekip Çiftleri İçin Randevu Senaryoları
# ==============================================================================
# accounts/tests/feed_accounts.py::seed_named_team_accounts() tarafından
# oluşturulan <isim>@mail.com / danisan_<isim>@mail.com çiftleri için, aşağıdaki
# rastgele genel besleme fonksiyonlarının ÜSTÜNE, bilinçli olarak seçilmiş
# randevu senaryoları eklenir. Amaç: messaging/tests/feed_messaging.py'nin
# danışan mesaj kotasını (bkz. messaging/services.py::get_client_remaining_quota
# - kota, çiftin en son TAMAMLANMIŞ randevusunun bitiş zamanından itibaren
# sayılır) ve notifications/tests/feed_notifications.py'nin "3 gün içinde
# yaklaşan randevu" hatırlatmasını gerçek/öngörülebilir veri üzerinden
# gösterebilmesi. Her senaryo notes alanına "[Ekip Senaryosu]" etiketi koyar -
# bu hem script'in idempotent olmasını (yeniden çalıştırılınca aynı senaryu
# tekrar eklenmez) hem admin panelinde ayırt edilebilir olmayı sağlar.
NAMED_TEAM_MEMBERS = [
    "selin", "selen", "onur", "ece", "eslem", "gokcen", "niga", "mustafa", "yusuf",
]
TEAM_EMAIL_DOMAIN = "mail.com"
SCENARIO_TAG = "[Ekip Senaryosu]"

# completed_days_ago: None ise hiç tamamlanmış seans yok (kota penceresi baştan
#   itibaren sayılır) - varsa o kadar gün önce tamamlanmış bir seans oluşturulur.
# extra_completed_days_ago: ikinci, daha eski bir tamamlanmış seans (çok seanslı
#   geçmiş anlatısı için - kota hesabına etkisi yok, en son seans zaten geçerli).
# upcoming_confirmed_in_days: notifications'ın "3 gün içinde yaklaşan randevu"
#   penceresini test etmek için yakın gelecekte onaylanmış bir randevu.
# future_confirmed_in_days: hatırlatma penceresinin (3 gün) DIŞINDA, sadece
#   takvimde görünürlük için uzak gelecekte onaylanmış bir randevu.
# waiting_approval: henüz hiç seans yapılmamış, danışanın yeni randevu talep
#   ettiği (onay bekleyen) bir ilişkinin başlangıcını simüle eder.
NAMED_PAIR_APPOINTMENT_SCENARIOS = {
    "selin":   {"completed_days_ago": None, "upcoming_confirmed_in_days": 2},
    "selen":   {"completed_days_ago": 14, "upcoming_confirmed_in_days": 1},
    "onur":    {"completed_days_ago": 5},
    "ece":     {"waiting_approval_in_days": 4},
    "eslem":   {"completed_days_ago": 3, "extra_completed_days_ago": 30},
    "gokcen":  {"completed_days_ago": 20, "future_confirmed_in_days": 10},
    "niga":    {"completed_days_ago": 1},
    # NOT: upcoming_confirmed_in_days bilinçli olarak sadece 1-2 kullanılıyor
    # (3 değil) - notifications/services.py'deki "now <= appt_dt <= now+3gün"
    # penceresi, tam 3 gün sonrası + sabit bir saat kombinasyonunda script'in
    # çalıştırıldığı saate göre pencerenin dışına düşebiliyor (gün ortasında
    # çalıştırılırsa saat karşılaştırması sınırın az ötesine geçebilir) - 1-2
    # gün, script hangi saatte çalıştırılırsa çalıştırılsın güvenle içeride kalır.
    "mustafa": {"completed_days_ago": 7, "upcoming_confirmed_in_days": 2},
    "yusuf":   {"completed_days_ago": 2, "upcoming_confirmed_in_days": 1},
}


def _tagged_note():
    base = random.choice(APPOINTMENT_NOTES)
    return f"{SCENARIO_TAG} {base}"


def _create_scenario_appointment(expert, client, appointment_date, appointment_time, status, is_confirmed, with_zoom=False):
    already_exists = Appointment.objects.filter(
        expert=expert, client=client, status=status, notes__startswith=SCENARIO_TAG,
        date=appointment_date,
    ).exists()
    if already_exists:
        return None

    zoom_data = generate_zoom_data() if with_zoom else {}
    appointment = Appointment.objects.create(
        expert=expert,
        client=client,
        date=appointment_date,
        time=appointment_time,
        duration=45,
        status=status,
        is_confirmed=is_confirmed,
        notes=_tagged_note(),
        **zoom_data,
    )
    return appointment


def seed_named_team_appointments():
    """İsimlendirilmiş ekip çiftleri (bkz. NAMED_PAIR_APPOINTMENT_SCENARIOS)
    için, mesaj kotası ve bildirim hatırlatmalarını anlamlı kılacak randevu
    senaryolarını oluşturur. accounts feed'i çalıştırılmamışsa (isimlendirilmiş
    hesaplar yoksa) o çifti sessizce atlar."""
    print(f"🌱 {len(NAMED_PAIR_APPOINTMENT_SCENARIOS)} isimlendirilmiş ekip çifti için randevu senaryoları oluşturuluyor...")
    today = date.today()
    created = 0

    for name, scenario in NAMED_PAIR_APPOINTMENT_SCENARIOS.items():
        expert = User.objects.filter(email=f"{name}@{TEAM_EMAIL_DOMAIN}", role=UserRole.EXPERT).first()
        client = User.objects.filter(email=f"danisan_{name}@{TEAM_EMAIL_DOMAIN}", role=UserRole.CLIENT).first()
        if not expert or not client:
            print(f"  ⚠️ '{name}' için ekip hesapları bulunamadı - önce accounts/tests/feed_accounts.py çalıştırılmalı. Atlanıyor.")
            continue

        if scenario.get("completed_days_ago") is not None:
            appt_date = today - timedelta(days=scenario["completed_days_ago"])
            appt = _create_scenario_appointment(
                expert, client, appt_date, time(10, 0), "completed", True, with_zoom=True
            )
            if appt:
                created += 1
                print(f"  ✓ [{name}] tamamlanmış seans: {appt_date}")

        if scenario.get("extra_completed_days_ago") is not None:
            appt_date = today - timedelta(days=scenario["extra_completed_days_ago"])
            appt = _create_scenario_appointment(
                expert, client, appt_date, time(11, 0), "completed", True, with_zoom=True
            )
            if appt:
                created += 1
                print(f"  ✓ [{name}] (ek) daha eski tamamlanmış seans: {appt_date}")

        if scenario.get("upcoming_confirmed_in_days") is not None:
            appt_date = today + timedelta(days=scenario["upcoming_confirmed_in_days"])
            appt = _create_scenario_appointment(
                expert, client, appt_date, time(15, 0), "confirmed", True, with_zoom=True
            )
            if appt:
                created += 1
                print(f"  ✓ [{name}] yakın zamanda onaylı randevu (bildirim testi): {appt_date}")

        if scenario.get("future_confirmed_in_days") is not None:
            appt_date = today + timedelta(days=scenario["future_confirmed_in_days"])
            appt = _create_scenario_appointment(
                expert, client, appt_date, time(13, 0), "confirmed", True, with_zoom=True
            )
            if appt:
                created += 1
                print(f"  ✓ [{name}] uzak gelecekte onaylı randevu (takvim görünürlüğü): {appt_date}")

        if scenario.get("waiting_approval_in_days") is not None:
            appt_date = today + timedelta(days=scenario["waiting_approval_in_days"])
            appt = _create_scenario_appointment(
                expert, client, appt_date, time(9, 30), "waiting_approval", False
            )
            if appt:
                created += 1
                print(f"  ✓ [{name}] onay bekleyen ilk randevu talebi: {appt_date}")

    print(f"✅ Ekip randevu senaryoları tamamlandı. Yeni oluşturulan: {created}")


def get_experts_and_clients():
    """Get all experts and clients from database"""
    experts = list(User.objects.filter(role=UserRole.EXPERT))
    clients = list(User.objects.filter(role=UserRole.CLIENT))

    if not experts:
        print("❌ No experts found. Please run accounts db_feed.py first.")
        sys.exit(1)

    if not clients:
        print("❌ No clients found. Please run accounts db_feed.py first.")
        sys.exit(1)

    return experts, clients


def generate_random_date():
    """Generate a random date within the next 6 months"""
    today = date.today()
    max_date = today + timedelta(days=180)  # 6 months
    random_days = random.randint(0, 180)
    return today + timedelta(days=random_days)


def generate_zoom_data():
    """Generate mock Zoom meeting data"""
    meeting_id = f"zoom_{random.randint(100000000, 999999999)}"
    return {
        'zoom_meeting_id': meeting_id,
        'zoom_start_url': f"https://zoom.us/s/{meeting_id}",
        'zoom_join_url': f"https://zoom.us/j/{meeting_id}"
    }


def seed_pending_appointments(experts, clients, count=40):
    """Seed appointments with 'pending' status (expert created, waiting for confirmation)"""
    print(f"🌱 Seeding {count} pending appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='pending',
            is_confirmed=False,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else ""
        )

        print(f"✓ Pending appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date})")


def seed_waiting_approval_appointments(experts, clients, count=40):
    """Seed appointments with 'waiting_approval' status (client requested)"""
    print(f"🌱 Seeding {count} waiting approval appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='waiting_approval',
            is_confirmed=False,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else ""
        )

        print(f"✓ Waiting approval appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date})")


def seed_confirmed_appointments(experts, clients, count=60):
    """Seed appointments with 'confirmed' status"""
    print(f"🌱 Seeding {count} confirmed appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        # Some confirmed appointments have Zoom data
        zoom_data = {}
        if random.random() > 0.4:  # 60% chance of having Zoom data
            zoom_data = generate_zoom_data()

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='confirmed',
            is_confirmed=True,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else "",
            **zoom_data
        )

        zoom_status = "with Zoom" if zoom_data else "without Zoom"
        print(f"✓ Confirmed appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date}) {zoom_status}")


def seed_cancel_requested_appointments(experts, clients, count=20):
    """Seed appointments with 'cancel_requested' status"""
    print(f"🌱 Seeding {count} cancel requested appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='cancel_requested',
            is_confirmed=True,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else ""
        )

        print(f"✓ Cancel requested appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date})")


def seed_cancelled_appointments(experts, clients, count=20):
    """Seed appointments with 'cancelled' status"""
    print(f"🌱 Seeding {count} cancelled appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='cancelled',
            is_confirmed=False,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else ""
        )

        print(f"✓ Cancelled appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date})")


def seed_completed_appointments(experts, clients, count=20):
    """Seed appointments with 'completed' status (past dates)"""
    print(f"🌱 Seeding {count} completed appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            # Past dates for completed appointments
            today = date.today()
            past_days = random.randint(1, 90)  # Within last 3 months
            appointment_date = today - timedelta(days=past_days)
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        # Some completed appointments have Zoom data
        zoom_data = {}
        if random.random() > 0.3:  # 70% chance of having Zoom data for completed appointments
            zoom_data = generate_zoom_data()

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status='completed',
            is_confirmed=True,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else "",
            **zoom_data
        )

        zoom_status = "with Zoom" if zoom_data else "without Zoom"
        print(f"✓ Completed appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date}) {zoom_status}")


def seed_soft_deleted_appointments(experts, clients, count=10):
    """Seed soft deleted appointments"""
    print(f"🌱 Seeding {count} soft deleted appointments...")

    for i in range(count):
        expert = random.choice(experts)
        client = random.choice(clients)

        # Ensure no duplicate appointments for same expert-client-date-time
        while True:
            appointment_date = generate_random_date()
            appointment_time = random.choice(TIME_SLOTS)

            existing = Appointment.objects.filter(
                expert=expert,
                client=client,
                date=appointment_date,
                time=appointment_time
            ).exists()

            if not existing:
                break

        appointment = Appointment.objects.create(
            expert=expert,
            client=client,
            date=appointment_date,
            time=appointment_time,
            duration=random.choice([30, 45, 60]),
            status=random.choice(['pending', 'confirmed', 'cancelled']),
            is_confirmed=random.choice([True, False]),
            is_deleted=True,
            notes=random.choice(APPOINTMENT_NOTES) if random.random() > 0.3 else ""
        )

        print(f"✓ Soft deleted appointment created: {expert.get_full_name()} ↔ {client.get_full_name()} ({appointment_date})")


def main():
    """Main seeding function"""
    print("🌱 Starting appointments database seeding...")
    print("=" * 50)

    try:
        # Get experts and clients
        experts, clients = get_experts_and_clients()
        print(f"Found {len(experts)} experts and {len(clients)} clients")

        # İsimlendirilmiş ekip çiftleri için hedefli senaryolar (genel rastgele
        # beslemeden ÖNCE - mesaj kotası/bildirim testleri buna dayanıyor)
        seed_named_team_appointments()
        print("-" * 30)

        # Seed different types of appointments
        seed_pending_appointments(experts, clients, 40)
        print("-" * 30)
        seed_waiting_approval_appointments(experts, clients, 40)
        print("-" * 30)
        seed_confirmed_appointments(experts, clients, 60)
        print("-" * 30)
        seed_cancel_requested_appointments(experts, clients, 20)
        print("-" * 30)
        seed_cancelled_appointments(experts, clients, 20)
        print("-" * 30)
        seed_completed_appointments(experts, clients, 20)
        print("-" * 30)
        seed_soft_deleted_appointments(experts, clients, 10)
        print("-" * 30)

        # Count total appointments
        total_appointments = Appointment.objects.count()
        print(f"✅ Appointments database seeding completed! Total appointments: {total_appointments}")

    except Exception as e:
        print(f"❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()