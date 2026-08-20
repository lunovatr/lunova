# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır (dokümantasyon bakım kuralları da orada — kısaca: `backend/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-20, 13. tur) — 🔴 Kritik: `forms/views.py` Client ID Çakışma Bug'ı Düzeltmesi
> Kullanıcı, expert panelindeki "Danışan Formları" ekranını dropdown yerine bir matris (danışan × form, dolu/boş işaretli) tabloya çevirmeyi istedi (bkz. `expert/claude.md`'nin 12. tur girdisi). Bu değişikliği gerçek backend verisiyle doğrularken (matris HER danışan için ayrı bir `GET /forms/clients/<id>/form-responses/` çağrısı yapıyor), gerçekten atanmış bir danışan için beklenmedik bir `403` alındı — kod okuması, önceden fark edilmemiş, gerçek ve ciddi bir bug ortaya çıkardı.
> - **Kök neden**: `FormClientResponsesView` ve `FormClientResponseDetailView`, URL'deki `client_id`'yi ÖNCE `ClientProfile.id` olarak yorumlamayı DENİYORDU, sadece o başarısız olursa `User.id` olarak deniyordu. Ama tek gerçek çağıran taraf (`expert/src/features/client-forms/api.ts`, `MyClient.user_id` — `GET /accounts/clients/`'ten gelir) HER ZAMAN `User.id` gönderiyor. `ClientProfile.id` ve `User.id` iki AYRI auto-increment dizisi olduğundan, gönderilen `User.id` sayısal olarak TAMAMEN ALAKASIZ bir `ClientProfile`'ın kendi PK'sıyla çakışabiliyor — ve öncelik sırası yüzünden view bu YANLIŞ, alakasız profili kullanıyordu. Gerçek DB'de bu turda TEYİT EDİLDİ: `user_id=18` olan bir danışan için `ClientProfile.id=18` olan BAŞKA (`expert_id=12`'ye atanmış) bir danışan profili çakışıyordu — istek atan expert `expert_id=10`'a ait olduğu için sonuç bir 403'tü (en iyi ihtimal). **En kötü ihtimalde** (çakışan profil TESADÜFEN AYNI expert'e atanmışsa) bu bug, bir danışanın klinik form cevaplarını/risk seviyesini BAŞKA bir danışanın adı altında sessizce göstermiş olabilirdi — bu yüzden 🔴 Kritik.
> - **Düzeltme**: İki view'da da belirsiz "önce dene, olmazsa dene" mantığı kaldırılıp doğrudan `get_object_or_404(ClientProfile, user_id=client_id)` ile tek, net bir sorguya indirildi (`FormResponse` filtreleri de `user_id=client_id` kullanacak şekilde güncellendi). Artık `client_id` her zaman ve sadece `User.id` olarak yorumlanıyor - belirsizlik/çakışma riski yapısal olarak ortadan kalktı.
> - **Doğrulama — gerçek DB verisiyle, gerçekten çalıştırılarak**: `APIRequestFactory` ile önce bug'ın gerçekten tetiklendiği (yanlış 403) doğrulandı; düzeltme sonrası AYNI istek `200` + doğru response listesi döndü; alakasız bir expert'in AYNI danışana erişmeye çalışması hâlâ doğru şekilde `403` alıyor (yetki kontrolünün kendisi bozulmadı); `FormClientResponseDetailView` için de aynı senaryo tekrarlanıp `200` + doğru `user_info.full_name`/`risk_level`/`total_score` doğrulandı. `manage.py check` temiz.

> ## 🔧 Son Değişiklikler (2026-08-20, 12. tur) — Yeni Özellik: Global Bildirim Sistemi
> Kullanıcı, client/expert'te "aktif olarak görülebilecek, yaklaşan randevuları listeleyen, tıklanınca randevu detayına yönlendiren, okununca işaretlenen, 20 gün sonra otomatik temizlenen" bir bildirim sistemi istedi. Sistemde ne bir job scheduler (Celery/cron) ne de gerçek bir "bildirim üretici" event akışı vardı — sıfırdan tasarlandı. Frontend tarafı için bkz. `client/claude.md`/`expert/claude.md`'nin 12. tur girdileri.
> - **Yeni `notifications/` app** (`INSTALLED_APPS`'e ve `api/v1/urls.py`'ye eklendi): `Notification` modeli — `user` (FK), `notification_type` (şu an tek değer: `appointment_reminder`, ileride `message` gibi türler için genel bırakıldı), `dedupe_key`, `title`, `body`, `appointment` (nullable FK → `appointments.Appointment`), `is_read`, `read_at`, `created_at`. `UniqueConstraint(user, dedupe_key)` idempotency'nin temeli.
> - **Tasarım kararı — job scheduler YOK, "computed + get_or_create" hibrit yaklaşım**: Projede zamanlanmış görev altyapısı olmadığı için (bkz. bu dosyanın "Zorunlu Environment Variables"/"Testing" bölümleri, hiç Celery yok), periyodik bir arka plan işi yerine `GET /api/v1/notifications/` her çağrıldığında `notifications/services.py` → `sync_appointment_reminders(user)` çalışıyor: kullanıcının (expert VEYA client, `Q(expert=user) | Q(client=user)`) önümüzdeki 3 gün içindeki `status='confirmed'` randevuları taranıp her biri için `dedupe_key=f"appointment_reminder:{appointment.id}"` ile `get_or_create` çağrılıyor — unique constraint sayesinde tekrar tekrar çağrılması var olan bir bildirimin (okunmuş/okunmamış) üzerine yazmıyor, idempotent. Aynı fonksiyon `cleanup_old_read_notifications(user)`'ı da tetikleyip 20 günden eski okunmuş bildirimleri siliyor. Bu tasarım, gerçek bir cron'a göre daha az "doğru" (kullanıcı hiç `GET` atmazsa bildirim hiç oluşmaz) ama altyapı eklemeden çalışan, basit ve bu projenin ölçeğine uygun bir çözüm — ileride gerçek bir job scheduler eklenirse `sync_appointment_reminders` olduğu gibi bir Celery task'ine taşınabilir.
> - **`notifications/views.py`**: `NotificationListView` (`GET /api/v1/notifications/`, `get_queryset()` içinde sync+cleanup tetikleniyor) ve `NotificationMarkReadView` (`PATCH /api/v1/notifications/<id>/read/`, idempotent). İkisi de `IsAuthenticated` — rol bazlı ekstra bir permission gerekmedi çünkü sorgu zaten `user=request.user`'a sabit.
> - **Timezone notu**: `Appointment.date`/`.time` ayrı, timezone-naive alanlar (rest of codebase'in geneli gibi hiç per-user tz dönüşümü yapılmıyor — bkz. `appointments/views.py`'deki `meeting_datetime` de aynı şekilde naive). `_appointment_datetime()` bunları `timezone.make_aware(..., timezone.get_default_timezone())` ile `TIME_ZONE='UTC'` varsayılanına sabitleyip `timezone.now()` ile karşılaştırılabilir hale getiriyor — projenin geri kalanıyla aynı (naive="sunucu saati") varsayımı bilinçli olarak koruyor, yeni bir tutarsızlık eklemiyor.
> - **Doğrulama — gerçekten çalıştırılarak yapıldı**: Django shell'de gerçek bir randevu oluşturulup `sync_appointment_reminders()` çağrıldı, hem expert hem client için doğru bildirim üretildiği, tekrar çağrıldığında DUPLICATE OLUŞMADIĞI (idempotency), `read_at`'i 21 gün geriye çekilmiş bir bildirimin `cleanup_old_read_notifications()` ile silindiği ama silinmeyen (yeni) bildirimin kaldığı doğrulandı; `APIRequestFactory` ile gerçek `NotificationListView`/`NotificationMarkReadView` HTTP çağrıları yapılıp `200` + doğru `is_read`/`read_at` değişimi doğrulandı. Test verisi (appointment + notification satırları) sonra temizlendi, DB'de kalıcı iz bırakılmadı. `manage.py check` temiz.

> ## 🔧 Son Değişiklikler (2026-08-19, 11. tur) — Danışan Formları: Otomatik Versiyonlama + Kritik Skorlama Hatası Düzeltmesi
> Kullanıcı, `forms/` modülünün üzerine iki frontend'de sıfırdan bir arayüz istedi (danışan doldurur, sadece kendisine atanmış uzman görür, admin asla göremez — bu son kural zaten vardı) + admin bir formu düzenlediğinde geçmiş cevapların bozulmaması için otomatik versiyonlama. Versiyonlama tasarımı bir Plan-agent ile stres testine tabi tutuldu, bulunan riskler (POST-time yarış durumu, eski versiyondan yanlış fork, cascade-delete'in cevapları silme riski) kapatılarak uygulandı. Frontend tarafı için bkz. `client/claude.md`/`expert/claude.md`'nin 11. tur girdileri.
> - **`forms/models.py` → `Form.group_key`/`Form.version`** (yeni alanlar) + `UniqueConstraint(group_key, version)` + kısmi `UniqueConstraint(group_key, condition=is_active=True)` (bir grupta aynı anda sadece bir aktif versiyon garantisi, DB seviyesinde). Migration (`0002_...`) ilk denemede `AddField(default=uuid.uuid4)`'ın SQLite'ta callable default'u satır başına DEĞİL, TEK SEFER hesaplayıp DDL'e gömdüğü (var olan 3 form da AYNI group_key'i alıp ikinci constraint'te unique ihlaline yol açtı) gerçek bir Django/SQLite tuzağına çarptı — düzeltme: migration'a elle bir `RunPython` adımı eklenip her var olan satıra gerçekten benzersiz bir UUID atandı.
> - **Yeni `forms/versioning.py`**: `fork_form_version(form)` — formun grubunu `select_for_update` ile kilitleyip (Postgres'te gerçek kilit, SQLite'ta no-op ama SQLite zaten tek-yazarlı) güncel versiyonu TEKRAR okuyor (concurrent fork'u önlemek için), hâlâ ≥1 cevabı varsa Form+Question+QuestionOption ağacını yeni PK'larla derin kopyalıyor, eskiyi `is_active=False` yapıyor (YENİ satırdan ÖNCE — sırası tersse kısmi unique constraint INSERT anında patlıyor, gerçekten yaşandı ve düzeltildi), `next_question` self-referansını ikinci geçişte düzeltiyor (formun dışına işaret eden var olan bir veri hatasını sessizce taşımak yerine loglayıp `None` bırakıyor). Cevabı yoksa hiçbir şey yapmadan aynı formu döner (versiyon şişmez — kullanıcı kararı).
> - **`forms/admin.py` → `VersionForkAdminMixin`** (`FormAdmin`/`QuestionAdmin`/`QuestionOptionAdmin`'e uygulandı): GET'te obj güncel versiyon VE cevaplıysa hemen fork'layıp admin'i yeni (cevapsız) versiyondaki eşdeğerine yönlendiriyor (**sadece UX kolaylığı**). **Gerçek güvenlik sınırı `has_change_permission`/`has_delete_permission`** — Django bunları HER istekte (GET'e hiç uğramadan gelen bir POST, ikinci sekme, inline formset'lerin silme checkbox'ları dahil) taze bir `obj` ile kontrol ediyor; sadece grubun EN GÜNCEL versiyonu VE hiç cevabı yoksa `True` dönüyor — eski (stale) versiyonlar cevap sayısından bağımsız HER ZAMAN salt-okunur (Django'nun kendi has_view+not-has_change render'ı). Bu iki katmanlı tasarım (GET-yönlendirme = kolaylık, permission = gerçek engel) bir Plan-agent'ın bulduğu "sadece GET'i koru, POST açık kalır" açığını kapatıyor. `QuestionAdmin.formfield_for_foreignkey` ile `next_question` dropdown'ı da artık sadece aynı formun sorularını gösteriyor (versiyonlama sonrası aynı isimli çok sayıda soru göründüğü için bu karışıklığı önlemek daha kritik hale geldi).
> - **🔴 [KRİTİK, bu turda keşfedildi ve düzeltildi] `forms/views.py` → `FormSubmitView` hiçbir zaman skor hesaplamıyordu**: `FormResponse.objects.create()` cevaplar eklenmeden ÖNCE çağrılıyordu, `save()` içindeki risk_level/percentage_score hesaplaması `total_score`'un model varsayılanı olan `0.0`'a göre çalışıp bir daha ASLA yeniden hesaplanmıyordu — yani gerçek API üzerinden gönderilen HER form cevabı, ne cevaplanırsa cevaplansın, her zaman `total_score=0`, ve DAST-10 gibi formlarda her zaman en düşük risk seviyesini gösteriyordu (expert'in gördüğü risk değerlendirmesi tamamen anlamsızdı). Ayrıca `AnswerSubmitSerializer`'da `numeric_answer` alanı HİÇ yoktu — `scale`/`number` tipi soruların cevabı `Answer.numeric_answer`'a hiçbir zaman yazılamıyordu (SDS gibi scale-tipi formlar skorlama açısından işlevsizdi). Düzeltme: `AnswerSubmitSerializer`'a `numeric_answer` eklendi + `validate()` artık `Question.QUESTION_TYPES`'ın TÜM tiplerini kapsıyor (önceden sadece `text` ve var olmayan bir `'test'` tipi kontrol ediliyordu — `yes_no`/`single_choice`/`scale`/`number`/`date`/`textarea` hiç doğrulanmıyordu); `FormSubmitView.post()` artık her `Answer` için `calculate_score()`'u çağırıp (`selected_options.set()` SONRASINDA, sıra önemli) topluyor, tüm cevaplar oluşturulduktan SONRA `FormResponse.total_score`'u gerçek toplamla set edip tekrar `save()` çağırıyor (risk_level/percentage_score bu ikinci save'de doğru hesaplanıyor).
> - **🟡 Küçük yan düzeltme**: `FormResponse.save()`, `scoring_type='none'` olan formlarda `calculate_risk_level()`'ın döndürdüğü `None`'ı `risk_level` (null=True OLMAYAN bir CharField) alanına yazmaya çalışıp `IntegrityError` ile çöküyordu — `or ''` eklendi. Seed verisindeki 3 formun hiçbiri `scoring_type='none'` olmadığı için bu daha önce hiç tetiklenmemişti, ama bu turda inşa edilen submit akışının kendi test senaryosunda anında ortaya çıktı.
> - **`forms/views.py` → güvenlik sıkılaştırması**: `FormClientResponsesView`/`FormClientResponseDetailView`, bir danışan henüz bir uzmana atanmamışsa (`ClientProfile.expert=None`) HERHANGİ bir uzmanın erişmesine izin veriyordu (`if client_profile.expert and client_profile.expert != expert` → `expert=None` iken koşul hep `False`) — kullanıcının "ilişkilendirilmiş danışanları" ifadesiyle doğrudan çelişiyordu. `!= expert` olarak sıkılaştırıldı, artık sadece gerçekten atanmış uzman erişebiliyor.
> - **`forms/serializers.py` → `FormListSerializer`'a `has_responded`** (SerializerMethodField, `context['request']` gerekiyor) eklendi — client'ın Formlar sekmesinin "bekleyen/dolu" ayrımını ekstra sorgu yapmadan gösterebilmesi için. Dedupe/has_responded mantığı bilinçli olarak GRUP bazlı değil, TAM FORM SATIRI bazlı bırakıldı — kullanıcı kararıyla (yeni versiyon = tekrar doldurulabilir) zaten birebir örtüşüyor.
> - **Doğrulama — tamamı gerçekten ÇALIŞTIRILARAK yapıldı, sadece kod okuması değil**: Django shell'de izole bir test formuyla fork mekanizmasının tüm senaryoları (cevapsızken fork yok, cevaplıyken fork oluyor + eski donmuş kalıyor + `next_question` doğru remap oluyor + idempotent) doğrulandı; Django `test.Client` ile GERÇEK HTTP istekleriyle admin akışının tamamı (cevapsız form GET→200 fork yok; cevaplı form GET→302 fork+yönlendirme; stale versiyon GET→200 salt-okunur, save butonu yok; stale versiyona POST→403 PermissionDenied, veri değişmedi) uçtan uca test edildi; `APIRequestFactory`+`force_authenticate` ile gerçek bir submit akışı çalıştırılıp `total_score`/`risk_level`/`answer_score` değerlerinin beklenen sonuçlarla birebir eşleştiği doğrulandı. `manage.py check` her adımda temiz.

> ## 🔧 Son Değişiklikler (2026-08-19, 10. tur) — Zoom Mock URL Placeholder Düzeltmesi
> Kök [claude.md](../claude.md)'nin 8. turda sadece teşhis edilen (bilinçli düzeltilmeyen) Zoom 404 sorunu, önerilen (a) seçeneğiyle çözüldü. Kapsam: `zoom/services.py`, `appointments/views.py`, `appointments/serializers.py`.
> - **`zoom/services.py`**: yeni, paylaşılan `create_mock_zoom_meeting(appointment_id)` fonksiyonu eklendi — `appointment_id`'yi 10 haneye `zfill` ile doldurup `https://zoom.us/j/<id>` formatında gerçek bir absolute URL üretiyor (`start_url`/`join_url` aynı değeri paylaşıyor, mock amaçlı host/join ayrımı gereksiz görüldü).
> - **`appointments/views.py`** (`AppointmentDetailView`, durum `confirmed`'e çekildiğinde) **ve `appointments/serializers.py`** (`CreateAppointmentWithZoomSerializer.create`, expert'in `POST /appointments/expert/create/` ile doğrudan `confirmed` randevu oluşturduğu akış) — ikisinde de `ENVIRONMENT != 'Production'` dalında ayrı ayrı tekrarlanan `{"start_url": "mock url", "join_url": "mock url", "id": f"mock_meeting_{...}"}` literal dict'i kaldırılıp `create_mock_zoom_meeting(instance.id)` / `create_mock_zoom_meeting(appointment.id)` çağrısıyla değiştirildi.
> - **Doğrulama**: `python -m py_compile` (3 dosya) temiz; `venv/Scripts/python manage.py check` → "System check identified no issues"; Django shell'de gerçekten `create_mock_zoom_meeting(42)` ve `create_mock_zoom_meeting(123456789012)` çağrılıp çıktının `{"start_url": "https://zoom.us/j/...", ...}` şeklinde olduğu görüldü. **Gerçek bir randevu onaylanıp Zoom butonuna tarayıcıda tıklanarak uçtan uca test edilmedi.**

> ## 📜 Daha Eski Turlar (2026-08-19, 10. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" listesinde ✅ maddeleri olarak duruyor (Zoom mock URL placeholder'a çevrildi [10. tur], CSRF koruması [5. tur], AvailabilityExceptionView serializer düzeltmesi [4. tur], access token refresh [3. tur], ProfileView write/read-serializer tutarsızlığı + `timezone` alanı eksikliği [devam turu], login/me `id`/`role` eksikliği + danışanın kendi talebini geri çekebilmesi [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- backend/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
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
├── notifications/             (12. tur, YENİ) → Bildirim sistemi
│   ├── models.py               → Notification (user, notification_type, dedupe_key, appointment FK,
│   │                          is_read/read_at) - UniqueConstraint(user, dedupe_key) idempotency temeli
│   ├── services.py              → sync_appointment_reminders() (3 gün içindeki confirmed randevular için
│   │                          get_or_create ile bildirim üretir - job scheduler YOK, her GET'te çalışır),
│   │                          cleanup_old_read_notifications() (20 günden eski okunmuşları siler)
│   └── views.py                 → NotificationListView (GET, sync+cleanup tetikler), NotificationMarkReadView (PATCH)
│
├── api/v1/urls.py            → accounts/, zoom/, appointments/, forms/, availability/, notifications/ include'ları
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
5. 🟡 Rate limiting yok (`django-ratelimit` requirements'ta yok, `settings.py`'de throttle sınıfı yok).
6. 🟡 DRF pagination global olarak tanımlı değil; `available-experts/` gibi bazı uçlar Python içinde ağır döngüsel hesap yapıyor (asıl risk burada, appointments listesi zaten tarih aralığıyla sınırlı).
7. 🟢 CI yok, otomatik test yok (appointments hariç neredeyse hiçbir app'te) — bu turda kurulan yerel ortam bunu değiştirmedi, sadece manuel test/doğrulamayı mümkün kıldı.
8. ✅ **[DÜZELTİLDİ — 2026-08-19, 10. tur]** ~~Dev/mock ortamda `zoom_join_url`/`zoom_start_url` literal `"mock url"` string'i taşıyordu, frontend `window.open()` bunu relative path sanıp kendi 404 sayfasına düşüyordu~~ — `zoom/services.py`'ye eklenen `create_mock_zoom_meeting()` artık gerçek `https://zoom.us/j/...` formatında bir URL döndürüyor. Detay için yukarıdaki "10. tur" changelog girişine bakın. **Tek açık nokta**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı.
9. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormSubmitView`, gönderilen HİÇBİR form cevabı için gerçek bir skor hesaplamıyordu — `total_score` her zaman `0.0`'da kalıyor, `risk_level`/`percentage_score` submission anındaki bu sıfıra göre hesaplanıp bir daha asla güncellenmiyordu (expert'in gördüğü risk değerlendirmesi anlamsızdı); ayrıca `AnswerSubmitSerializer`'da `numeric_answer` alanı hiç yoktu, `scale`/`number` tipi sorular (örn. SDS formu) skorlama açısından işlevsizdi~~ — `FormSubmitView.post()` artık her cevap için `Answer.calculate_score()`'u çağırıp topluyor, `FormResponse.total_score`'u gerçek toplamla tekrar `save()` ediyor; `AnswerSubmitSerializer`'a `numeric_answer` eklendi. Gerçekten çalıştırılarak (Django shell + `APIRequestFactory`) doğrulandı. Detay için yukarıdaki "11. tur" changelog girişine bakın.
10. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, bir danışan henüz bir uzmana atanmamışsa (`ClientProfile.expert=None`) HERHANGİ bir uzmanın erişmesine izin veriyordu~~ — `client_profile.expert != expert` olarak sıkılaştırıldı, artık sadece gerçekten atanmış uzman erişebiliyor.
11. 🟡 **[11. turda bulundu, bilinçli olarak kapsam dışı bırakıldı]** `forms/models.py` → `Question.next_question`, hiçbir queryset kısıtı olmadan TÜM formlardaki soruları referans alabiliyor (formlar arası çapraz link mümkün) — sadece admin panelindeki dropdown `QuestionAdmin.formfield_for_foreignkey` ile aynı forma sınırlandı (11. tur), model seviyesinde bir `clean()`/validasyon eklenmedi.
12. ✅ **[DÜZELTİLDİ — 2026-08-20, 13. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, URL'deki `client_id`'yi önce `ClientProfile.id` olarak yorumlamayı deniyordu; tek gerçek çağıran taraf (expert frontend) her zaman `User.id` gönderdiği için, `User.id` sayısal olarak alakasız bir `ClientProfile`'ın PK'sıyla çakışırsa view YANLIŞ danışan profiline eşleşiyordu — en iyi ihtimalle yanlış bir 403, en kötü ihtimalle (çakışan profil aynı expert'e aitse) bir danışanın klinik verisinin başka bir danışan adı altında gösterilmesi~~ — gerçek DB'de bu turda TEYİT EDİLDİ (gerçek bir danışan için yanlışlıkla 403 alındığı görüldü) ve düzeltildi: artık `client_id` doğrudan ve sadece `User.id` olarak yorumlanıyor. Detay için yukarıdaki "13. tur" changelog girişine bakın.

---
**Son Güncelleme**: 2026-08-20, 13. tur (🔴 Kritik bug düzeltmesi: `forms/views.py`'deki `client_id` çözümleme belirsizliği bir danışanın verisinin başka bir danışan adı altında gösterilmesine yol açabiliyordu — expert'in yeni danışan-formu matrisini gerçek veriyle doğrularken bulundu, `APIRequestFactory` ile hem bug'ın varlığı hem düzeltmesi doğrulandı; frontend tarafı için expert/claude.md'ye bakın)
