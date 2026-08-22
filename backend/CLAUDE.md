# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır (dokümantasyon bakım kuralları da orada — kısaca: `backend/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-22, 19. tur) — Onaylanmış Belgeler Artık Silinebiliyor (Deactivate) + Belge İndirme CORS Düzeltmesi
> Kullanıcı gerçek tarayıcıda iki şey bildirdi: (1) danışan panelinde belge indirme CORS hatasıyla başarısız oluyordu, (2) sil butonu onaylanmış bir belgede gri/tıklanamaz duruyordu ve bunun "saçma" olup olmadığını sordu. Netleştirme sonrası kullanıcı onaylanmış belgelerin de silinebilmesini (deactivate) istedi.
> - **Belge indirme CORS düzeltmesi**: kök neden ve çözüm client tarafında (`client/claude.md` 20. tur) - backend'de değişiklik gerekmedi.
> - **`accounts/views/document_views.py` → `DocumentDeleteView.perform_destroy()`**: `status == DocumentStatus.APPROVED` engeli kaldırıldı. Bu kısıtlama "silme" gerçek/geri dönüşsüz bir DELETE olduğu (18. tur öncesi) döneme aitti - artık geri alınabilir bir deactivate olduğu için (`status` alanına hiç dokunulmuyor, dosya storage'da kalıyor, admin panelinden yeniden aktifleştirilebiliyor) gerekçesi kalmadı. `is_primary` engeli AYNEN korundu (kullanıcı sadece onaylı belgeler hakkında soru sordu, birincil belge kısıtlamasına dokunulmadı). `DocumentStatus` importu artık kullanılmadığı için kaldırıldı.
> - **İki frontend**: `UserDocumentsCard.tsx` ve `profile-view.tsx`'teki `deleteBlockedReason` hesaplaması `doc.status === 'approved'` dalı çıkarılarak sadeleştirildi - artık sadece `is_primary` kontrolü kalıyor.
> - **Doğrulama**: `accounts.services.review_document()` ile bir belge önce `approved`'a çekilip gerçek bir DB kopyasında `APIRequestFactory` ile `DELETE` denendi - önceden `400` alınan istek artık `204` dönüyor, `status` alanı deaktivasyondan SONRA da `approved` olarak koruniyor (geçmiş kaybolmuyor). `is_primary=True` bir belgenin hâlâ `400` aldığı ayrıca doğrulandı (regresyon yok). Gerçek `db.sqlite3` üzerinde `manage.py check` temiz. İki frontend'de `tsc -b`/`vite build` temiz.

> ## 🔧 Son Değişiklikler (2026-08-22, 18. tur) — Belge Silme = Aktif/Pasif (Deactivate), Danışan+Uzman Panelinde Silme Butonu
> Kullanıcı, 17. turda eklenen belge onay/red akışının üzerine, danışan ve uzman panellerinde belge SİLME özelliği istedi - ama gerçek bir DELETE değil, "aktif/pasif" (deactivate) mantığıyla: aynı isimde belge tekrar yüklemenin sakıncası olmaması gerektiğini (backend zaten uid+type ile tutuyor), ve admin panelinde bu aktif/pasif durumunun görünmesi gerektiğini belirtti. Kullanıcı `is_current` alanının bu işi zaten görebileceğini tahmin etti - **doğru çıktı**: `Document.is_current` (`accounts/models.py`) tam olarak bu amaçla önceden eklenmiş ama hiç kullanıcı-tetiklemeli bir "silme" akışına bağlanmamıştı.
> - **🔍 Keşif: `DocumentDeleteView` zaten VARDI ama tam istenen şey değildi** — `accounts/views/document_views.py`'deki bu view zaten `is_current=False`'a çekiyordu (doğru "aktif/pasif" mantığı) AMA aynı zamanda `storage.delete(file_key)` de çağırıyordu (dosyayı storage'dan GERÇEKTEN siliyordu) - kullanıcının "direkt silmek yerine aktif pasif yapalım" isteğiyle çelişiyordu. `storage.delete()` çağrısı + ilgili `transaction.atomic`/`logger` kodu kaldırıldı, artık SADECE `is_current=False, is_primary=False` set ediliyor - dosya storage'da kalıyor, admin panelinde görünmeye ve gerekirse yeniden aktifleştirilmeye devam ediyor. Var olan iş kuralları (onaylanmış/birincil belge silinemez) AYNEN korundu.
> - **🔍 Keşif: `ProfileView.get_object()` zaten `is_current=True` ile prefetch yapıyordu** — `documents = DocumentSerializer(source="user.documents", ...)` alanının, DRF'in bir Manager gördüğünde otomatik `.all()` çağırması sayesinde, `ProfileView`'daki `Prefetch(queryset=Document.objects.filter(is_current=True))`'ı ZATEN kullandığı görüldü - yani deaktive edilmiş belgeler `GET /accounts/profile/` yanıtında zaten hiç görünmüyordu, EK bir filtreleme gerekmiyordu. **Kendi yaptığım bir hata, kendi fark edip düzelttim**: ilk yazdığım kod bunu `SerializerMethodField` + `.filter(is_current=True)`'a çevirmişti - bu hem GEREKSİZDİ (zaten doğru çalışıyordu) hem de prefetch cache'ini bypass edip fazladan bir DB sorgusuna sebep olacaktı (bir queryset üzerinde `.filter()` çağırmak Django'nun prefetch cache'ini kullanmaz, her zaman yeni bir sorgu atar) - orijinal `source="user.documents"` deseni geri getirildi, sadece açıklayıcı bir yorum eklendi.
> - **`accounts/models.py`**: `Document.is_current`'a `verbose_name="Aktif mi?"` eklendi (önceden Türkçe etiketi yoktu, admin'de "is current" olarak görünüyordu).
> - **`accounts/admin.py` → `DocumentAdmin`**: `is_current` artık `current_colored` (yeşil "Aktif" / gri "Pasif") olarak gösteriliyor; yeni toplu aksiyonlar `activate_documents`/`deactivate_documents` (onay/red aksiyonlarıyla aynı desende, admin için hiçbir kısıtlama yok - approve/reject_documents ile tutarlı).
> - **Client (`UserDocumentsCard.tsx`)**: `handleDeleteDocument` artık gerçekten `DELETE /api/v1/accounts/documents/{uid}/` çağırıyor - bir onay modalı (Forms akışındaki `useModal`/`Modal` deseniyle), `useToast` (bu dosyada önceden hiç kullanılmıyordu, kardeş kartlardan farksız hale geldi), başarıda `dispatch(fetchProfile())` ile liste tazeleniyor. Onaylanmış/birincil belgelerde silme butonu baştan devre dışı + tooltip (backend'in her denemede reddetmesini önlemek için). **Ayrı bir keşif**: DRF'in `ValidationError("düz string")`'i `{"detail": ...}` DEĞİL ham bir dizi (`["mesaj"]`) döndürüyor - hata mesajı okuma mantığı buna göre yazıldı.
> - **Expert (`profile-view.tsx`)**: `features/profile/api.ts`'teki `deleteDocument()` fonksiyonu ÖNCEDEN VARDI ama hiçbir UI'ya bağlı değildi (ölü kod) - "Belgeler" kartına bir `Trash2` ikon butonu + var olan `confirm-dialog.tsx`/`ConfirmDialog` bileşeni eklendi. Silme sonrası liste tazelemesi (`refreshProfile()`) bilinçli olarak sayfanın `loading` state'ine dokunmuyor - aksi halde client'ta 17. turda düzeltilen "tam ekran spinör flaşı" hatasının aynısı burada da oluşurdu. **`features/profile/api.ts::handleApiError`'da kendi bulunan bir bug düzeltildi**: ham bir dizi (`["mesaj"]`) hata yanıtı, genel "obje" dalına düşüp yanlışlıkla `"0: mesaj"` gibi bir index önekiyle gösteriliyordu (diziler JS'te `typeof === 'object'`) - artık `Array.isArray()` ile en başta özel olarak ele alınıyor. `deleteDocument()`'a ayrıca bir başarı toast'ı eklendi (`uploadDocument()` ile tutarlı, önceden yoktu).
> - **Doğrulama — hepsi gerçek bir DB kopyasında, `APIRequestFactory`/gerçek admin metodlarıyla gerçekten çalıştırılarak**: (1) DELETE çağrısı → `is_current=False`, `status`/`file_key` DOKUNULMADAN kalıyor, `GET /documents/` VE `GET /profile/`'dan aynı anda kayboluyor (2 ayrı doğruluk kaynağı); (2) admin `activate_documents`/`deactivate_documents` bulk aksiyonları gerçek `DocumentAdmin` instance'ı üzerinde çağrılıp doğru toggle ettiği görüldü; (3) deaktivasyon sonrası AYNI tipte yeni bir `presign-upload` isteğinin (slot boşaldığı için) `200` aldığı doğrulandı - kullanıcının "aynı isimde tekrar yükleme sorun olmamalı" beklentisi teyit edildi; (4) `ValidationError`'ın gerçek response body'sinin `["Onaylanmış bir belge silinemez."]` (düz dizi, `{"detail":...}` DEĞİL) olduğu `json.dumps` ile doğrudan gözlemlendi. Gerçek `db.sqlite3` üzerinde `manage.py migrate`/`check`/`makemigrations --check --dry-run` temiz. İki frontend'de `tsc -b` + `vite build` temiz. **Silme butonlarının kendisi gerçek bir tarayıcıda tıklanarak henüz test edilmedi.**

> ## 🔧 Son Değişiklikler (2026-08-20, 15. tur) — Mesaj Sınırlaması Saatlik Throttle'dan Seans-Bazlı Kotaya Çevrildi
> 14. turda eklenen `messaging/` app'i saatte 30 mesaj şeklinde zaman-bazlı bir `ScopedRateThrottle` kullanıyordu. Kullanıcı bunu, iki seans arasında toplam 5 mesaj hakkı (her seans TAMAMLANDIĞINDA yeniden dolan) şeklinde seans-bazlı bir kotaya çevirmemizi istedi — ayrıca danışan tarafında dinamik kalan-hak göstergesi, hak bittiğinde kırmızı uyarı, danışan için 200 karakter limiti (uzman sınırsız, 1000 kalıyor), ve her iki frontend'de gönderilmemiş taslakların localStorage'da korunmasını istedi. Frontend detayı: `client/claude.md`/`expert/claude.md`'nin 16./15. tur girdileri.
> - **`ScopedRateThrottle` tamamen kaldırıldı** — `messaging/views.py`'den throttle importu/`get_throttles()` silindi, `settings.py`'deki `DEFAULT_THROTTLE_RATES` dict'i (sadece bu amaçla eklenmişti) temizlendi. Proje genelinde hâlâ hiçbir zaman-bazlı rate limiting yok (bkz. aşağıdaki "Bilinen Gerçek Sorunlar" madde 5 — bu turda geri alındı).
> - **Yeni `messaging/services.py` → `get_client_remaining_quota(expert_id, client_id)`**: DB'de ayrı bir "kota" alanı/modeli YOK, tamamen hesaplanıyor. `_quota_window_start()` bu çiftin en son `status='completed'` randevusunun BİTİŞ zamanını (`date`+`time`+`duration` — `notifications/services.py`'deki `_appointment_datetime()` deseniyle aynı `timezone.make_aware` yaklaşımı) bulur; hiç tamamlanmış randevu yoksa `None` (konuşmanın başından itibaren say). `Message.objects.filter(sender_id=client_id, created_at__gte=window_start)` sayılıp `5 - used` (min 0) döner. Bu tasarım "her seans sonrası yenilenir" davranışını EK bir alan/cron olmadan, sadece var olan `Appointment`/`Message` verisinden türetiyor — `notifications`'ın "computed, sync-on-GET" felsefesiyle tutarlı.
> - **`messaging/views.py` → `ConversationMessagesView`**: GET/POST yanıt şekli değişti — artık `{"messages": [...], "client_quota": {"remaining": N, "limit": 5}}` (önceden GET düz bir dizi dönüyordu, POST düz bir mesaj objesi — **breaking change**, iki frontend de buna göre güncellendi). POST'ta iki ayrı sunucu-taraflı kontrol EKLENDİ (frontend'in `maxLength`/disable'ını bypass edip doğrudan API'ye istek atan biri için de geçerli): (1) danışan için karakter limiti artık 200 (uzman hâlâ `Message.MAX_LENGTH=1000`) — aşılırsa `400 {"code": "message_too_long"}`; (2) danışan için kota kontrolü — `remaining<=0` ise mesaj hiç oluşturulmadan `403 {"code": "quota_exceeded", "client_quota": {...}}`. Uzman gönderiminde HİÇBİR sınır kontrolü yok (kullanıcı talebi: "uzmanın herhangi bir mesaj sınırı yoktur").
> - **`ConversationListView` (expert roster)**: her satıra `client_quota` eklendi — expert danışanının kalan hakkını sekmeye girmeden roster'da görebiliyor.
> - **Doğrulama — 10 senaryo, `APIRequestFactory` ile gerçek verilerle, gerçekten çalıştırılarak**: (1) taze konuşma → 5/5; (2) 5 danışan mesajı → sırasıyla 4,3,2,1,0; (3) 6. mesaj → `403 quota_exceeded`; (4) GET'in 0/5'i doğru yansıttığı; (5) uzman mesajının danışanın kotasını ETKİLEMEDİĞİ; (6) 201 karakterlik danışan mesajının `400 message_too_long` aldığı (uzunluk limitinin sunucu taraflı, frontend'den bağımsız çalıştığı); (7) uzmanın 500 karakter gönderebildiği; (8) gerçek bir `completed` randevu oluşturulunca kotanın 5/5'e SIFIRLANDIĞI (randevu bitiş zamanından ÖNCEki mesajların yeni pencereye sayılmadığı); (9) sıfırlama sonrası yeni bir mesajın kotayı doğru tükettiği (4/5); (10) roster'ın her satırda doğru `client_quota` döndürdüğü. Test verisi (kullanılan çift, kullanıcının UI'da GERÇEKTEN mesajlaştığı `expert10`/`client2` çiftinden BİLİNÇLİ olarak farklı, dokunulmadı) sonra temizlendi. `manage.py check` temiz, migration gerekmedi (tamamen hesaplanan bir kota, yeni model alanı yok).

> ## 📜 Daha Eski Turlar (2026-08-22, 17. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" listesinde ✅ maddeleri olarak duruyor (belge onay/red akışı + admin panel genel güçlendirmesi + form versiyon görünürlüğü eklendi [17. tur], veritabanı besleme script'lerine isimlendirilmiş ekip hesapları + `messaging`/`notifications` feed'leri + `feed_db.py` orkestrasyon script'i eklendi [16. tur], uzman-danışan not/mesaj sistemi + bildirim zili entegrasyonu eklendi [14. tur], 🔴 kritik `forms/views.py` client_id çakışma bug'ı düzeltmesi [13. tur], global bildirim sistemi eklendi [12. tur], danışan formları otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], CSRF koruması [5. tur], AvailabilityExceptionView serializer düzeltmesi [4. tur], access token refresh [3. tur], ProfileView write/read-serializer tutarsızlığı + `timezone` alanı eksikliği [devam turu], login/me `id`/`role` eksikliği + danışanın kendi talebini geri çekebilmesi [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- backend/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-22, 17. tur — Yeni Özellik: Belge Onay/Red Akışı (Admin) + Admin Panel Genel Güçlendirme + Form Versiyonu Görünürlüğü
> - 2026-08-21, 16. tur — Veritabanı Besleme: İsimlendirilmiş Ekip Hesapları + messaging/notifications Feed'leri + Ana Orkestrasyon Script'i
> - 2026-08-20, 14. tur — Yeni Özellik: Uzman-Danışan Not/Mesaj Sistemi + Bildirim Zili Entegrasyonu
> - 2026-08-20, 13. tur — 🔴 Kritik: forms/views.py Client ID Çakışma Bug'ı Düzeltmesi
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
python messaging/tests/feed_messaging.py       # (16. tur, YENİ)
python notifications/tests/feed_notifications.py   # (16. tur, YENİ)

# ÖNERİLEN (16. tur, YENİ): yukarıdaki hepsini doğru bağımlılık sırasıyla tek
# komutla çalıştırır, isimlendirilmiş ekip test hesaplarını (selin, selen, onur,
# ece, eslem, gokcen, niga, mustafa, yusuf -> <isim>@mail.com uzman +
# danisan_<isim>@mail.com eşleşmiş danışan, şifre: password123) da içerir.
python feed_db.py                # --list ile sırayı, --apps a,b ile alt kümeyi görebilirsin

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
│   ├── services.py           (17. tur, YENİ) → review_document()/sync_review_fields()/
│   │                          notify_document_review() - belge onay/red iş mantığı, admin
│   │                          panelindeki tekil düzenleme VE toplu aksiyonlar buradan geçer
│   ├── authentication.py   → CookieJWTAuthentication (cookie veya header'dan token okur)
│   ├── permissions.py, storage/{base,supabase,mock,factory}.py
│   ├── migrations/           → 0001_initial, 0002_document_status (17. tur, YENİ - Document.status
│   │                          alanı + verified=True→status=approved backfill data migration'ı)
│   └── tests/               → test_accounts_complete.py, feed_accounts.py (16. tur, YENİ:
│                          seed_named_team_accounts() - isimlendirilmiş ekip test hesapları)
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
│   ├── views.py                 → NotificationListView (GET, sync+cleanup tetikler), NotificationMarkReadView (PATCH)
│   └── tests/feed_notifications.py  (16. tur, YENİ) → tüm kullanıcılar için sync_appointment_reminders()'ı
│                              tetikler + bazı bildirimleri okunmuş/20-günden-eski-okunmuş işaretler (test verisi)
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
│   └── tests/feed_messaging.py (16. tur, YENİ) → isimlendirilmiş ekip çiftleri için kota-senaryolu örnek
│                              sohbetler + genel havuzdan rastgele bir alt küme için sade örnek sohbetler
│
├── api/v1/urls.py            → accounts/, zoom/, appointments/, forms/, availability/, notifications/, messaging/ include'ları
├── lunova_backend/settings.py
├── requirements.txt           (Docker altyapısı eklenirken UTF-8'e çevrildi - önceki "UTF-16" notu eskiydi,
│                          bkz. kök claude.md; hâlâ kullanılmayan `rest-framework-simplejwt==0.0.2` satırı var)
├── feed_db.py                 (16. tur, YENİ) → backend kökünde tüm app'lerin feed'lerini doğru sırayla
│                          (accounts→availability→appointments→messaging→notifications→forms) çalıştıran
│                          orkestrasyon script'i (`--apps`/`--skip-forms`/`--list` argümanları var)
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
13. ✅ **[DÜZELTİLDİ — 2026-08-22, 17. tur]** ~~Belge onay akışı sadece bir `verified` boolean'ıydı - admin panelinden tek tek/toplu onaylama/reddetme aksiyonu, kullanıcıya bildirim, ve "pending" ile "hiç incelenmedi" arasında ayrım yoktu~~ — `Document.status` (pending/approved/rejected) + `accounts/services.py::review_document()` + admin toplu aksiyonları + `notifications`'a yeni `document_status` türü eklendi. Detay için yukarıdaki "17. tur" changelog girişine bakın.
14. 🟢 **[17. turda bulundu, düzeltilmedi]** `client/src/types/profile.types.ts`'deki eski `Document.filename` alanının gerçek backend alanıyla (`original_filename`) hiç eşleşmediği (sessiz `undefined` bug'ı) bu turda fark edilip client tarafında düzeltildi (bkz. `client/claude.md`). Aynı sınıf bir tutarsızlık başka bir frontend/serializer çiftinde de var olabilir - sistematik bir tarama yapılmadı, sadece bu spesifik dosya (zaten status badge'i için düzenleniyordu) düzeltildi.
15. ✅ **[DÜZELTİLDİ — 2026-08-22, 18. tur]** ~~Danışan/uzman kendi yüklediği bir belgeyi silemiyordu (`DELETE /accounts/documents/<uid>/` UI'dan hiç çağrılmıyordu, client'ta stub'du, expert'te API fonksiyonu vardı ama UI'ya hiç bağlı değildi); ayrıca var olan `DocumentDeleteView` "silme"yi gerçek bir storage silmesiyle karıştırıyordu~~ — `is_current` aktif/pasif anahtarı (önceden de vardı, kullanıcı-tetiklemeli bir akışa hiç bağlanmamıştı) artık iki frontend'de de gerçek bir silme butonuna bağlı; `storage.delete()` çağrısı kaldırıldı (dosya storage'da kalıyor). Detay için yukarıdaki "18. tur" changelog girişine bakın.
16. ✅ **[DÜZELTİLDİ — 2026-08-22, 19. tur]** ~~Onaylanmış bir belge kullanıcı tarafından silinemiyordu (deactivate edilemiyordu) - kullanıcı bunu "saçma" bulup sordu~~ — `DocumentDeleteView.perform_destroy()`'daki `status==APPROVED` engeli kaldırıldı (silme artık geri alınabilir bir deactivate olduğu için orijinal "geri dönüşsüz kaybetme" gerekçesi geçersizdi); `is_primary` engeli aynen korundu.

---
**Son Güncelleme**: 2026-08-22, 19. tur (Kullanıcı talebiyle onaylanmış belgeler de artık kullanıcı tarafından silinebiliyor/deactivate edilebiliyor - `DocumentDeleteView`'daki `status==APPROVED` engeli kaldırıldı, `is_primary` engeli korundu; iki frontend'deki `deleteBlockedReason` mantığı buna göre sadeleştirildi. Belge indirme CORS hatası da düzeltildi [client tarafında, bkz. client/claude.md 20. tur]. Gerçek bir DB kopyasında `APIRequestFactory` ile doğrulandı: onaylı+birincil-olmayan bir belge artık `204` ile silinebiliyor, `status` alanı `approved` olarak korunuyor, birincil belge hâlâ `400` alıyor [regresyon yok]. `manage.py check` temiz, iki frontend'de `tsc -b`/`vite build` temiz)
