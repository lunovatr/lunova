# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır.

> ## 🔧 Son Değişiklikler (2026-08-17, 5. tur) — CSRF Koruması
> Sistemin en kritik açık güvenlik bulgusu kapatıldı. Kapsam: `accounts/authentication.py`, `accounts/views/views.py`, `lunova_backend/settings.py`. Tam gerekçe ve curl doğrulama adımları için kök [claude.md](../claude.md)'deki 5. tur changelog'una bakın; burada sadece backend'e özgü teknik detaylar.
> - **`accounts/authentication.py` → `CookieJWTAuthentication`**: `enforce_csrf()` eklendi — DRF'in `rest_framework.authentication.CSRFCheck` sınıfı (Django'nun `CsrfViewMiddleware`'ini DRF için sarmalayan, zaten hazır bulunan bir yardımcı — `SessionAuthentication.enforce_csrf()`'in kullandığının birebir aynısı) yeniden kullanıldı. Token `Authorization` header'ından değil cookie'den geldiğinde (`header is None`) çağrılıyor — Bearer token ile gelen istekler (Postman, `test_accounts_complete.py` gibi script'ler) tarayıcı cookie'sine güvenmediği için CSRF riski taşımıyor, muaf.
> - **`accounts/views/views.py`**: `LoginView.post()` ve `MeView.get()` artık `django.middleware.csrf.get_token(request)` çağırıyor — bu, Django'nun `csrftoken` cookie'sini (httpOnly DEĞİL, JS okuyabiliyor) mint ediyor. `MeView`'da da çağrılması bilinçli: frontend'ler her açılışta zaten `/me/`'yi çağırıyor, bu sayede bu deploy'dan önce login olmuş oturumlar da zorla yeniden login'e gerek kalmadan CSRF cookie'sine "backfill" ediliyor.
> - **`lunova_backend/settings.py`**: `set_auth_cookies()`'teki `access_token`/`refresh_token` cookie'leri ve `CSRF_COOKIE_SAMESITE` `None` → `'Lax'`. Yeni `CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS` (Django'nun cross-origin Origin-header kontrolü için gerekli, yoksa CORS'a zaten izinli meşru istekler de CSRF 403 alırdı). **Kritik ek düzeltme**: `CSRF_COOKIE_DOMAIN = SESSION_COOKIE_DOMAIN` eklendi — bu olmadan prod'da `csrftoken` cookie'si Django varsayılanıyla (`None`) backend'in KENDİ host'una (örn. `api.lunova.tr`) host-only scope olurdu; `access_token`/`refresh_token`'ın aksine (onlar `set_auth_cookies()` içinde açıkça `domain='lunova.tr'` alıyor) bu, `uzman.lunova.tr`/`danisan.lunova.tr` üzerindeki JS'in cookie'yi hiç okuyamamasına ve prod'da HER state-değiştiren isteğin kırılmasına yol açardı — sadece kod okuyarak fark edilen, curl ile test edilemeyen (dev'de tek host `localhost` olduğu için bu hata dev'de hiç görünmezdi) bir risk.
> - **Doğrulama**: `manage.py check` temiz. `curl` ile: orijinal PoC (CSRF token'sız form-encoded `POST /accounts/logout/`) artık `205` yerine `403`; gerçek `Origin: http://localhost:5174` header'ı + doğru `X-CSRFToken` ile aynı istek `205`; `Authorization: Bearer` ile (cookie'siz) istek CSRF kontrolüne hiç takılmadan view mantığına ulaşıyor (muafiyet doğru); `GET /accounts/me/` CSRF token'sız hep çalışıyor (safe method). Frontend tarafının (axios `withXSRFToken`) gerçek bir tarayıcıda uçtan uca çalıştığı tıklanarak doğrulanamadı (bu ortamda tarayıcı otomasyon aracı yok) — bkz. kök claude.md'deki "🟠 En öncelikli açık madde".
> - **Yan bulgular (kritik değil, düzeltilmedi)**: `SIMPLE_JWT` içindeki `AUTH_COOKIE*` anahtarları hiçbir yerde okunmuyor (ölü config, değer tutarlılığı için `'Lax'`a güncellendi ama işlevsiz). `LogoutView` sadece `refresh_token`'ı blacklist'e alıyor, `access_token` kendi 15 dk'lık ömrü boyunca teorik olarak geçerli kalabiliyor (CSRF'le ilgisiz, önceden beri var olan JWT tasarım tercihi).

> ## 🔧 Son Değişiklikler (2026-08-17, 4. tur) — AvailabilityExceptionView.delete() Serializer Düzeltmesi
> Bir önceki turda "sıradaki oturumda öncelikli düzeltme adayı" olarak işaretlenen madde bu turda kapatıldı (kök [claude.md](../claude.md)'deki 4. tur changelog'una bakın, orada aynı kalıbın client tarafındaki bir örneği — `ExpertAvailability.tsx` navigate no-op — de düzeltildi). Kapsam: sadece `availability/views.py`.
> - **`availability/views.py` → `AvailabilityExceptionView.delete()`**: `deleted`/`current` listelerini üretirken artık `AvailabilityExceptionSerializer` (GET/PUT'un kullandığı zengin serializer) kullanılıyor, `AvailabilityExceptionDeleteSerializer` (dar, sadece `id/date/start_time/end_time`) sadece input doğrulaması için (`self.get_serializer(data=item)`, `get_serializer_class()` üzerinden) kullanılmaya devam ediyor — ProfileView.update()'te uygulanan çözümle birebir aynı desen. `curl` ile uçtan uca doğrulandı: `exception_type='add'`, `start_time`/`end_time` dolu bir istisna oluşturulup silindi; `deleted` listesindeki kayıtta artık `exception_type`, `note`, `expert_name`, `service_name`, `created_at` alanlarının hepsi mevcut (önceden hepsi kayboluyordu).
> - Repo genelinde bu kalıptan (output için input-serializer'ı yeniden kullanma) etkilenen başka bir view kalmadı — `ProfileView` ve bu view dışında `RetrieveUpdateAPIView`/`UpdateAPIView` kullanan tek yer `AppointmentDetailView`, o zaten temizdi (yukarıdaki "devam" turu notuna bakın).

> ## 🔧 Son Değişiklikler (2026-08-17, 3. tur) — Access Token Refresh Mekanizması
> Kapsam: `accounts/views/views.py` (yeni `TokenRefreshView` + ortak `set_auth_cookies()` helper'ı, `LoginView` bunu kullanacak şekilde refactor edildi), `accounts/urls.py` (`token/refresh/` route'u), `lunova_backend/settings.py` (`REFRESH_TOKEN_LIFETIME`: 7 gün → 1 saat). Tam detay ve tasarım gerekçesi için kök [claude.md](../claude.md)'deki güncel changelog'a bakın; teknik özet yukarıdaki "SIMPLE_JWT gerçek değerleri" bölümünde. **Ayrıca bu turda yeni bir kritik güvenlik bulgusu (CSRF) tespit edildi, düzeltilmedi — bkz. aşağıdaki "Bilinen Gerçek Sorunlar" listesinin 1. maddesi.**

> ## 🔧 Son Değişiklikler (2026-08-17, devam) — Profil Düzenleme + Yerel Ortam
> Kapsam: `accounts/views/profile.py`, `accounts/serializers/profile_update_serializers.py` + yerel geliştirme ortamı kurulumu. Tam detay ve öncelikli "sıradaki iş" listesi için kök [claude.md](../claude.md)'deki güncel changelog'a bakın; burada sadece backend'e özgü teknik detaylar var.
>
> - **`accounts/views/profile.py` → `ProfileView`**: `update()` override edildi. Önceden `RetrieveUpdateAPIView`'ın varsayılan davranışı, PATCH/PUT sonrası `Response(serializer.data)`'yı GÜNCELLEME sırasında kullanılan write-serializer (`ExpertProfileUpdateSerializer`/`ClientProfileUpdateSerializer`) ile üretiyordu — bu serializer'ların alan seti/şekli GET'in kullandığı `ExpertProfileSerializer`/`ClientProfileSerializer`'dan tamamen farklı (`user_data` vs `user`, ham FK/PK id'leri vs isim string'leri, `approval_status`/`rating_average`/`expert` gibi alanlar hiç yok). Artık `update()`, kaydettikten sonra instance'ı GET'teki read-serializer ile yeniden serileştirip dönüyor — `get_read_serializer_class()` adında yeni bir yardımcı metod eklendi.
> - **`accounts/serializers/profile_update_serializers.py` → `BaseUserUpdateSerializer`**: `Meta.fields`'e `timezone` eklendi (`extra_kwargs`'a da `required: False`). Model alanı zaten vardı (`User.timezone`, default `"Europe/Istanbul"`), GET response'unda (`UserProfileSerializer`) zaten dönüyordu, ama update serializer'da yoktu — client'ın "İletişim Bilgileri" kartı bu alanı gönderiyordu ama DRF sessizce yok sayıyordu (hata yok, değişiklik de kalıcı olmuyordu).
> - **✅ [4. TURDA DÜZELTİLDİ]** ~~AYNI KALIP BAŞKA BİR YERDE BULUNDU~~: `availability/views.py` → `AvailabilityExceptionView.delete()` — bkz. yukarıdaki "4. tur" changelog girişi.
> - Repo genelinde `RetrieveUpdateAPIView`/`UpdateAPIView` kullanan sadece 2 view var: `ProfileView` (düzeltildi) ve `appointments/views.py` → `AppointmentDetailView` (zaten GET ile aynı `AppointmentSerializer`'ı tutarlı kullanıyor, `status_update()` de aynı şekilde `response_serializer = AppointmentSerializer(instance)` yapıyor — bu ikisi temiz).
> - Küçük not: `appointments/serializers.py` → `ClientCreateAppointmentSerializer` (POST/create) ile `AppointmentSerializer` (GET/list) arasında da alan farkı var (`is_confirmed`, `zoom_*` alanları create serializer'da yok) — update değil create senaryosu olduğu için önceliği düşük, ama aynı "response şekli tutarsız" ailesinden.
>
> **Yerel geliştirme ortamı artık çalışıyor durumda** (önceki oturumların "Python/Django kurulu değil, test edilemedi" notları artık geçerli değil):
> - `backend/venv/` — **Python 3.12** ile kuruldu (sistemde varsayılan olan Python 3.14 ile `psycopg2`/`pyiceberg`/`pyroaring` derlenmiş wheel bulamıyor, C++ derleyici de yok — 3.12 ile `requirements.txt` hiç değiştirilmeden eksiksiz kuruluyor, ayrıntı için kök claude.md).
> - Mevcut `.env` (diskte var, gitignore'da) + mevcut `db.sqlite3` (migrate+seed edilmiş, 96 kullanıcı) ile `python manage.py runserver` çalıştırıldı, `manage.py check` temiz, profil GET/PATCH akışı gerçek `curl` istekleriyle uçtan uca doğrulandı (bkz. kök claude.md changelog).
> - Bu doğrulama sırasında **15 dakikalık access token süresi canlı olarak yeniden üretildi** (bir test oturumunun cookie'si ~15 dk sonra 401'e düştü) — aşağıdaki "en kritik eksik" maddesi tahmine değil, bu turda gözlemlenmiş bir gerçeğe dayanıyor.

> ## 🔧 Son Değişiklikler (2026-08-17) — Randevu Zinciri
> Kapsam: sadece randevu (appointments) zinciriyle ilgili dosyalar değişti — `zoom/`, `forms/`, `availability/` dokunulmadı.
> - **`accounts/views/views.py`**: `MeView` ve `LoginView` response'larına `id` ve `role` eklendi. Önceden ikisi de bu alanları döndürmüyordu; bu yüzden expert frontend kendi `User.id`'sini hiçbir zaman öğrenemiyor, `role` her zaman frontend'de hardcoded `'expert'` varsayımına düşüyordu. Bu artık gerçek DB değerini dönüyor.
> - **`accounts/serializers/serializers.py`**: `ExpertListSerializer` ve `ClientListSerializer`'a `user_id` (source=`user.id`) alanı eklendi. Bu iki serializer'ın `id` alanı hâlâ kendi profile PK'sı (`ExpertProfile.id`/`ClientProfile.id`) — DEĞİŞMEDİ, geriye dönük uyumluluk için. Ama artık randevu/müsaitlik gibi `User.id` bekleyen her akış için doğru alan (`user_id`) da mevcut. Bu iki serializer'ı tüketen her yeni kod `id` değil `user_id` kullanmalı.
> - **`appointments/views.py` → `status_update()`**: Yeni izin kuralı eklendi — danışan artık henüz uzmanın onaylamadığı kendi talebini geri çekebiliyor (`waiting_approval` → `cancelled`, `instance.client == user` kontrolüyle). Önceden bu geçişi sadece uzman yapabiliyordu (danışan onaysız bir talebi asla iptal edemiyordu).
> - **Doğrulandı, dokunulmadı**: `expert/ToDo.md`'deki "randevu reddetme 403" hatası — mevcut kod (`partial_update`'in `status` alanı geldiğinde `status_update()`'e yönlendirmesi, commit `b74a87d`) bu sorunu zaten çözmüş görünüyor. Regresyon yok, tekrar dokunulmadı.
> - Test edilemedi: bu ortamda çalışan bir Python/Django kurulumu yok (`python`/`python3`/`py` hepsi Windows execution-alias stub'ı, gerçek yorumlayıcı değil). Değişiklikler dikkatli manuel kod incelemesiyle doğrulandı, gerçek migration/DB ile henüz koşulmadı.

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
│   ├── services.py           → get_zoom_access_token(), create_zoom_meeting() (Server-to-Server OAuth)
│   ├── urls.py                → SADECE POST /meetings/ (create_zoom_meeting fonksiyon view'ı)
│   └── (appointments/views.py bu servisi doğrudan import edip çağırıyor — bağımsız REST kaynağı değil)
│
├── forms/                    ⭐ Tam işlevsel klinik form/skorlama motoru (DAST-10, SDS, genel sağlık)
│   ├── models.py              → Form.calculate_risk_level(), Answer.calculate_score() otomatik hesaplama
│   └── views.py                → Client ve Expert için ayrı response görünümleri, rol bazlı yetki
│
├── api/v1/urls.py            → accounts/, zoom/, appointments/, forms/, availability/ include'ları
├── lunova_backend/settings.py
├── requirements.txt           ⚠️ UTF-16 kodlu dosya (bazı ortamlarda pip sorunu çıkarabilir)
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

---
**Son Güncelleme**: 2026-08-17, 5. tur (CSRF koruması kapatıldı — `enforce_csrf()` + `SameSite=Lax` + `CSRF_TRUSTED_ORIGINS`/`CSRF_COOKIE_DOMAIN`, `curl` ile sıkı doğrulandı, gerçek tarayıcı testi bekliyor)
