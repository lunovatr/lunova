"""
Database seeding script for notifications app.

notifications/, "kaynak" veri tutan bir app değil - Notification satırları
tamamen mevcut Appointment/Message verisinden SENKRONİZE edilir (bkz.
notifications/services.py::sync_appointment_reminders, normalde her
GET /notifications/ çağrısında sessizce çalışır; 'message' tipi bildirimler
ise messaging/views.py'nin POST akışında - ve bu proje için
messaging/tests/feed_messaging.py'de - anlık üretilir).

Bu script iki şey yapar:
1. Tüm kullanıcılar için sync_appointment_reminders()'ı tetikleyip, önümüzdeki
   3 gün içindeki onaylanmış randevular için normalde ilk bildirim ekranı
   açıldığında oluşacak 'appointment_reminder' bildirimlerini önceden üretir
   (idempotent - appointments/tests/feed_appointments.py'nin ürettiği
   NAMED_PAIR_APPOINTMENT_SCENARIOS'taki "upcoming_confirmed_in_days" alanlı
   çiftler için garanti bir bildirim üretir).
2. Bazı bildirimleri bilinçli olarak okunmuş/okunmamış ve "20 günden eski
   okunmuş" (bir sonraki GET'te otomatik silinecek, bkz.
   notifications/services.py::cleanup_old_read_notifications) durumlara
   ayırır - amaç, iki frontend'deki rozet sayacı ve otomatik temizlik
   davranışının gerçek veriyle gözle test edilebilmesi.

Sıralama önemli: appointments (ve mesaj bildirimleri için messaging) feed'leri
bu script'ten ÖNCE çalıştırılmalı - aksi halde senkronize edilecek randevu/not
bildirimi bulunmaz.
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
from datetime import timedelta

from django.utils import timezone

from accounts.models import User
from notifications.models import Notification
from notifications.services import sync_appointment_reminders


def seed_reminder_notifications():
    """Tüm kullanıcılar için randevu hatırlatmalarını senkronize eder -
    normalde ilk GET /notifications/ çağrısında olacak şeyi önceden yapar."""
    print("🌱 Tüm kullanıcılar için randevu hatırlatma bildirimleri senkronize ediliyor...")
    before = Notification.objects.filter(notification_type='appointment_reminder').count()

    users = list(User.objects.all())
    for user in users:
        sync_appointment_reminders(user)

    after = Notification.objects.filter(notification_type='appointment_reminder').count()
    print(f"✅ {users.__len__()} kullanıcı tarandı, {after - before} yeni 'appointment_reminder' bildirimi oluşturuldu (toplam: {after}).")


def seed_read_states(recent_ratio=0.35, stale_count=10):
    """Bazı bildirimleri okunmuş/okunmamış olarak işaretler - rozet sayacı ve
    20 günlük otomatik temizlik davranışının UI'da gözlemlenebilmesi için.

    - recent_ratio kadarı 'yakın zamanda okunmuş' (son 5 gün içinde) olur.
    - stale_count kadarı '20 günden eski okunmuş' olur - bir sonraki
      GET /notifications/ çağrısında cleanup_old_read_notifications()
      tarafından otomatik silinecektir (bu script'te bilinçli olarak
      silinmiyor, amaç bu davranışın canlı olarak gözlemlenebilmesi).
    """
    print("🌱 Bildirim okunma durumları test için çeşitlendiriliyor...")
    unread = list(Notification.objects.filter(is_read=False))
    random.shuffle(unread)
    now = timezone.now()

    recent_count = int(len(unread) * recent_ratio)
    recent_slice = unread[:recent_count]
    for notif in recent_slice:
        notif.is_read = True
        notif.read_at = now - timedelta(days=random.randint(0, 5), hours=random.randint(0, 23))
    Notification.objects.bulk_update(recent_slice, ['is_read', 'read_at'])

    remaining = unread[recent_count:]
    stale_slice = remaining[:min(stale_count, len(remaining))]
    for notif in stale_slice:
        notif.is_read = True
        notif.read_at = now - timedelta(days=random.randint(21, 45))
    Notification.objects.bulk_update(stale_slice, ['is_read', 'read_at'])

    print(f"✅ {len(recent_slice)} bildirim yakın zamanda okunmuş, {len(stale_slice)} bildirim 20 günden eski okunmuş "
          f"(bir sonraki bildirim ekranı açılışında otomatik silinecek) olarak işaretlendi.")


def main():
    print("🌱 Veritabanı Besleme Başlatılıyor (notifications app)...")
    print("=" * 60)

    try:
        seed_reminder_notifications()
        print("-" * 30)
        seed_read_states()

        print("\n" + "=" * 60)
        print(f"✅ Veritabanı Besleme Tamamlandı! Toplam Notification: {Notification.objects.count()}")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ Besleme sırasında kritik hata: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
