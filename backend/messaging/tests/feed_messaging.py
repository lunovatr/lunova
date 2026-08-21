"""
Database seeding script for messaging app.

messaging/, klasik bir chat DEĞİL - eşleşen bir uzman-danışan çifti arasında
kompakt bir "not bırakma" hattı (bkz. messaging/models.py, messaging/services.py).
Bu script iki katmanlı örnek veri üretir:

1. İsimlendirilmiş ekip çiftleri (accounts/tests/feed_accounts.py::seed_named_team_accounts
   tarafından oluşturulan <isim>@mail.com / danisan_<isim>@mail.com çiftleri) için,
   danışan mesaj kotasının (bkz. messaging/services.py::get_client_remaining_quota -
   iki seans arası 5 hak, en son TAMAMLANMIŞ randevunun bitişinden itibaren sayılır)
   FARKLI durumlarını (taze/sıfırlanmış, kısmen kullanılmış, tükenmiş, hiç
   konuşulmamış vb.) gösterecek şekilde bilinçli olarak tasarlanmış senaryolar.
2. Genel havuzdaki (accounts/tests/feed_accounts.py'nin rastgele oluşturduğu ve
   bir uzmana atanmış) danışanlardan rastgele bir alt küme için, daha sade
   rastgele konuşmalar - roster/mesajlaşma ekranlarının tek tük değil, gerçekçi
   sayıda çiftte veri barındırmasını sağlamak için.

Randevu senaryoları (tamamlanmış seans tarihleri) appointments/tests/feed_appointments.py
içindeki seed_named_team_appointments() tarafından oluşturulur - bu script SADECE
o randevu verisini okuyup (aynı messaging/services.py mantığıyla) kota penceresini
hesaplar, appointments'a yeni bir randevu YAZMAZ. Bu yüzden appointments feed'i bu
script'ten ÖNCE çalıştırılmalıdır (aksi halde tüm ekip çiftleri "hiç tamamlanmış
seans yok" penceresiyle - yani konuşmanın başından itibaren - sayılır).
"""

import os
import sys
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../"))
sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lunova_backend.settings')
django.setup()

import random
from datetime import datetime, timedelta

from django.utils import timezone

from accounts.models import ClientProfile, User, UserRole
from appointments.models import Appointment
from messaging.models import Conversation, Message
from notifications.services import create_message_notification


TEAM_EMAIL_DOMAIN = "mail.com"
NAMED_TEAM_MEMBERS = [
    "selin", "selen", "onur", "ece", "eslem", "gokcen", "niga", "mustafa", "yusuf",
]

CLIENT_MESSAGE_POOL = [
    "Merhaba, bugünkü seansımız için biraz erken başlayabilir miyiz? Sabah bir işim çıktı.",
    "Geçen seanstan sonra kendimi daha rahat hissediyorum, teşekkür ederim.",
    "Bu hafta biraz zorlandım, seansta bunu konuşabilir miyiz?",
    "Randevu saatimi teyit etmek istedim, doğru hatırlıyor muyum?",
    "Verdiğiniz nefes egzersizini denedim, gerçekten işe yaradı.",
    "Bugün kendimi biraz endişeli hissediyorum, bu normal mi?",
    "Seans notlarınızı tekrar okudum, çok faydalı oldu.",
    "Ailemle aramızdaki konuşma planladığımız gibi gitmedi, konuşabilir miyiz?",
    "Uyku düzenim hâlâ düzensiz, önerdiğiniz rutini denemeye başladım.",
    "Teşekkürler, bu hafta kendimi çok daha iyi hissediyorum.",
    "Bir sonraki seansa kadar ne üzerinde çalışmalıyım?",
    "Zoom bağlantısında sorun yaşadım, tekrar gönderebilir misiniz?",
    "Bugün işte gergin bir gün geçirdim, aklımdan çıkmıyor.",
    "Önerdiğiniz kitabı okumaya başladım, çok yararlı buluyorum.",
    "Randevumu bir gün erteleyebilir miyiz?",
    "Duygu günlüğü tutmaya başladım, seansta paylaşmak isterim.",
    "Bugün kendimi iyi hissetmiyorum, seansı kısa tutabilir miyiz?",
    "Geri bildiriminiz için teşekkür ederim, çok anlamlıydı.",
    "Bu ara nefes alma tekniklerini uyguluyorum, faydasını görüyorum.",
    "Seans saatini hatırlatır mısınız, biraz kafam karıştı?",
]

EXPERT_MESSAGE_POOL = [
    "Merhaba, elbette. Seansı biraz öne alabiliriz, size uygun bir saat yazın.",
    "Rica ederim, bu ilerlemeyi görmek çok güzel. Böyle devam edelim.",
    "Tabii, bu hafta yaşadıklarınızı seansta detaylı konuşalım.",
    "Evet, randevu bilgileriniz doğru, bekliyorum.",
    "Harika, nefes egzersizinin işe yaradığını duymak sevindirici.",
    "Endişe hissi bu süreçte oldukça yaygın, seansta birlikte ele alalım.",
    "Sevindim, notların faydalı olması güzel. Başka sorunuz olursa yazabilirsiniz.",
    "Anlıyorum, bu konuşmayı bir sonraki seansta birlikte değerlendirelim.",
    "Uyku rutinini sürdürmeye devam edin, küçük adımlar önemli.",
    "Bu güzel bir haber, gelişiminizi görmek beni de mutlu ediyor.",
    "Bu hafta duygu günlüğünüzü sürdürmeye devam edin, seansta birlikte bakarız.",
    "Zoom bağlantısını birazdan tekrar gönderiyorum, kontrol edebilir misiniz?",
    "Gergin geçen günler oluyor, bunu bir sonraki seansta konuşalım.",
    "Kitaptan aldığınız notları seansa getirirseniz birlikte gözden geçiririz.",
    "Elbette, randevunuzu talep ettiğiniz güne alabiliriz.",
    "Duygu günlüğü çok değerli bir araç, seansta üzerinden geçelim.",
    "Kendinizi kötü hissettiğinizde yazmanız iyi oldu, seansı kısa tutabiliriz.",
    "Geri bildiriminiz benim için de değerli, teşekkür ederim.",
    "Bu teknikleri düzenli uygulamanız gerçekten fark yaratıyor.",
    "Randevu saatinizi hatırlattığınız için teşekkürler, orada olacağım.",
]

# Her isim için (pre, post_client, expert) - bkz. modül docstring'i.
# pre: kota penceresinden ÖNCEki (varsa) geçmiş mesaj sayısı (kotaya sayılmaz).
# post_client: kota penceresinden SONRA danışanın gönderdiği mesaj sayısı
#   (get_client_remaining_quota bunu sayar - "kalan hak" = 5 - post_client).
# expert: pencereden sonraki uzman mesajı sayısı (uzmanın hiçbir sınırı yok).
# None -> o çift için hiç Conversation/Message oluşturulmaz ("henüz hiç
#   mesajlaşılmamış" boş durumunu göstermek için bilinçli olarak boş bırakılır).
NAMED_PAIR_MESSAGE_SCENARIOS = {
    "selin":   {"pre": 0, "post_client": 2, "expert": 3},   # hiç seans yok -> kalan 3/5
    "selen":   {"pre": 3, "post_client": 5, "expert": 4},   # kalan 0/5 (tükenmiş, kırmızı border testi)
    "onur":    {"pre": 2, "post_client": 1, "expert": 2},   # kalan 4/5
    "ece":     None,                                         # hiç konuşma yok (boş durum testi)
    "eslem":   {"pre": 4, "post_client": 3, "expert": 5},   # kalan 2/5, çok seanslı geçmiş
    "gokcen":  {"pre": 0, "post_client": 2, "expert": 10},  # kalan 3/5, uzman yoğun kullanım
    "niga":    {"pre": 1, "post_client": 5, "expert": 1},   # kalan 0/5 (seans hemen sonrası tükenmiş)
    "mustafa": {"pre": 3, "post_client": 3, "expert": 3},   # kalan 2/5
    "yusuf":   {"pre": 5, "post_client": 0, "expert": 6},   # kalan 5/5, zengin uzman etkileşimi
}

RANDOM_POOL_SAMPLE_SIZE = 15


def _completed_session_end(expert_id, client_id):
    """messaging/services.py::_quota_window_start ile AYNI mantık - kasıtlı
    olarak burada tekrarlanıyor (o fonksiyon private/iç kullanım amaçlı,
    bu script sadece okuma/planlama için aynı hesaplamaya ihtiyaç duyuyor)."""
    last_completed = (
        Appointment.objects.filter(
            expert_id=expert_id,
            client_id=client_id,
            status="completed",
            is_deleted=False,
        )
        .order_by("-date", "-time")
        .first()
    )
    if not last_completed:
        return None
    naive = datetime.combine(last_completed.date, last_completed.time)
    start = timezone.make_aware(naive, timezone.get_default_timezone())
    return start + timedelta(minutes=last_completed.duration)


def _create_message(conversation, sender, body, created_at):
    message = Message.objects.create(conversation=conversation, sender=sender, body=body)
    Message.objects.filter(pk=message.pk).update(created_at=created_at)
    message.refresh_from_db()
    return message


def _seed_conversation(expert_user, client_user, pre, post_client, expert_count):
    """Verilen sayıda pre/post mesajını, gerçek kota penceresine (varsa en son
    tamamlanmış randevunun bitişi) göre zaman damgalarıyla oluşturur."""
    conversation, _ = Conversation.objects.get_or_create(expert=expert_user, client=client_user)
    if conversation.messages.exists():
        return conversation, False  # zaten seed edilmiş - idempotent, tekrar ekleme

    now = timezone.now()
    window_start = _completed_session_end(expert_user.id, client_user.id)

    post_total = post_client + expert_count
    if pre == 0 and post_total == 0:
        return conversation, False

    # Pencereden önceki (varsa) geçmiş mesajların zaman aralığı
    pre_anchor_end = (window_start - timedelta(hours=6)) if window_start else (
        now - timedelta(days=post_total + 3)
    )
    pre_start = pre_anchor_end - timedelta(days=max(pre, 1))

    # Pencereden sonraki (kotaya sayılan) mesajların zaman aralığı
    post_start = window_start if window_start else (now - timedelta(days=post_total + 1))
    if post_start < pre_anchor_end:
        post_start = pre_anchor_end
    post_end = now - timedelta(minutes=random.randint(20, 240))
    if post_end <= post_start:
        post_end = post_start + timedelta(hours=1)

    last_message = None
    client_used = set()
    expert_used = set()

    def _next_text(pool, used):
        available = [t for t in pool if t not in used] or pool
        text = random.choice(available)
        used.add(text)
        return text

    if pre:
        step = (pre_anchor_end - pre_start) / pre
        for idx in range(pre):
            dt = pre_start + step * (idx + 1)
            is_client_turn = idx % 2 == 1  # uzman başlatır, danışan yanıtlar deseni
            sender = client_user if is_client_turn else expert_user
            pool, used = (CLIENT_MESSAGE_POOL, client_used) if is_client_turn else (EXPERT_MESSAGE_POOL, expert_used)
            last_message = _create_message(conversation, sender, _next_text(pool, used), dt)

    # Pencereden sonraki mesajları uzman/danışan sırasıyla iç içe geçir
    post_events = []
    ci = ei = 0
    while ci < post_client or ei < expert_count:
        if ei < expert_count:
            post_events.append("expert")
            ei += 1
        if ci < post_client:
            post_events.append("client")
            ci += 1

    if post_events:
        step = (post_end - post_start) / len(post_events)
        for idx, role in enumerate(post_events):
            dt = post_start + step * (idx + 1)
            sender = client_user if role == "client" else expert_user
            pool, used = (CLIENT_MESSAGE_POOL, client_used) if role == "client" else (EXPERT_MESSAGE_POOL, expert_used)
            last_message = _create_message(conversation, sender, _next_text(pool, used), dt)
            # Gerçek POST akışında (messaging/views.py) her mesaj alıcı için bir
            # bildirim üretir - feed verisinin bildirim ziliyle tutarlı olması için
            # burada da aynı fonksiyon çağrılıyor.
            create_message_notification(last_message)

    if last_message:
        conversation.last_message_at = last_message.created_at
        conversation.save(update_fields=["last_message_at"])

    return conversation, True


def seed_named_team_conversations():
    print(f"🌱 {len([s for s in NAMED_PAIR_MESSAGE_SCENARIOS.values() if s])} isimlendirilmiş ekip çifti için örnek sohbetler oluşturuluyor...")
    created = 0
    for name, scenario in NAMED_PAIR_MESSAGE_SCENARIOS.items():
        expert = User.objects.filter(email=f"{name}@{TEAM_EMAIL_DOMAIN}", role=UserRole.EXPERT).first()
        client = User.objects.filter(email=f"danisan_{name}@{TEAM_EMAIL_DOMAIN}", role=UserRole.CLIENT).first()
        if not expert or not client:
            print(f"  ⚠️ '{name}' için ekip hesapları bulunamadı - önce accounts/tests/feed_accounts.py çalıştırılmalı. Atlanıyor.")
            continue

        if scenario is None:
            print(f"  ○ [{name}] bilinçli olarak boş bırakıldı (hiç mesajlaşılmamış durum testi)")
            continue

        conversation, was_created = _seed_conversation(
            expert, client, scenario["pre"], scenario["post_client"], scenario["expert"]
        )
        if was_created:
            created += 1
            print(f"  ✓ [{name}] sohbet oluşturuldu ({scenario['post_client']} danışan / {scenario['expert']} uzman mesajı, pencere sonrası)")
        else:
            print(f"  ○ [{name}] sohbet zaten mevcut, atlanıyor")

    print(f"✅ Ekip sohbetleri tamamlandı. Yeni oluşturulan: {created}")


def seed_random_matched_conversations(sample_size=RANDOM_POOL_SAMPLE_SIZE):
    """Genel (rastgele oluşturulmuş, bir uzmana atanmış) danışan havuzundan
    rastgele bir alt küme için sade örnek konuşmalar - roster ekranlarının
    sadece ekip çiftleriyle sınırlı kalmaması için."""
    named_client_emails = {f"danisan_{name}@{TEAM_EMAIL_DOMAIN}" for name in NAMED_TEAM_MEMBERS}
    candidates = list(
        ClientProfile.objects.filter(expert__isnull=False)
        .exclude(user__email__in=named_client_emails)
        .select_related("user", "expert__user")
    )
    if not candidates:
        print("  ⚠️ Rastgele eşleşmiş danışan bulunamadı - accounts/appointments feed'leri önce çalıştırılmalı.")
        return

    sample = random.sample(candidates, min(sample_size, len(candidates)))
    print(f"🌱 Genel havuzdan {len(sample)} rastgele eşleşmiş çift için örnek sohbet oluşturuluyor...")

    created = 0
    for client_profile in sample:
        expert_user = client_profile.expert.user
        client_user = client_profile.user
        post_client = random.randint(0, 5)
        expert_count = random.randint(0, 4)
        if post_client == 0 and expert_count == 0:
            continue
        conversation, was_created = _seed_conversation(expert_user, client_user, 0, post_client, expert_count)
        if was_created:
            created += 1

    print(f"✅ Rastgele eşleşmiş çift sohbetleri tamamlandı. Yeni oluşturulan: {created}")


def main():
    print("🌱 Veritabanı Besleme Başlatılıyor (messaging app)...")
    print("=" * 60)

    try:
        seed_named_team_conversations()
        print("-" * 30)
        seed_random_matched_conversations()

        print("\n" + "=" * 60)
        print(f"✅ Veritabanı Besleme Tamamlandı! Toplam Conversation: {Conversation.objects.count()}, Toplam Message: {Message.objects.count()}")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ Besleme sırasında kritik hata: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
