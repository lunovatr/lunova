# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır (dokümantasyon bakım kuralları da orada — kısaca: `backend/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-24, 20. tur) — Yeni `mailer/` App'i: Mail Gönderimi Merkezileştirildi
> Kullanıcı önce backend'in mail konusunda ne yapabildiğini sordu (kod taraması tek bir yer buldu: `accounts/views/views.py::PasswordResetRequestView` içine gömülü bir `send_mail` çağrısı), sonra bunun mimaride nereye toplanması gerektiğini tartıştık. Kullanıcı ileride seans hatırlatması, admin duyuru/kampanya, randevu talebi/onay/iptal durumu ve danışan mesajı → uzman bildirimi gibi birçok yeni mail türü ekleneceğini belirtip `mailer` adında ayrı bir app kurulmasını istedi.
> - **`backend/mailer/` app'i** — `zoom/` app'iyle BİREBİR aynı şekilde: sadece `__init__.py` + `apps.py` (`MailerConfig`) + `services.py`. `models.py`/`migrations/`/`views.py`/`urls.py` YOK — bağımsız bir REST kaynağı değil, diğer app'lerin `from mailer.services import ...` ile doğrudan çağırdığı bir servis katmanı (appointments'ın `zoom.services`'i çağırma şekliyle aynı desen). `INSTALLED_APPS`'a eklendi.
> - **`mailer/services.py::send_email(to_email, subject, body, *, fail_silently=False)`** — tüm gelecekteki `send_<tür>_email()` sarmalayıcılarının içeriden çağıracağı tek gönderim noktası. `settings.ENVIRONMENT != 'Production'` kontrolü (gerçekten SMTP'ye mi gidilecek yoksa konsola mı loglanacak) artık SADECE burada — önceden bu `if settings.ENVIRONMENT == 'Production': ... else: ...` bloğu doğrudan `PasswordResetRequestView.post()` içine yazılmıştı, yeni bir mail türü eklendikçe aynı kontrolün tekrar tekrar kopyalanması gerekecekti. Production'da `django.core.mail.send_mail(subject, body, settings.EMAIL_HOST_USER, [to_email])` çağrılıyor (from-adresi bilinçli olarak `EMAIL_HOST_USER` — `settings.DEFAULT_FROM_EMAIL`'e geçilmedi, bkz. aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" yeni madde 17), hata durumunda `logger.exception()` ile loglanıp varsayılan olarak (`fail_silently=False`) yeniden fırlatılıyor — `fail_silently=True` verilirse loglanıp `False` döner, exception yutulur (ileride bir randevu/durum güncellemesi gibi ana akışın YANINDA giden bir bildirim maili SMTP arızası yüzünden ana işlemi 500'letmesin diye eklendi).
> - **`send_password_reset_email(to_email, reset_url)`** — ilk (şimdilik tek) tipli sarmalayıcı, `notifications/services.py`'deki "her olay için ayrı fonksiyon" deseniyle tutarlı. Bilinçli olarak bir `EmailKind` enum'u/registry'si ya da Django email template'i eklenmedi — tek mail türü varken bu bir YAGNI ihlali olurdu; yeni bir tür geldiğinde aynı desende bir fonksiyon daha eklenecek.
> - **`accounts/views/views.py::PasswordResetRequestView`** — artık `django.core.mail.send_mail`'i doğrudan import/çağırmıyor, `mailer.services.send_password_reset_email()`'i çağırıp fırlayan exception'ı kendi `500 {"error": str(e)}` response'una çeviriyor (orijinal davranışla birebir). View'ın kendi dev-only debug print'leri (Postman body örneği + prod-URL önizlemesi) AYNEN korundu — bunlar mailer'ın genel işi değil, şifre sıfırlamaya özel bir test kolaylığı, o yüzden mailer'a taşınmadı.
> - **Görünen isim (aynı tur içinde eklendi)** — kullanıcı, production'daki `noreply@lunova.tr` Gmail hesabına gerçek girişle erişip cevapları görebileceğini (app password'ün normal girişi kısıtlamadığını) doğruladıktan sonra harici bir mail servisine geçmek istemedi, sadece bir görünen isim istedi. `send_email()`'e `from_name: str = DEFAULT_FROM_NAME` (`"Lunova Destek"`) eklendi — From ADRESİ (`EMAIL_HOST_USER`) DEĞİŞMEDİ (Gmail'in giriş/gönderen eşleşmesi kısıtı hâlâ geçerli), sadece `f"{from_name} <{settings.EMAIL_HOST_USER}>"` ile birleştirilen görünen etiket ekleniyor. `from_name` her `send_<tür>_email()` çağrısında override edilebilir (varsayılan `send_password_reset_email()` için "Lunova Destek"). Dev-mode konsol logu da From satırını gösterecek şekilde güncellendi; `APIRequestFactory` ile yeniden çalıştırılıp `From: Lunova Destek <noreply@lunova.tr>` çıktısı doğrulandı.
> - **Doğrulama**: `manage.py check` + `makemigrations --check --dry-run` temiz. Gerçek `db.sqlite3` üzerinde `APIRequestFactory` ile (view salt-okunur — `User.objects.get()` dışında hiçbir DB yazması yok, veriye zarar riski sıfır): (1) dev ortamında `200` dönüp mailer'ın kendi konsol logunun VE view'ın orijinal Postman/prod-URL çıktısının ikisinin de aynı anda, önceki davranışla birebir göründüğü teyit edildi; (2) `settings.ENVIRONMENT` geçici olarak `'Production'`a çevrilip gerçek console `EmailBackend` ile `send_email()`'in `django_send_mail()`'i gerçekten çağırdığı ve `True` döndürdüğü doğrulandı; (3) `mailer.services.django_send_mail` mock'lanıp `RuntimeError` fırlatıldığında `fail_silently=False`'ın (varsayılan) exception'ı olduğu gibi fırlattığı, `fail_silently=True`'nun ise loglayıp `False` döndürdüğü ayrı ayrı doğrulandı; (4) aynı mock production simülasyonuyla `PasswordResetRequestView` üzerinden uçtan uca çağrılıp `500 {"error": "..."}` döndüğü (orijinal view davranışıyla birebir) doğrulandı.
> - **Bilinçli olarak bu turda YAPILMADI**: `EmailLog` modeli/admin kaydı, Django email template'leri (`.txt`/`.html`), toplu/kitlesel gönderim, zamanlanmış görev altyapısı (randevu hatırlatma maili için gerekecek — kök `claude.md`'nin "🧭 Geliştirme Fikirleri" madde 1'ine bakın) ve randevu/mesaj olaylarının `mailer`'a bağlanması — kullanıcı bunları kendisi bir sonraki aşamada appointments/messaging tarafında kuracağını belirtti, `mailer` app'i şu haliyle o çağrıları almaya hazır.

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

> ## 📜 Daha Eski Turlar (2026-08-24, 17. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" listesinde ✅ maddeleri olarak duruyor (belge onay/red akışı + admin panel genel güçlendirmesi + form versiyon görünürlüğü eklendi [17. tur], veritabanı besleme script'lerine isimlendirilmiş ekip hesapları + `messaging`/`notifications` feed'leri + `feed_db.py` orkestrasyon script'i eklendi [16. tur], mesaj sınırlaması saatlik throttle'dan seans-bazlı bir kotaya çevrildi (`messaging/services.py::get_client_remaining_quota()`, ayrı bir model/alan olmadan `Appointment`/`Message` verisinden hesaplanan) [15. tur, 25. turda arşive taşındı — daha önce burada gözden kaçmıştı], uzman-danışan not/mesaj sistemi + bildirim zili entegrasyonu eklendi [14. tur], 🔴 kritik `forms/views.py` client_id çakışma bug'ı düzeltmesi [13. tur], global bildirim sistemi eklendi [12. tur], danışan formları otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], CSRF koruması [5. tur], AvailabilityExceptionView serializer düzeltmesi [4. tur], access token refresh [3. tur], ProfileView write/read-serializer tutarsızlığı + `timezone` alanı eksikliği [devam turu], login/me `id`/`role` eksikliği + danışanın kendi talebini geri çekebilmesi [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- backend/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-22, 17. tur — Yeni Özellik: Belge Onay/Red Akışı (Admin) + Admin Panel Genel Güçlendirme + Form Versiyonu Görünürlüğü
> - 2026-08-21, 16. tur — Veritabanı Besleme: İsimlendirilmiş Ekip Hesapları + messaging/notifications Feed'leri + Ana Orkestrasyon Script'i
> - 2026-08-20, 15. tur — Mesaj Sınırlaması Saatlik Throttle'dan Seans-Bazlı Kotaya Çevrildi
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
├── mailer/                    (20. tur, YENİ) → Mail gönderiminin tek geçiş noktası, zoom/ ile aynı şekilde
│                          models.py/migrations/views.py/urls.py YOK (REST kaynağı değil, sadece diğer
│                          app'lerin import ettiği bir servis katmanı - bu yüzden api/v1/urls.py'de DE yer
│                          almıyor, zoom'un aksine tek bir app'e değil hiçbir app'e özel bağımlı değil)
│   └── services.py             → send_email(to_email, subject, body, *, from_name=DEFAULT_FROM_NAME,
│                          fail_silently=False) - "gerçekten SMTP'ye mi gidilecek yoksa konsola mı
│                          loglanacak" kararı (settings.ENVIRONMENT) SADECE burada; From ADRESİ hep
│                          EMAIL_HOST_USER (Gmail giriş kimliğiyle eşleşmek zorunda), from_name SADECE
│                          görünen etiketi değiştirir ("Lunova Destek <adres>"); send_password_reset_email()
│                          ilk tipli sarmalayıcı (PasswordResetRequestView tarafından çağrılır) - yeni bir
│                          mail türü eklendikçe aynı desende bir send_<tür>_email() daha eklenir,
│                          enum/registry/template altyapısı YOK (YAGNI, bkz. 20. tur changelog)
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
17. 🟢 **[25. tur'da bulundu — yeni]** `settings.DEFAULT_FROM_EMAIL` tanımlı (`lunova_backend/settings.py`) ama yeni `mailer/services.py::send_email()`'in gerçek gönderim yolunda kullanılmıyor — bilinçli olarak orijinal davranış (`EMAIL_HOST_USER` gönderen adresi, `PasswordResetRequestView`'ın eski `send_mail()` çağrısıyla birebir aynı) korundu, çünkü Gmail SMTP genelde From başlığının kimlik doğrulama hesabıyla eşleşmesini istiyor - `DEFAULT_FROM_EMAIL`'e geçmek deployment'ta sessiz bir teslim sorununa yol açabilirdi. Düşük öncelik, gerçek SMTP kimlik bilgileri/sağlayıcısı netleştiğinde tekrar değerlendirilebilir.

---
**Son Güncelleme**: 2026-08-24, 20. tur (Mail gönderimi merkezi bir `mailer/` app'ine taşındı - `zoom/` app'iyle aynı şekilde model/migration/view/url'siz, sadece bir servis katmanı. `mailer.services.send_email()` "gerçekten SMTP'ye mi gidilecek yoksa konsola mı loglanacak" kararını [settings.ENVIRONMENT] tek bir yerden veriyor; `send_password_reset_email()` ilk tipli sarmalayıcı, `PasswordResetRequestView` artık `send_mail`'i doğrudan çağırmıyor. Kullanıcı ileride seans hatırlatması, admin duyuru/kampanya, randevu durumu ve danışan mesajı bildirimi gibi birçok yeni mail türü ekleneceğini belirtip bu merkezi app'i istedi - o tetikleme mantıklarını appointments/messaging tarafında kendisi kuracak, bu turun kapsamı sadece mailer'ın kendisiydi. Gerçek bir DB kopyasında `APIRequestFactory` ile 4 senaryo doğrulandı [dev-log, production'da gerçek send_mail çağrısı, SMTP hatası simülasyonunda exception/fail_silently davranışı, view'ın 500 response'u]. Bu arada 15. turun `messaging` kota değişikliği, "son 3 tur ayrıntılı tutulur" kuralına rağmen daha önce arşive taşınmamış bir drift'ti - bu turda düzeltilip arşive katlandı. `manage.py check`/`makemigrations --check --dry-run` temiz)
