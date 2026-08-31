"""
GroupSession / GroupSessionParticipant / GroupSessionWaitlist besleme (seed)
script'i (Faz 10, Frontend Yapılandırması planı) - "müsaitlik -> talep ->
onay -> ödeme" akışının yeni "Grup Seansları" (uzman) / "Grup Seanslarım"
(danışan) ekranlarının BOŞ görünmemesi için, isimlendirilmiş ekip
hesaplarından (accounts/tests/feed_accounts.py) örnek veri üretir.

Bilinçli olarak appointments/tests/feed_appointments.py'nin İÇİNE değil AYRI
bir dosyaya eklendi - o dosya zaten büyük/köklü, mevcut rastgele besleme
mantığına bağımlılık yaratmadan bağımsız çalıştırılabilir kalması tercih
edildi (planın kendi önerdiği iki seçenekten biri).

get_or_create ile idempotent - tekrar çalıştırılabilir. accounts (isimlendirilmiş
ekip hesapları) VE catalog (SessionOffering - group_therapy/psychoeducation_group
is_active=True) feed'lerinden SONRA çalıştırılmalı.
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

from datetime import date, timedelta

from accounts.models import User
from appointments.models import (
    GroupSession, GroupSessionParticipant, GroupSessionParticipantStatus,
    GroupSessionStatus, GroupSessionWaitlist,
)
from catalog.models import SessionOffering

# accounts/tests/feed_accounts.py::NAMED_TEAM_REAL_INFO ile SENKRON (bkz. o
# dosyanın notu) - bilinçli olarak import değil kopya (diğer feed
# script'leriyle aynı "bağımsız çalıştırılabilir" deseni).
EXPERT_EMAILS = {"yusuf": "yakcakaya@lunova.tr", "eslem": "esballi@lunova.tr"}
CLIENT_EMAILS = {
    "selin": "steke@lunova.tr", "selen": "sdarcan@lunova.tr",
    "ece": "etelli@lunova.tr", "samet": "sgultekin@lunova.tr",
}


def _get_or_create_group_session(*, expert, session_offering, days_ahead, hour, capacity, status=GroupSessionStatus.SCHEDULED):
    group_date = date.today() + timedelta(days=days_ahead)
    group_session, created = GroupSession.objects.get_or_create(
        expert=expert, session_offering=session_offering, date=group_date, time=f"{hour:02d}:00:00",
        defaults={"duration": 90, "capacity": capacity, "status": status},
    )
    marker = "✓ oluşturuldu" if created else "○ zaten mevcut"
    print(f"  {marker}: {session_offering.name} - {expert.get_full_name()} ({group_date})")
    return group_session


def _add_participant(group_session, client, status):
    participant, created = GroupSessionParticipant.objects.get_or_create(
        group_session=group_session, client=client,
        defaults={"status": status},
    )
    if not created and participant.status != status:
        participant.status = status
        participant.save(update_fields=["status"])
    marker = "✓ eklendi" if created else "○ zaten mevcut"
    print(f"    {marker}: {client.get_full_name()} -> {status}")
    return participant


def _add_waitlist(group_session, client):
    entry, created = GroupSessionWaitlist.objects.get_or_create(group_session=group_session, client=client)
    marker = "✓ eklendi" if created else "○ zaten mevcut"
    print(f"    {marker} (bekleme listesi): {client.get_full_name()}")
    return entry


def main():
    print("\n-- GroupSession / GroupSessionParticipant / GroupSessionWaitlist --")

    yusuf = User.objects.filter(email=EXPERT_EMAILS["yusuf"]).first()
    eslem = User.objects.filter(email=EXPERT_EMAILS["eslem"]).first()
    selin = User.objects.filter(email=CLIENT_EMAILS["selin"]).first()
    selen = User.objects.filter(email=CLIENT_EMAILS["selen"]).first()
    ece = User.objects.filter(email=CLIENT_EMAILS["ece"]).first()
    samet = User.objects.filter(email=CLIENT_EMAILS["samet"]).first()

    group_therapy = SessionOffering.objects.filter(code="group_therapy").first()
    psychoeducation_group = SessionOffering.objects.filter(code="psychoeducation_group").first()

    if not all([yusuf, selin, selen, ece, group_therapy]):
        print("  ⚠️  atlandı: gerekli isimlendirilmiş ekip hesapları/SessionOffering bulunamadı - "
              "önce 'python feed_db.py --apps accounts,catalog' çalıştırılmalı.")
        return

    # -- Grup A: kapasite dolu (2/2 approved) + 1 bekleme listesi kaydı --
    # Danışan tarafı: selin/selen "Aktif Gruplarım"da birbirini "grup arkadaşı"
    # olarak görür; ece "Bekleme Listesi"nde görünür.
    group_a = _get_or_create_group_session(
        expert=yusuf, session_offering=group_therapy, days_ahead=6, hour=14, capacity=2,
    )
    _add_participant(group_a, selin, GroupSessionParticipantStatus.APPROVED)
    _add_participant(group_a, selen, GroupSessionParticipantStatus.APPROVED)
    if not GroupSessionParticipant.objects.filter(group_session=group_a, client=ece).exists():
        _add_waitlist(group_a, ece)

    # -- Grup B: uzmanın panelinde incelemeyi bekleyen bir talep --
    # Uzman tarafı: eslem, "Grup Seansları" panelinde bir "Bekleyen Talep" görür
    # (Onayla/Reddet). eslem yoksa (ör. seed sırası bozulduysa) yusuf'a düşer.
    expert_b = eslem or yusuf
    offering_b = psychoeducation_group or group_therapy
    if offering_b is not None and samet is not None:
        group_b = _get_or_create_group_session(
            expert=expert_b, session_offering=offering_b, days_ahead=9, hour=11, capacity=6,
        )
        _add_participant(group_b, samet, GroupSessionParticipantStatus.PENDING_APPROVAL)


if __name__ == "__main__":
    main()
