# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır (dokümantasyon bakım kuralları da orada — kısaca: `backend/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-20, 15. tur) — Mesaj Sınırlaması Saatlik Throttle'dan Seans-Bazlı Kotaya Çevrildi
> 14. turda eklenen `messaging/` app'i saatte 30 mesaj şeklinde zaman-bazlı bir `ScopedRateThrottle` kullanıyordu. Kullanıcı bunu, iki seans arasında toplam 5 mesaj hakkı (her seans TAMAMLANDIĞINDA yeniden dolan) şeklinde seans-bazlı bir kotaya çevirmemizi istedi — ayrıca danışan tarafında dinamik kalan-hak göstergesi, hak bittiğinde kırmızı uyarı, danışan için 200 karakter limiti (uzman sınırsız, 1000 kalıyor), ve her iki frontend'de gönderilmemiş taslakların localStorage'da korunmasını istedi. Frontend detayı: `client/claude.md`/`expert/claude.md`'nin 16./15. tur girdileri.
> - **`ScopedRateThrottle` tamamen kaldırıldı** — `messaging/views.py`'den throttle importu/`get_throttles()` silindi, `settings.py`'deki `DEFAULT_THROTTLE_RATES` dict'i (sadece bu amaçla eklenmişti) temizlendi. Proje genelinde hâlâ hiçbir zaman-bazlı rate limiting yok (bkz. aşağıdaki "Bilinen Gerçek Sorunlar" madde 5 — bu turda geri alındı).
> - **Yeni `messaging/services.py` → `get_client_remaining_quota(expert_id, client_id)`**: DB'de ayrı bir "kota" alanı/modeli YOK, tamamen hesaplanıyor. `_quota_window_start()` bu çiftin en son `status='completed'` randevusunun BİTİŞ zamanını (`date`+`time`+`duration` — `notifications/services.py`'deki `_appointment_datetime()` deseniyle aynı `timezone.make_aware` yaklaşımı) bulur; hiç tamamlanmış randevu yoksa `None` (konuşmanın başından itibaren say). `Message.objects.filter(sender_id=client_id, created_at__gte=window_start)` sayılıp `5 - used` (min 0) döner. Bu tasarım "her seans sonrası yenilenir" davranışını EK bir alan/cron olmadan, sadece var olan `Appointment`/`Message` verisinden türetiyor — `notifications`'ın "computed, sync-on-GET" felsefesiyle tutarlı.
> - **`messaging/views.py` → `ConversationMessagesView`**: GET/POST yanıt şekli değişti — artık `{"messages": [...], "client_quota": {"remaining": N, "limit": 5}}` (önceden GET düz bir dizi dönüyordu, POST düz bir mesaj objesi — **breaking change**, iki frontend de buna göre güncellendi). POST'ta iki ayrı sunucu-taraflı kontrol EKLENDİ (frontend'in `maxLength`/disable'ını bypass edip doğrudan API'ye istek atan biri için de geçerli): (1) danışan için karakter limiti artık 200 (uzman hâlâ `Message.MAX_LENGTH=1000`) — aşılırsa `400 {"code": "message_too_long"}`; (2) danışan için kota kontrolü — `remaining<=0` ise mesaj hiç oluşturulmadan `403 {"code": "quota_exceeded", "client_quota": {...}}`. Uzman gönderiminde HİÇBİR sınır kontrolü yok (kullanıcı talebi: "uzmanın herhangi bir mesaj sınırı yoktur").
> - **`ConversationListView` (expert roster)**: her satıra `client_quota` eklendi — expert danışanının kalan hakkını sekmeye girmeden roster'da görebiliyor.
> - **Doğrulama — 10 senaryo, `APIRequestFactory` ile gerçek verilerle, gerçekten çalıştırılarak**: (1) taze konuşma → 5/5; (2) 5 danışan mesajı → sırasıyla 4,3,2,1,0; (3) 6. mesaj → `403 quota_exceeded`; (4) GET'in 0/5'i doğru yansıttığı; (5) uzman mesajının danışanın kotasını ETKİLEMEDİĞİ; (6) 201 karakterlik danışan mesajının `400 message_too_long` aldığı (uzunluk limitinin sunucu taraflı, frontend'den bağımsız çalıştığı); (7) uzmanın 500 karakter gönderebildiği; (8) gerçek bir `completed` randevu oluşturulunca kotanın 5/5'e SIFIRLANDIĞI (randevu bitiş zamanından ÖNCEki mesajların yeni pencereye sayılmadığı); (9) sıfırlama sonrası yeni bir mesajın kotayı doğru tükettiği (4/5); (10) roster'ın her satırda doğru `client_quota` döndürdüğü. Test verisi (kullanılan çift, kullanıcının UI'da GERÇEKTEN mesajlaştığı `expert10`/`client2` çiftinden BİLİNÇLİ olarak farklı, dokunulmadı) sonra temizlendi. `manage.py check` temiz, migration gerekmedi (tamamen hesaplanan bir kota, yeni model alanı yok).

> ## 🔧 Son Değişiklikler (2026-08-20, 14. tur) — Yeni Özellik: Uzman-Danışan Not/Mesaj Sistemi + Bildirim Zili Entegrasyonu
> Kullanıcı, eşleşen her uzman-danışan çifti için klasik canlı chat DEĞİL, kompakt bir "not bırakma" sistemi istedi: "yazıyor" gibi canlı bir mekanizma yok, mesajlar sayfa yenileme/polling ile gelir. Amaç, seans öncesi/sonrası bilgilendirme — randevu oluştururken girilen seansa özgü `notes` alanından AYRI, iletişimin görüntülü görüşmeyle sınırlı kalmaması. Karakter limiti ve gönderim sıklığı limiti bilinçli olarak istendi (ileride seans başına kota gelecek — bu turda kota YOK). Frontend tarafı için bkz. `client/claude.md`/`expert/claude.md`'nin 14. tur girdileri.
> - **Yeni `messaging/` app** — `Conversation` (expert/client User FK'ları, `UniqueConstraint(expert,client)`, `last_message_at`) + `Message` (`body` = `CharField(max_length=1000)` — karakter limiti DB seviyesinde de zorlanıyor, `is_read`/`read_at`). `Conversation` satırı SADECE ilk mesaj gönderiminde (`get_or_create`) oluşuyor — GET'te oluşturulmuyor, hiç mesajlaşmamış çiftler için boş satır birikmiyor.
> - **`other_user_id` HER ZAMAN `User.id`** (`GET/POST /api/v1/messaging/conversations/<other_user_id>/messages/`) — 13. turda `forms/views.py`'de bulunan `ClientProfile.id`/`User.id` çakışma bug'ının tekrarlanmaması için bilinçli bir tasarım kararı, kod içinde bu tutarlılığa açıkça atıf yapan bir yorumla belirtildi. Expert için `other_user_id` bir client'ın `User.id`'si (atanmışlık `get_object_or_404(ClientProfile, user_id=...)` + `.expert==` kontrolüyle doğrulanıyor), client için kendi atanmış uzmanının `User.id`'si olmalı — aksi 403.
> - **Gönderim sıklığı limiti — projede İLK KEZ kullanılan DRF `ScopedRateThrottle`**: `settings.py` → `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {'messaging_send': '30/hour'}` — sadece `ConversationMessagesView.post()` bu scope'u kullanıyor (`get_throttles()` override edilip SADECE POST'ta `ScopedRateThrottle` döndürülüyor, GET serbest), global bir `DEFAULT_THROTTLE_CLASSES` YOK — bu yüzden başka HİÇBİR endpoint etkilenmiyor (bkz. aşağıdaki "Bilinen Gerçek Sorunlar" madde 5 güncellemesi). Kullanıcı başına, tüm konuşmaları kapsayan tek bir bütçe (konuşma bazlı ayrı bir cooldown katmanı yok, bilinçli olarak basit tutuldu).
> - **Dormant gap düzeltmesi — `accounts/serializers/profileSerializers.py` → `ClientProfileSerializer.get_expert()`**: önceden sadece `full_name`/`title` dönüyordu, `id` HİÇ yoktu — ama `client/src/types/profile.types.ts`'deki `ProfileResponse.expert` tipi zaten `id: number` bekliyordu (hiçbir kod bunu okumadığı için fark edilmemiş, gerçek bir çalışma zamanı hatası hiç üretmemiş "uyuyan" bir eksiklikti). Artık `"id": obj.expert.user_id` dönüyor — client'ın kendi uzmanının `User.id`'sini öğrenip mesajlaşma endpoint'ine sembolik olarak expert tarafıyla aynı şekilde (her yerde `User.id`) gidebilmesi için gerekliydi.
> - **Bildirim zili entegrasyonu (kullanıcı onayıyla, ayrı bir Faz olarak)**: `notifications/models.py` → `Notification.notification_type` choices'e `('message', 'Yeni Not')` eklendi; yeni nullable `related_user` FK (generic "bu bildirim kimle ilgili" işaretçisi — `appointment_reminder` türü `appointment` FK'sini kullanmaya devam ediyor, `message` türü `related_user`'ı kullanıyor). Yeni `notifications/services.py` → `create_message_notification(message)` — mesaj oluşturulduktan hemen sonra `messaging/views.py`'den çağrılıyor, alıcı için `dedupe_key=f"message:{message.id}"` ile idempotent bir bildirim oluşturuyor (duck-typed parametre — `messaging`'in `notifications`'ı import etmesi gerektiği için ters yönlü bir döngüsel import'tan kaçınmak amacıyla type-hint bilinçli olarak eklenmedi).
> - **Migration**: `messaging.0001_initial` (yeni app) + `notifications.0002_notification_related_user_and_more` (choices genişletme + yeni FK) — ikisi de `manage.py migrate` ile sorunsuz uygulandı, `makemigrations --check --dry-run` sonrasında "No changes detected".
> - **Doğrulama — tamamı gerçek DB verisiyle, `APIRequestFactory` ile gerçekten çalıştırılarak**: gerçek bir atanmış expert/client çifti (`user_id=11`/`user_id=18`) kullanılarak: (a) alakasız bir expert'in erişim denemesi → 403, (b) atanmış expert'in gönderimi → 201 + alıcı için doğru `notification_type='message'`/`related_user_id` ile bir `Notification` oluştuğu, (c) `create_message_notification()`'ın aynı mesaj için tekrar çağrılmasının duplicate ÜRETMEDİĞİ (idempotency), (d) client GET'inin mesajları doğru sırada döndürüp karşı tarafın mesajlarını `is_read=True` yaptığı, (e) client'ın kendi uzmanı olmayan birine erişim denemesi → 403, (f) client'ın yanıtının da aynı şekilde expert için bildirim ürettiği, (g) 1000 karakteri aşan/boş body → 400, (h) roster endpoint'inin (`GET /api/v1/messaging/conversations/`) doğru `last_message`/`unread_count` döndürdüğü ve client için 403 verdiği, (i) 30/hour throttle'ın TAM 31. istekte (0-indeksli 30. iterasyon) `429` verdiği doğrulandı. `manage.py check` temiz. **Frontend gerçek tarayıcıda tıklanarak test edilmedi** (bu ortamda hâlâ tarayıcı otomasyon aracı yok — projenin tüm turlarındaki tutarlı desen), sadece `tsc`/`vite build` ile doğrulandı (bkz. `client/claude.md`/`expert/claude.md`).

> ## 🔧 Son Değişiklikler (2026-08-20, 13. tur) — 🔴 Kritik: `forms/views.py` Client ID Çakışma Bug'ı Düzeltmesi
> Kullanıcı, expert panelindeki "Danışan Formları" ekranını dropdown yerine bir matris (danışan × form, dolu/boş işaretli) tabloya çevirmeyi istedi (bkz. `expert/claude.md`'nin 12. tur girdisi). Bu değişikliği gerçek backend verisiyle doğrularken (matris HER danışan için ayrı bir `GET /forms/clients/<id>/form-responses/` çağrısı yapıyor), gerçekten atanmış bir danışan için beklenmedik bir `403` alındı — kod okuması, önceden fark edilmemiş, gerçek ve ciddi bir bug ortaya çıkardı.
> - **Kök neden**: `FormClientResponsesView` ve `FormClientResponseDetailView`, URL'deki `client_id`'yi ÖNCE `ClientProfile.id` olarak yorumlamayı DENİYORDU, sadece o başarısız olursa `User.id` olarak deniyordu. Ama tek gerçek çağıran taraf (`expert/src/features/client-forms/api.ts`, `MyClient.user_id` — `GET /accounts/clients/`'ten gelir) HER ZAMAN `User.id` gönderiyor. `ClientProfile.id` ve `User.id` iki AYRI auto-increment dizisi olduğundan, gönderilen `User.id` sayısal olarak TAMAMEN ALAKASIZ bir `ClientProfile`'ın kendi PK'sıyla çakışabiliyor — ve öncelik sırası yüzünden view bu YANLIŞ, alakasız profili kullanıyordu. Gerçek DB'de bu turda TEYİT EDİLDİ: `user_id=18` olan bir danışan için `ClientProfile.id=18` olan BAŞKA (`expert_id=12`'ye atanmış) bir danışan profili çakışıyordu — istek atan expert `expert_id=10`'a ait olduğu için sonuç bir 403'tü (en iyi ihtimal). **En kötü ihtimalde** (çakışan profil TESADÜFEN AYNI expert'e atanmışsa) bu bug, bir danışanın klinik form cevaplarını/risk seviyesini BAŞKA bir danışanın adı altında sessizce göstermiş olabilirdi — bu yüzden 🔴 Kritik.
> - **Düzeltme**: İki view'da da belirsiz "önce dene, olmazsa dene" mantığı kaldırılıp doğrudan `get_object_or_404(ClientProfile, user_id=client_id)` ile tek, net bir sorguya indirildi (`FormResponse` filtreleri de `user_id=client_id` kullanacak şekilde güncellendi). Artık `client_id` her zaman ve sadece `User.id` olarak yorumlanıyor - belirsizlik/çakışma riski yapısal olarak ortadan kalktı.
> - **Doğrulama — gerçek DB verisiyle, gerçekten çalıştırılarak**: `APIRequestFactory` ile önce bug'ın gerçekten tetiklendiği (yanlış 403) doğrulandı; düzeltme sonrası AYNI istek `200` + doğru response listesi döndü; alakasız bir expert'in AYNI danışana erişmeye çalışması hâlâ doğru şekilde `403` alıyor (yetki kontrolünün kendisi bozulmadı); `FormClientResponseDetailView` için de aynı senaryo tekrarlanıp `200` + doğru `user_info.full_name`/`risk_level`/`total_score` doğrulandı. `manage.py check` temiz.

> ## 📜 Daha Eski Turlar (2026-08-20, 12. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" listesinde ✅ maddeleri olarak duruyor (global bildirim sistemi eklendi [12. tur], danışan formları otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], CSRF koruması [5. tur], AvailabilityExceptionView serializer düzeltmesi [4. tur], access token refresh [3. tur], ProfileView write/read-serializer tutarsızlığı + `timezone` alanı eksikliği [devam turu], login/me `id`/`role` eksikliği + danışanın kendi talebini geri çekebilmesi [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- backend/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 12. tur — Yeni Özellik: Global Bildirim Sistemi
> - 2026-08-19, 11. tur — Danışan Formları: Otomatik Versiyonlama + Kritik Skorlama Hatası Düzeltmesi
> - 2026-08-19, 10. tur — Zoom Mock URL Placeholder Düzeltmesi
> - 2026-08-17, 5. tur — CSRF Koruması
> - 2026-08-17, 4. tur — AvailabilityExceptionView.delete() Serializer Düzeltmesi
> - 2026-08-17, 3. tur — Access Token Refresh Mekanizması
> - 2026-08-17, devam — Profil Düzenleme + Yerel Ortam
> - 2026-08-17 — Randevu Zinciri
>
> </details>

## 📋 Hızlı Başlangıç

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt

# .env dosyası repo'da YOK ve örnek (.env.example) da YOK.
# backend/README.md "başlangıç kitini incele" diyor — gerekli değişkenler
# (aşağıdaki "Zorunlu Environment Variables" bölümüne bakın) elle oluşturulmalı.

python manage.py migrate
python accounts/tests/feed_accounts.py    # SQLite için TEK gereken script (zorunlu temel veri)
# PostgreSQL kullanıyorsan ayrıca:
python availability/tests/feed_availability.py
python appointments/tests/feed_appointments.py
python forms/tests/feed_forms.py

python manage.py runserver     # http://localhost:8000/  , admin: /admin/
```

## 🏗️ Gerçek Dosya Yapısı

```
backend/
├── accounts/
│   ├── models.py           → User, AdminProfile, ExpertProfile, ClientProfile, Document,
│   │                          Service, Language, University, DegreeLevel, Major,
│   │                          Specialization, ApproachMethod, TargetGroup, SessionType,
│   │                          AddictionType, EmergencyContact  (14 model — zengin taksonomi)
│   ├── views/views.py      → Register (expert/client/admin), Login, Logout, Me,
│   │                          ExpertList, ClientList, PasswordReset(Request/Confirm)
│   ├── views/profile.py    → ProfileView (GET/PATCH)
│   ├── views/document_views.py → DocumentListCreate, DocumentPresignUpload, DocumentDelete
│   ├── authentication.py   → CookieJWTAuthentication (cookie veya header'dan token okur)
│   ├── permissions.py, storage/{base,supabase,mock,factory}.py
│   └── tests/               → test_accounts_complete.py, feed_accounts.py (gerçek script adı)
│
├── appointments/            ⭐ En iyi dokümante edilmiş app — README.md ve ENDPOINTS.md
│   │                          kod ile satır satır örtüşüyor, örnek alınmalı.
│   ├── models.py            → Appointment (expert/client User FK'ları, 6 durumlu status)
│   ├── views.py              → status_update içinde geçiş matrisi + Zoom meeting tetikleme
│   └── permissions.py        → IsExpertOrClientForCreatePermission, IsAppointmentParticipantPermission,
│                                IsAppointmentExpertPermission, IsAppointmentClientPermission
│
├── availability/
│   ├── models.py            → WeeklyAvailability (UniqueConstraint + CheckConstraint VAR),
│   │                          AvailabilityException, AppointmentSlot (kullanılmayan/opsiyonel model)
│   └── views.py              → WeeklyAvailabilityView.put()/.delete() slot birleştirme/bölme mantığı
│                                (basit CRUD değil, kayda değer iş mantığı içeriyor)
│
├── zoom/
│   ├── services.py           → get_zoom_access_token(), create_zoom_meeting() (Server-to-Server OAuth);
│   │                          create_mock_zoom_meeting(appointment_id) (10. tur, YENİ) — dev/mock ortamda
│   │                          gerçek görünümlü `https://zoom.us/j/<10-haneli-id>` formatında placeholder
│   │                          döndürür (önceden appointments/views.py ve serializers.py'de ayrı ayrı
│   │                          literal `"mock url"` string'i tekrarlanıyordu, artık tek paylaşılan fonksiyon)
│   ├── urls.py                → SADECE POST /meetings/ (create_zoom_meeting fonksiyon view'ı)
│   └── (appointments/views.py VE appointments/serializers.py bu servisleri doğrudan import edip
│       çağırıyor — bağımsız REST kaynağı değil, appointments'a sıkı bağımlı)
│
├── forms/                    ⭐ Tam işlevsel klinik form/skorlama motoru (DAST-10, SDS, genel sağlık)
│   ├── models.py              → Form.calculate_risk_level(), Answer.calculate_score() otomatik hesaplama;
│   │                          Form.group_key/version (11. tur, YENİ) - versiyonlama alanları
│   ├── versioning.py           (11. tur, YENİ) → form_has_responses(), get_latest_version(),
│   │                          fork_form_version() - detay için aşağıdaki "11. tur" changelog girişine bakın
│   ├── admin.py                → VersionForkAdminMixin (11. tur, YENİ) - Form/Question/QuestionOption
│   │                          admin'lerini otomatik versiyonlama ile korur; FormResponse/Answer zaten
│   │                          adminden tamamen gizli (has_module_permission/has_view_permission False)
│   └── views.py                → Client ve Expert için ayrı response görünümleri, rol bazlı yetki
│
├── notifications/             (12. tur, YENİ; 14. turda genişletildi) → Bildirim sistemi
│   ├── models.py               → Notification (user, notification_type — 'appointment_reminder'|'message',
│   │                          dedupe_key, appointment FK, related_user FK [14. tur, YENİ - 'message' türü
│   │                          için], is_read/read_at) - UniqueConstraint(user, dedupe_key) idempotency temeli
│   ├── services.py              → sync_appointment_reminders() (3 gün içindeki confirmed randevular için
│   │                          get_or_create ile bildirim üretir - job scheduler YOK, her GET'te çalışır),
│   │                          cleanup_old_read_notifications() (20 günden eski okunmuşları siler),
│   │                          create_message_notification() (14. tur, YENİ - messaging/views.py'den çağrılır)
│   └── views.py                 → NotificationListView (GET, sync+cleanup tetikler), NotificationMarkReadView (PATCH)
│
├── messaging/                 (14. tur, YENİ) → Uzman-danışan not/mesaj sistemi (klasik chat DEĞİL)
│   ├── models.py               → Conversation (expert/client User FK, UniqueConstraint(expert,client),
│   │                          last_message_at) + Message (body=CharField(max_length=1000), is_read/read_at)
│   │                          - Conversation SADECE ilk mesaj gönderiminde (get_or_create) oluşur, GET'te değil
│   ├── services.py              (15. tur, YENİ) → get_client_remaining_quota() - danışanın seans-bazlı
│   │                          not hakkını (iki seans arası 5, her tamamlanan seans sonrası yenilenir)
│   │                          Appointment+Message verisinden HESAPLAR, ayrı bir "kota" modeli/alanı yok
│   └── views.py                 → ConversationMessagesView (GET/POST /conversations/<other_user_id>/messages/,
│   │                          other_user_id HER ZAMAN User.id - bkz. 13. tur'un client_id dersi; yanıt şekli
│   │                          {"messages":[...],"client_quota":{...}}); danışan için body>200 karakter veya
│   │                          quota.remaining<=0 ise sunucu taraflı 400/403 (uzmanın hiçbir sınırı yok);
│   │                          ConversationListView (GET /conversations/, sadece expert - roster/unread/quota özeti)
│
├── api/v1/urls.py            → accounts/, zoom/, appointments/, forms/, availability/, notifications/, messaging/ include'ları
├── lunova_backend/settings.py
├── requirements.txt           (Docker altyapısı eklenirken UTF-8'e çevrildi - önceki "UTF-16" notu eskiydi,
│                          bkz. kök claude.md; hâlâ kullanılmayan `rest-framework-simplejwt==0.0.2` satırı var)
├── db.sqlite3
└── .github/CODEOWNERS         ← CI workflow YOK, sadece CODEOWNERS var
```

## 🔐 Authentication (doğrulanmış davranış)

```python
# accounts/authentication.py — gerçek kod
class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = self.get_raw_token(header) if header else request.COOKIES.get('access_token')
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
            if BlacklistedToken.objects.filter(token__jti=validated_token['jti']).exists():
                return None
            return self.get_user(validated_token), validated_token
        except Exception:
            return None
```

**SIMPLE_JWT gerçek değerleri** (`settings.py`) — **[2026-08-17'de güncellendi]**:
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=1),   # önceden 7 gündü; artık idle-timeout mekanizması olarak kullanılıyor
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```
✅ **`accounts/urls.py` içinde artık `token/refresh/` endpoint'i VAR** (`TokenRefreshView`, `accounts/views/views.py`). `ROTATE_REFRESH_TOKENS=True` ayarı artık gerçekten tetikleniyor: her başarılı refresh çağrısı `rest_framework_simplejwt.serializers.TokenRefreshSerializer` üzerinden eski refresh token'ı blacklist'e alıp (jti/exp/iat rotasyonuyla) yenisini üretiyor. Cookie set etme mantığı `set_auth_cookies(response, access_token, refresh_token)` adlı ortak bir helper'a taşındı (`LoginView` de artık bunu kullanıyor) — süreler `settings.SIMPLE_JWT`'den okunuyor, tek doğruluk kaynağı.

`REFRESH_TOKEN_LIFETIME`'ın 1 saat olması bilinçli bir tasarım kararı (kullanıcı talimatı): reaktif (sadece bir istek 401 aldığında tetiklenen, proaktif zamanlayıcı OLMAYAN) bir refresh stratejisiyle birleşince, bu doğal bir "1 saatlik idle timeout" oluşturuyor — kullanıcı aktifse (en az saatte bir istek atıyorsa) oturum kayan pencereyle uzar; tamamen hareketsiz kalırsa 1 saat sonra bir sonraki istekte refresh de başarısız olur, tekrar login gerekir. 1 saat spesifik olarak seçildi çünkü seanslar Zoom üzerinden yapılıyor (`appointment_duration` üst sınırı 50 dk) ve bir görüşme boyunca kullanıcı Lunova sekmesinde hiçbir istek atmıyor olabilir — 30 dk gibi daha kısa bir pencere, görüşme ortasında oturumu düşürüp kullanıcıyı tam görüşme biterken tekrar login'e zorlardı.

`POST /accounts/token/refresh/` görüntüsü: body gerekmez (cookie'den okur), başarılı yanıt `{"detail": "Oturum yenilendi."}` + yeni `access_token`/`refresh_token` cookie'leri. Refresh token eksik/geçersiz/süresi dolmuş/blacklist'teyse temiz `401 {"detail": "...", "code": "token_not_valid"}` döner (500 riski yok — `curl` ile hem eksik cookie hem "garbage" token hem rotasyonlanmış-eski-token senaryoları test edildi, hepsi doğru 401 verdi).

**Login/Logout response gerçek şekli:**
```python
# LoginView.post() — response body:
{"name": ..., "surname": ..., "email": ..., "profile_photo": ..., "gender": ...}
# access/refresh JSON'da YOK, sadece httpOnly cookie olarak set ediliyor.
# role/id de YOK.

# Cookie parametreleri (login):
access_token:  httponly=True, samesite='None', secure=True, max_age=900      (15 dk)
refresh_token: httponly=True, samesite='None', secure=True, max_age=604800   (7 gün)
# Production'da (ENVIRONMENT=Production) domain='lunova.tr' eklenir.
```

**Logout**: `POST /accounts/logout/` — cookie'deki refresh_token'ı `RefreshToken(...).blacklist()` ile blacklist'e ekler, cookie'leri siler. `IsAuthenticated` permission'ı var (yani access_token geçerli olmalı — süresi dolmuşsa logout çağrısı da 401 alabilir, bir edge-case).

### Permission sınıfları (gerçek, dağınık — tek dosyada değil)
```
accounts/permissions.py    → (mevcut ama LoginView/ProfileView çoğunlukla IsAuthenticated kullanıyor)
appointments/permissions.py → IsExpertOrClientForCreatePermission, IsAppointmentParticipantPermission,
                               IsAppointmentExpertPermission, IsAppointmentClientPermission
availability/permissions.py → IsExpertPermission, IsAvailabilityOwnerPermission, IsExpertOrAuthenticatedReadOnly
```

## 🔌 API Endpoint Referansı

Kök dizindeki [claude.md](../claude.md) dosyasında tam liste var (accounts/appointments/availability/zoom/forms — hepsi gerçek `urls.py`'lerden). Burada tekrar etmiyoruz; sadece şunu vurgulamak gerekir: **`appointments/ENDPOINTS.md` ve `appointments/README.md`, kodla neredeyse birebir örtüşüyor** — durum geçiş matrisi, query param zorunlulukları, yetki kuralları hepsi doğru. Diğer app'ler için böyle bir güven seviyesi yok (aşağıya bakın).

## 📊 Models — Gerçek Alanlar

Detaylı alan listesi için kök [claude.md](../claude.md)'deki "Data Models" bölümüne bakın. Öne çıkan noktalar:

- `bio`, `hourly_rate`, `phone_verified`, `timezone` (ExpertProfile üzerinde) gibi önceki dokümantasyonda geçen alanlar **gerçekte yok**. Gerçek karşılıkları: `about`, `session_price`+`currency`, (yok), `User.timezone`.
- `ClientProfile.expert` diye bir FK var (danışana atanan uzman) — önceki dokümanda hiç yoktu, ama `ClientListView`, `forms` view'ları ve `FormClientResponsesView` gibi birçok yerde bu ilişki üzerinden yetki kontrolü yapılıyor. Bunu bilmeden appointments/forms akışlarını anlamak zor.
- Profil fotoğrafı ayrı bir alan değil — generic `Document` modeli üzerinden `type=profile_photo` ile tutuluyor ve her istekte `Document.objects.filter(user=..., type=PROFILE_PHOTO).first()` ile ayrıca sorgulanıyor (N+1 riski — `LoginView`, `MeView` her ikisi de bunu her çağrıda yapıyor).
- `WeeklyAvailability` üzerinde **gerçek DB constraint'leri var** (`unique_expert_service_day_time`, `start_time < end_time`) — önceki raporun "constraint eksik" iddiası yanlıştı.

## ⚙️ Zorunlu Environment Variables

`.env` dosyası repo'da yok, `settings.py`'den derlenmiş liste:

```bash
DEBUG=True|False
ENVIRONMENT=Development|Production
SECRET_KEY=...
ALLOWED_HOSTS=localhost:8000,127.0.0.1:8000        # env.list, boşsa ImproperlyConfigured fırlatır
DB_URI=Lunova-lite                                   # SQLite için özel değer; başka her şey dj_database_url'e gider
FRONTEND_URLS={"expert":"http://localhost:5173","client":"http://localhost:5174","admin":"..."}
                                                       # Production'da expert/client/admin ÜÇÜ de zorunlu
STORAGE_PROVIDER=mock|supabase
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_BUCKET=...   # sadece supabase ise
ZOOM_CLIENT_ID=... ZOOM_CLIENT_SECRET=... ZOOM_ACCOUNT_ID=...         # her zaman zorunlu (env.str, default yok)
EMAIL_BACKEND=... EMAIL_HOST=... EMAIL_HOST_USER=... EMAIL_HOST_PASSWORD=...   # default'ları var, opsiyonel
```

Development'ta CORS `["http://localhost:5173", "http://localhost:5174"]` olarak **hardcoded** — `CORS_ALLOW_ALL_ORIGINS=True` diye bir ayar **yok** (önceki dokümanın iddia ettiğinin aksine).

## 🧪 Testing

Gerçek durum:
- `accounts/tests/test_accounts_complete.py` — HTTP üzerinden çalışan, sunucunun ayakta olmasını gerektiren bir smoke-test scripti (pytest/Django TestCase değil, `requests` ile çağrı yapan bağımsız bir script). Sadece `ENVIRONMENT=Development` veya `DEBUG=true` iken çalışıyor.
- Diğer app'lerde (`appointments`, `availability`, `forms`, `zoom`) otomatik test dosyası **yok** — sadece veri besleme (`feed_*.py`) scriptleri var, bunlar test değil. **Bu hâlâ doğru** — 2026-08-17'de çalışan bir ortam kurulup profil akışı manuel `curl` ile doğrulandı, ama bu bir otomatik test paketi eklemedi; bir sonraki oturum bu app'ler için gerçek test yazmayı değerlendirebilir.
- `.github/` içinde sadece `CODEOWNERS` var, **CI workflow (test/lint otomasyonu) yok**.

```bash
venv\Scripts\python accounts/tests/test_accounts_complete.py   # sunucu ayaktayken (venv artık gerçekten mevcut, bkz. yukarıdaki "Hızlı Başlangıç")
venv\Scripts\python manage.py test                              # şu an pratikte çok az şey kapsıyor
```

## 📚 App Bazında README Güvenilirlik Notu

Kullanıcı ekibin dokümantasyonu incelemesini istediği için, her app README'sinin kodla ne kadar örtüştüğünü işaretliyoruz:

| App | README/ENDPOINTS.md durumu |
|---|---|
| `appointments/` | ✅ Çok iyi — README.md + ENDPOINTS.md kodla (durum matrisi, query param zorunlulukları, yetkiler) neredeyse birebir örtüşüyor. Diğer app'ler için şablon olarak kullanılabilir. |
| `availability/` | ⚠️ Kısmen doğru — genel akış anlatımı doğru ama endpoint path'leri yanlış (`/appointments/availability/...` yazıyor, gerçeği `/api/v1/availability/...`). `AppointmentSlot` modeli README'de hiç geçmiyor. |
| `zoom/` | ⚠️ Örnek response gövdesi (`success`, `password`, `host_email` alanları) gerçek `create_zoom_meeting()` dönüşüyle birebir uyuşmuyor — gerçek fonksiyon Zoom API'sinin ham JSON'unu döndürüyor, README'deki gibi sabit bir şekil garanti etmiyor. |
| `forms/` | ✅ Çok iyi — model alanları, skorlama tipleri, risk seviyeleri kodla birebir örtüşüyor. Önceki AI raporunun "forms app kullanılmıyor/eksik" iddiası **yanlıştı**; bu modül tam işlevsel. |
| `accounts/README.md` | ❌ Yanıltıcı başlık — "Auth docs" değil, sadece `db_feed`/seed script kullanım talimatı. Gerçek auth mimarisini (cookie akışı, permission sınıfları) hiç anlatmıyor; bu dosyanın (backend/claude.md) üstlendiği rolü README üstlenmiyor. |
| kök `README.md` | ✅ İyi — kurulum adımları, feed script yolları (`accounts/tests/feed_accounts.py` vb.) doğru; önceki AI dokümanının kullandığı `accounts/db_feed.py` yolu **yanlıştı**. |

## ⚠️ Bilinen Gerçek Sorunlar (özet, detay için kök [claude.md](../claude.md))

1. ✅ **[DÜZELTİLDİ — 2026-08-17, 5. tur]** ~~CSRF koruması muhtemelen hiç aktif değil.~~ `CookieJWTAuthentication.enforce_csrf()` eklendi + cookie'ler `SameSite=Lax` + iki frontend'de axios xsrf config. `curl` ile orijinal PoC yeniden test edildi: `205` → `403`. Detay için yukarıdaki "5. tur" changelog girişine bakın. **Tek açık nokta**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı (bkz. kök claude.md).
2. ✅ **[DÜZELTİLDİ — 2026-08-17]** ~~Access token 15 dk, refresh endpoint yok~~ — `POST /accounts/token/refresh/` eklendi, `REFRESH_TOKEN_LIFETIME` 1 saate çekildi. Detay için yukarıdaki "SIMPLE_JWT gerçek değerleri" bölümüne bakın.
3. ✅ **[DÜZELTİLDİ — 2026-08-17, 4. tur]** ~~`availability/views.py` → `AvailabilityExceptionView.delete()`, `ProfileView`'da düzeltilen "PATCH/DELETE response'u GET'ten farklı, dar bir serializer ile üretiliyor" hatasının aynısı~~ — output artık `AvailabilityExceptionSerializer` kullanıyor, `curl` ile doğrulandı. Detay için yukarıdaki "4. tur" changelog girişine bakın.
4. ✅ **[düzeltildi]** ~~`requirements.txt` UTF-16 kodlu~~ — Docker altyapısı eklenirken (2026-08-17) UTF-8'e çevrildi, bu turda `file requirements.txt` ile ASCII/UTF-8 olduğu doğrulandı. Şüpheli `rest-framework-simplejwt==0.0.2` paketi hâlâ requirements.txt'te duruyor (kullanılmıyor gibi görünüyor, temizlenebilir — düşük öncelik).
5. 🟡 **[14. turda kısaca denendi, 15. turda geri alındı]** Genel/global rate limiting yok (`django-ratelimit` requirements'ta yok, global `DEFAULT_THROTTLE_CLASSES` tanımlı değil). 14. turda `messaging/`'in gönderim endpoint'i için DRF `ScopedRateThrottle` denendi (30/hour) ama kullanıcı bunun yerine seans-bazlı bir mesaj KOTASI istedi (bkz. 15. tur) — throttle tamamen kaldırıldı, `messaging/` artık zaman-bazlı değil `messaging/services.py::get_client_remaining_quota()` ile hesaplanan bir kota kullanıyor. Diğer TÜM endpoint'ler (login, appointments, forms vb.) hâlâ herhangi bir rate limiting'e tabi değil.
6. 🟡 DRF pagination global olarak tanımlı değil; `available-experts/` gibi bazı uçlar Python içinde ağır döngüsel hesap yapıyor (asıl risk burada, appointments listesi zaten tarih aralığıyla sınırlı).
7. 🟢 CI yok, otomatik test yok (appointments hariç neredeyse hiçbir app'te) — bu turda kurulan yerel ortam bunu değiştirmedi, sadece manuel test/doğrulamayı mümkün kıldı.
8. ✅ **[DÜZELTİLDİ — 2026-08-19, 10. tur]** ~~Dev/mock ortamda `zoom_join_url`/`zoom_start_url` literal `"mock url"` string'i taşıyordu, frontend `window.open()` bunu relative path sanıp kendi 404 sayfasına düşüyordu~~ — `zoom/services.py`'ye eklenen `create_mock_zoom_meeting()` artık gerçek `https://zoom.us/j/...` formatında bir URL döndürüyor. Detay için yukarıdaki "10. tur" changelog girişine bakın. **Tek açık nokta**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı.
9. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormSubmitView`, gönderilen HİÇBİR form cevabı için gerçek bir skor hesaplamıyordu — `total_score` her zaman `0.0`'da kalıyor, `risk_level`/`percentage_score` submission anındaki bu sıfıra göre hesaplanıp bir daha asla güncellenmiyordu (expert'in gördüğü risk değerlendirmesi anlamsızdı); ayrıca `AnswerSubmitSerializer`'da `numeric_answer` alanı hiç yoktu, `scale`/`number` tipi sorular (örn. SDS formu) skorlama açısından işlevsizdi~~ — `FormSubmitView.post()` artık her cevap için `Answer.calculate_score()`'u çağırıp topluyor, `FormResponse.total_score`'u gerçek toplamla tekrar `save()` ediyor; `AnswerSubmitSerializer`'a `numeric_answer` eklendi. Gerçekten çalıştırılarak (Django shell + `APIRequestFactory`) doğrulandı. Detay için yukarıdaki "11. tur" changelog girişine bakın.
10. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, bir danışan henüz bir uzmana atanmamışsa (`ClientProfile.expert=None`) HERHANGİ bir uzmanın erişmesine izin veriyordu~~ — `client_profile.expert != expert` olarak sıkılaştırıldı, artık sadece gerçekten atanmış uzman erişebiliyor.
11. 🟡 **[11. turda bulundu, bilinçli olarak kapsam dışı bırakıldı]** `forms/models.py` → `Question.next_question`, hiçbir queryset kısıtı olmadan TÜM formlardaki soruları referans alabiliyor (formlar arası çapraz link mümkün) — sadece admin panelindeki dropdown `QuestionAdmin.formfield_for_foreignkey` ile aynı forma sınırlandı (11. tur), model seviyesinde bir `clean()`/validasyon eklenmedi.
12. ✅ **[DÜZELTİLDİ — 2026-08-20, 13. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, URL'deki `client_id`'yi önce `ClientProfile.id` olarak yorumlamayı deniyordu; tek gerçek çağıran taraf (expert frontend) her zaman `User.id` gönderdiği için, `User.id` sayısal olarak alakasız bir `ClientProfile`'ın PK'sıyla çakışırsa view YANLIŞ danışan profiline eşleşiyordu — en iyi ihtimalle yanlış bir 403, en kötü ihtimalle (çakışan profil aynı expert'e aitse) bir danışanın klinik verisinin başka bir danışan adı altında gösterilmesi~~ — gerçek DB'de bu turda TEYİT EDİLDİ (gerçek bir danışan için yanlışlıkla 403 alındığı görüldü) ve düzeltildi: artık `client_id` doğrudan ve sadece `User.id` olarak yorumlanıyor. Detay için yukarıdaki "13. tur" changelog girişine bakın.

---
**Son Güncelleme**: 2026-08-20, 15. tur (`messaging/`'in gönderim sınırı saatlik `ScopedRateThrottle`'dan seans-bazlı bir kotaya çevrildi — `services.py::get_client_remaining_quota()` iki seans arası 5 danışan mesajı hakkını `Appointment`/`Message` verisinden hesaplıyor, her tamamlanan seans sonrası yenileniyor; danışan için 200 karakter limiti + kota kontrolü artık sunucu taraflı POST'ta zorunlu (uzmanın sınırı yok); GET/POST yanıt şekli `client_quota` alanı taşıyacak şekilde değişti (breaking, iki frontend güncellendi). 10 senaryo `APIRequestFactory` ile gerçek verilerle doğrulandı, `manage.py check` temiz, migration gerekmedi; frontend tarafı için client/claude.md ve expert/claude.md'ye bakın)
