# Lunova - Proje Overview ve Mimari Rehber

> **Not (2026-08-14)**: Bu dosya ve alt dizinlerdeki `claude.md` dosyaları, kod tabanı doğrudan okunarak (satır satır `models.py`, `views.py`, `settings.py`, `urls.py`, gerçek `package.json`'lar vb.) doğrulanmıştır. Önceki bir AI ajanının ürettiği ilk sürüm; token ömrü, endpoint listesi, model alanları, dizin ağacı ve bağımlılık versiyonları gibi birçok noktada **kod ile örtüşmeyen (uydurma/varsayılan) bilgiler** içeriyordu. Bu sürümdeki her teknik iddia kaynak koddan doğrulanmıştır. Sonraki agentic çalışmalarda bu dosyalara güvenebilirsin, ama kod değiştikçe bu dosyaların da güncellenmesi gerekir.

> **📌 Kalıcı Kural (her oturumun sonunda uygulanmalı — bkz. somut gerekçe aşağıda)**: Bu proje çok-turlu, çok-ajanlı agentic bir şekilde geliştiriliyor; her oturumun bulguları bir sonrakinin başlangıç noktası oluyor. Bu yüzden **bir oturum kod değiştirdiğinde, bitirmeden önce mutlaka**: **(a)** ilgili `claude.md` dosyasını/dosyalarını (kök + değişen alt dizin) güncellemeli — ne değişti, neden, nasıl doğrulandı (gerçek test/curl/tarayıcı mı, yoksa sadece kod incelemesi mi — bunu açıkça belirt); **(b)** yolculuk sırasında rastlanan ama düzeltilmeyen her yeni kritik/yüksek öncelikli bulguyu, bir sonraki oturumun doğrudan aksiyon alabileceği netlikte (dosya:satır, kök neden, önerilen düzeltme yönü, önem derecesi) buraya eklemeli. Somut gerekçe: `SYSTEM_REPORT.md`, 2026-08-14'te yazıldıktan sonra aynı günün içindeki üç ayrı tur (2026-08-17) boyunca hiç güncellenmeden donmuş kaldı — rapor kimse fark etmeden güncelliğini yitirdi (örn. "token refresh yok" hâlâ "en kritik açık madde" olarak görünüyordu, oysa 3. turda çoktan kapatılmıştı). Bunu tekrarlamamak için o dosyanın içeriği aşağıdaki **"📊 Sistem Durumu Özeti & Yol Haritası"** bölümüne taşındı; `SYSTEM_REPORT.md` artık ayrı bakımı gereken ikinci bir kopya değil, sadece buraya yönlendiren kısa bir stub — **tek doğruluk kaynağı bu dosya ve alt dizinlerdeki `claude.md`'ler**.

> ## 🔧 Son Değişiklikler (2026-08-17, 5. tur) — CSRF Koruması Kapatıldı
> Sistemin en kritik açık güvenlik bulgusu (bkz. "5. tur"dan önceki her turda tekrarlanan uyarı) bu turda kapatıldı. Kapsam: `backend/accounts/authentication.py`, `backend/accounts/views/views.py`, `backend/lunova_backend/settings.py`, `client/src/lib/api.ts`, `expert/src/lib/api.ts`. **İki katmanlı bir çözüm** uygulandı (dokümanların önceden önerdiği (a) VE (b), birbirini tamamlayan savunma katmanları olarak):
> - **Katman 1 — SameSite=None → Lax**: `set_auth_cookies()`'teki `access_token`/`refresh_token` cookie'leri ve `CSRF_COOKIE_SAMESITE` artık `'Lax'`. Tüm frontend'ler backend ile aynı "site" (prod: `lunova.tr` alt alan adları; dev: hepsi `localhost`, port cookie scope'unu etkilemiyor) olduğu için bu, meşru hiçbir akışı bozmadan gerçek cross-site (başka bir domain'den) form/fetch tabanlı CSRF'i tarayıcı seviyesinde engelliyor.
> - **Katman 2 — Gerçek CSRF token doğrulaması**: `CookieJWTAuthentication`'a `enforce_csrf()` eklendi (DRF'in `SessionAuthentication`'ının kullandığı hazır `rest_framework.authentication.CSRFCheck` sınıfı yeniden kullanıldı) — token cookie'den geldiğinde (yani `Authorization` header'ı YOKSA) artık Django'nun standart CSRF token kontrolünü çalıştırıyor; token bir `Authorization: Bearer` header'ından geldiyse (tarayıcı cookie'sine güvenmediği için CSRF riski taşımaz) muaf. `LoginView` ve `MeView`, `django.middleware.csrf.get_token(request)` çağırarak `csrftoken` cookie'sini mint ediyor (`MeView`'da da çağrılması önemli — her SPA açılışında zaten çağrılan bu endpoint, bu deploy'dan ÖNCE login olmuş ve hâlâ geçerli olan oturumları da otomatik "backfill" ediyor, zorla yeniden login istemeden).
> - **`CSRF_TRUSTED_ORIGINS`** eklendi (`CORS_ALLOWED_ORIGINS` ile aynı liste) — Django'nun cross-origin CSRF kontrolü `Origin` header'ını bu listeye karşı doğruluyor, yoksa CORS'a zaten izinli meşru frontend istekleri de CSRF 403 alırdı. **`CSRF_COOKIE_DOMAIN` da eklendi** (`SESSION_COOKIE_DOMAIN` ile aynı mantık) — bu olmadan prod'da `csrftoken` cookie'si sadece backend'in kendi host'una scope olurdu, `uzman.lunova.tr`/`danisan.lunova.tr` üzerindeki JS bunu hiç okuyamaz ve her state-değiştiren istek kırılırdı (kod incelemesiyle bulunan, curl ile test edilemeyen bir risk — bkz. aşağıdaki doğrulama notu).
> - **Frontend'ler**: `client/src/lib/api.ts` ve `expert/src/lib/api.ts`'teki axios instance'larına `xsrfCookieName:'csrftoken'`, `xsrfHeaderName:'X-CSRFToken'`, `withXSRFToken:true` eklendi — üçü de zorunlu (axios varsayılanları Angular konvansiyonu `XSRF-TOKEN`/`X-XSRF-TOKEN`'dır, Django'nunkiyle uyuşmaz; ayrıca axios `withXSRFToken:true` olmadan XSRF header'ını sadece same-origin isteklerde ekler — burada backend her zaman farklı bir portta/subdomain'de olduğu için bu olmadan header hiç gönderilmezdi, bu axios'un kaynak kodu okunarak doğrulandı).
> - **Doğrulama**: Backend `manage.py check` temiz, iki frontend de `tsc --noEmit` temiz. `curl` ile uçtan uca, gerçek saldırı senaryosunu birebir tekrar eden bir test dizisi çalıştırıldı: (1) orijinal PoC — CSRF token'sız, form-encoded `POST /accounts/logout/` — önceden `205` dönüyordu, şimdi `403 {"detail":"CSRF doğrulaması başarısız: CSRF token missing."}`; (2) bloklanan saldırıdan sonra oturumun bozulmadığı doğrulandı; (3) **gerçek tarayıcı senaryosunu birebir simüle eden** `Origin: http://localhost:5174` header'lı cross-origin istek + doğru `X-CSRFToken` → `205` (başarılı); aynı istek CSRF token'sız → `403`; (4) `Authorization: Bearer` header'lı (cookie'siz) istek → CSRF kontrolüne hiç takılmadan asıl view mantığına ulaştığı doğrulandı (muafiyet doğru çalışıyor); (5) `GET /accounts/me/` CSRF token'sız her zaman çalışmaya devam ediyor (safe method muafiyeti). Tüm test kayıtları/cookie jar dosyaları temizlendi.
> - **Doğrulanamayan tek parça — açıkça belirtiliyor**: axios'un `withXSRFToken` mekanizmasının GERÇEK bir tarayıcıda (cookie okuma, header ekleme) uçtan uca çalıştığı, bu ortamda tarayıcı otomasyon aracı olmadığı için tıklanarak doğrulanamadı. Doğrulanan: axios'un kaynak kodu (`node_modules/axios/dist/node/axios.cjs`) okunarak mekanizmanın nasıl çalıştığı teyit edildi, ve backend tarafı yukarıdaki curl testleriyle (özellikle #3, gerçek `Origin` header'ıyla) olabildiğince gerçekçi simüle edildi. Bir sonraki oturumda veya bu makinede gerçek tarayıcıda (client/expert login → bir POST/PATCH işlemi, örn. profil kaydetme veya randevu iptali → başarılı olduğunu gözlemle) doğrulanması önerilir.
> - **Bu turda ayrıca fark edilen, kritik OLMAYAN, düzeltilmeyen 2 küçük bulgu**: (a) `SIMPLE_JWT` içindeki `AUTH_COOKIE`/`AUTH_COOKIE_REFRESH`/`AUTH_COOKIE_HTTP_ONLY`/`AUTH_COOKIE_SECURE`/`AUTH_COOKIE_SAMESITE` anahtarları **ölü konfigürasyon** — hiçbir yerde okunmuyor, gerçek cookie parametreleri `set_auth_cookies()`'te ayrı ayrı hardcoded (değer tutarlılığı için `AUTH_COOKIE_SAMESITE` yine de `'Lax'`'a güncellendi, ama bu satırın hiçbir işlevi yok, temizlenebilir). (b) `LogoutView`, sadece `refresh_token`'ı blacklist'e alıyor — o anki `access_token` blacklist'e alınmıyor, yani logout sonrası access token kendi 15 dakikalık ömrü boyunca teorik olarak hâlâ geçerli kalabilir (curl ile gözlemlendi). Bu CSRF'le ilgisiz, önceden beri var olan bir JWT tasarım tercihi (kısa ömürlü access token'lar için yaygın bir kabul) — bu turun kapsamı dışında, sadece not düşülüyor.

> ## 🔧 Son Değişiklikler (2026-08-17, 4. tur) — Öncelikli Liste Madde 2 ve 3 + Dokümantasyon Konsolidasyonu
> Önceki turun ("devam" turu) "sıradaki iş için öncelik sırasıyla" listesindeki 2. ve 3. madde (madde 1 zaten 3. turda kapatılmıştı) bu turda kapatıldı. Kapsam: `backend/availability/views.py`, `client/src/pages/Appointments/ExpertAvailability.tsx`; ayrıca bu turda `backend/claude.md`, `client/claude.md`, `SYSTEM_REPORT.md` senkronize edildi ve yukarıdaki kalıcı kural eklendi.
> - **`backend/availability/views.py` → `AvailabilityExceptionView.delete()`** (eski madde 2): `ProfileView.update()`'te daha önce düzeltilen "PATCH/DELETE response'u GET'ten farklı, dar bir serializer ile üretiliyor" kalıbının aynısı burada da vardı. Output artık (hem `deleted` hem `current` listeleri) input-doğrulama için kullanılan dar `AvailabilityExceptionDeleteSerializer` yerine GET/PUT'un kullandığı zengin `AvailabilityExceptionSerializer` ile üretiliyor — `exception_type`/`note`/`service_name`/`expert_name`/`created_at` artık DELETE response'unda da mevcut. `curl` ile uçtan uca doğrulandı: `add` tipinde bir istisna oluşturulup silindi, `deleted` listesinde tüm alanların (önceden kaybolan alanlar dahil) döndüğü teyit edildi.
> - **`client/src/pages/Appointments/ExpertAvailability.tsx`** (eski madde 3): `AppointmentForm`'a geçilen `navigate={() => {}}` no-op kaldırıldı; bileşene `useNavigate()` (`react-router` — projede `AppointmentsList.tsx` ve auth formlarında zaten kullanılan established pattern) eklendi, gerçek `navigate` fonksiyonu geçiliyor. Randevu talebi başarıyla gönderildiğinde artık `AppointmentForm.tsx`'in `setTimeout(() => navigate("/appointments"), 2000)` çağrısı gerçekten çalışıyor — önceden toast "gönderildi" diyordu ama kullanıcı sayfada kalıyordu (profil formundaki "kayıt sonrası yönlendirmiyor" hatasının birebir aynısıydı, ayrı bir ekranda).
> - **Doğrulama durumu**: Backend değişikliği `manage.py check` (temiz) + canlı `curl` isteğiyle uçtan uca doğrulandı (test kayıtları sonrasında temizlendi). Frontend değişikliği `npx tsc --noEmit` (temiz) ile ve kod-yolu incelemesiyle (Router bağlamı `App.tsx`'te mevcut, `/appointments` route'u tanımlı, aynı `useNavigate` deseni `AppointmentsList.tsx`'te zaten çalışıyor) doğrulandı — **ama bu ortamda bir tarayıcı otomasyon aracı bulunmadığı için gerçek bir tarayıcıda tıklanarak (login → randevu talebi gönder → yönlendirmeyi izle) uçtan uca test edilmedi.** Bir sonraki oturumda veya bu makinede manuel olarak bu akışın tarayıcıda doğrulanması önerilir.
> - Bu turda bu iki düzeltmenin ötesinde yeni bir kritik/yüksek öncelikli bulguya rastlanmadı. En kritik açık madde hâlâ CSRF konusu (aşağıdaki "Sistem Durumu Özeti"ne ve madde 10'a bakın). Ayrıca dokümantasyon konsolidasyonu sırasında küçük bir tutarsızlık daha fark edildi (kritik değil, bilgi amaçlı): `expert/ToDo.md`, `dashboard/api.ts`'in hardcoded `localhost` kullandığını hâlâ "yapılacak" olarak listeliyor, ama o dosya (`expert/src/features/dashboard/api.ts`) artık repoda **yok** (klasörde sadece `index.tsx` kaldı, hiç doğrudan `axios`/`api.*` çağrısı yapmıyor) — kod muhtemelen refactor edilirken bu sorun kendiliğinden çözülmüş ama ne `ToDo.md` ne `claude.md` güncellenmiş. Kesin teyit edilmedi (dashboard'un verisi artık nereden geldiği bu turda izlenmedi), bir sonraki oturum `expert/ToDo.md`'yi bu maddede güncelleyebilir.

> ## 🔧 Son Değişiklikler (2026-08-17, 3. tur) — Access Token Refresh Mekanizması
> Önceki turlarda "en kritik eksik" olarak işaretlenen sorun (15 dk'lık access token + hiçbir refresh akışı yok) bu turda kapatıldı. Kapsam: `backend/accounts/views/views.py`, `accounts/urls.py`, `lunova_backend/settings.py`, `client/src/lib/api.ts`, `expert/src/lib/api-setup.ts`. Detay için yukarıdaki "Access token 15 DAKİKA, ama artık gerçek bir refresh akışı VAR" bölümüne bakın. Özet:
> - **Backend**: `POST /api/v1/accounts/token/refresh/` (yeni) — cookie'deki `refresh_token`'ı `TokenRefreshSerializer` ile doğrulayıp rotasyonlu yeni bir access+refresh çifti üretir, httpOnly cookie olarak set eder. `set_auth_cookies()` adında ortak bir helper eklendi (`LoginView` de artık bunu kullanıyor, kendi kopya kodu kaldırıldı). `SIMPLE_JWT.REFRESH_TOKEN_LIFETIME` 7 gün → **1 saat**'e çekildi (bilinçli seçim — aşağıya bakın).
> - **Frontend'ler**: `client/src/lib/api.ts` (önceden hiç interceptor'ı yoktu) ve `expert/src/lib/api-setup.ts` (var olan 401 handler'ı genişletildi) artık 401 alan bir isteği önce sessizce refresh edip yeniden deniyor, refresh de başarısız olursa oturumu sonlandırıp giriş sayfasına yönlendiriyor. Eşzamanlı 401'ler tek bir refresh çağrısını paylaşıyor (single-flight).
> - **Neden 1 saat (kullanıcının kendi talimatı)**: Kullanıcı, "yarım saat boşta kalan kullanıcı tekrar login olsun ama bunu 1 saate çıkar" dedi çünkü seanslar Zoom üzerinden yapılıyor ve bir görüşme boyunca (appointment_duration ≤ 50 dk) kullanıcı Lunova sekmesinde hiç işlem yapmıyor olabilir. 1 saatlik refresh-token ömrü + reaktif (sadece 401'de tetiklenen, proaktif zamanlayıcı olmayan) refresh stratejisi bunu doğal olarak çözüyor: kullanıcı aktifse oturum kayan pencereyle uzar, TAMAMEN hareketsiz kalırsa (görüşme + biraz fazlası kadar) 1 saat sonra düşer.
> - Bu akış `curl` ile uçtan uca doğrulandı: login → refresh (yeni jti/exp) → rotasyonlanmış eski refresh token'ı tekrar kullanmayı deneme → `401 Token is blacklisted` (doğru davranış) → geçersiz/eksik refresh cookie'siyle deneme → temiz `401` (500 yok) → yeni access token korumalı endpoint'te çalışıyor.
>
> **Bu turda ayrıca yeni, önceden dokümante edilmemiş bir KRİTİK güvenlik bulgusu tespit edildi (düzeltilmedi, sadece tespit)**: CSRF koruması muhtemelen hiç aktif değil — `curl` ile CSRF token'sız, sadece form-encoded content-type + cookie ile `POST /accounts/logout/` başarıyla çalıştırıldı (`205`). Detay ve önerilen düzeltme yönleri için aşağıdaki "Bilinen Sorunlar" listesindeki 10. maddeye bakın — **bir sonraki oturum için önerilen öncelikli inceleme konusu budur.**
>
> **🧭 Geliştirme Fikirleri (yeni bölüm)**: Kullanıcı ileride sistem geneli için ayrıca doküman paylaşacak; bu arada not düşülmesi istenen, henüz uygulanmamış 2 basit örnek fikir aşağıda "Geliştirme Fikirleri" başlığı altında.

> ## 🔧 Son Değişiklikler (2026-08-17, devam) — Profil Düzenleme Zinciri + Yerel Geliştirme Ortamı
> Bu turda **profil düzenleme akışı** (client'ta 3 kart: Kimlik/İletişim/Süreç; expert'te tek form) uçtan uca incelendi; kullanıcının bildirdiği "kayıttan sonra sayfa beyaz kalıyor, yönlendirmiyor" şikâyeti kök nedenine kadar izlenip düzeltildi. Ayrıca bu oturumda **çalışan bir yerel geliştirme ortamı kuruldu** (aşağıda) ve tüm bulgular gerçek backend'e karşı curl ile uçtan uca doğrulandı — önceki oturumların "test edilemedi" notları artık backend için geçerli değil.
>
> **Kök nedenler ve düzeltmeler** (detaylar backend/client/expert `claude.md`'lerinde):
> - **`backend/accounts/views/profile.py`**: `ProfileView`, PATCH/PUT sonrası response'u GET'ten tamamen farklı bir "write" serializer ile üretiyordu (`user` yerine `user_data`, isim yerine ham ID, `approval_status`/`expert`/`rating_average` gibi alanlar hiç yok) — frontend'in kayıt sonrası bu veriyi kullanırken çökmesine yol açan asıl kök nedenlerden biri. `update()` override edilip artık GET'teki zengin read-serializer kullanılıyor. **Bu, tekrarlanabilir bir mimari kalıp riski — aynı hatanın canlı bir örneği `availability/views.py`'de bulundu (aşağıya bakın), henüz düzeltilmedi.**
> - **`backend/accounts/serializers/profile_update_serializers.py`**: `BaseUserUpdateSerializer`'a `timezone` eklendi — önceden client formunda düzenlenebilir gösteriliyordu ama backend sessizce yok sayıyordu (kaydediliyor görünüyor, hiç kalıcı olmuyordu).
> - **`expert/src/features/profile/profile-form.tsx`**: Kayıt başarılı olduğunda `navigate()` HİÇ çağrılmıyordu, yerine sayfayı görsel olarak dondurup griye çeviren bloklayan `alert()` kullanılıyordu. `alert()` kaldırıldı, `useNavigate()` ile `/profile`'a yönlendirme eklendi.
> - **`expert/src/features/profile/api.ts`**: `handleApiError`, backend'in düz alan-bazlı DRF validasyon hatalarını (`{"university": ["..."]}`) tanımıyordu — düzeltildi.
> - **`expert/src/features/profile/maps.ts`**: Canlı DB ile karşılaştırılınca, hardcoded taxonomy ID→etiket eşlemesi (özellikle `APPROACH_METHODS`, id 2-4) gerçek backend ID'leriyle **uyuşmuyordu** — örn. arayüzde "Psikanalitik Terapi" (id=2) seçilince gerçekte "Kabul ve Kararlılık Terapisi (ACT)" kaydediliyordu. Hata bile vermiyordu, **sessizce yanlış veri kaydediyordu**. Gerçek DB değerleriyle düzeltildi, curl ile doğrulandı.
> - **`client/src/mappers/profileMapper.ts`**: `profile.substances_used.map(...)` null-check'siz çağrılıyordu — undefined gelirse TypeError fırlatıp tüm React ağacını çökertiyordu (ErrorBoundary olmadığı için gerçek "beyaz sayfa" nedeni). `?? []` eklendi.
> - **`client/src/components/common/ErrorBoundary.tsx`** (yeni) + `main.tsx`: Projede hiç React ErrorBoundary yoktu; artık tüm `App` sarmalanmış durumda — render sırasında oluşan beklenmeyen bir hata artık "Ana Sayfaya Dön" ekranına düşürüyor, tam beyaz sayfaya değil. **Not**: tek, en üst seviye bir boundary — sayfa bazlı değil, herhangi bir yerdeki çökme tüm SPA'yı etkiliyor ("all-or-nothing", kabul edilebilir bir ilk adım).
> - Client'ta 3 profil kartı (`UserMetaCard.tsx`, `UserContactCard.tsx`, `UserSupportCard.tsx`): kayıt önceden tamamen sessizdi (başarı da hata da `console.error`). `useToast`/`ToastContainer` ile görünür geri bildirim eklendi.
>
> **Bu turda TESPİT EDİLEN ama kod DEĞİŞTİRİLMEDEN bırakılan sorunlar — sıradaki iş için öncelik sırasıyla:**
> 1. ✅ **[BU AYNI GÜNÜN 3. TURUNDA DÜZELTİLDİ]** ~~Access token 15 dk + refresh endpoint yok~~ — bkz. dosyanın en üstündeki "3. tur" changelog girişi. O turda ayrıca yeni bir kritik CSRF bulgusu tespit edildi (aşağıdaki "Bilinen Sorunlar" listesi, madde 10).
> 2. ✅ **[BU AYNI GÜNÜN 4. TURUNDA DÜZELTİLDİ]** ~~`backend/availability/views.py` → `AvailabilityExceptionView.delete()`, ProfileView'daki AYNI kalıp: DELETE response'u (`deleted`/`current` listeleri) dar bir "delete" serializer ile üretiliyor, `exception_type/note/service_name/expert_name/created_at` sessizce kayboluyor.~~ — bkz. dosyanın en üstündeki "4. tur" changelog girişi.
> 3. ✅ **[BU AYNI GÜNÜN 4. TURUNDA DÜZELTİLDİ]** ~~`client/src/pages/Appointments/ExpertAvailability.tsx:296`, `AppointmentForm`'a `navigate={() => {}}` (no-op) geçiyor — randevu talebi başarıyla gönderildiğinde kullanıcı yönlendirilmiyor.~~ — bkz. dosyanın en üstündeki "4. tur" changelog girişi. **Not**: gerçek tarayıcıda uçtan uca tıklanarak test edilmedi (ortamda tarayıcı otomasyon aracı yok), sadece tip kontrolü + kod-yolu incelemesiyle doğrulandı.
> 4. 🟡 **[yeni bulundu]** `client/src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub (`console.log("Henüz silme desteklenmiyor…")`); silme butonu kullanıcıya hiçbir geri bildirim vermeden hiçbir şey yapmıyor. Aynı dosyada `handleDownload` hatası da sessiz (bu dosyada `useToast` hiç kullanılmıyor).
> 5. 🟡 **[yeni bulundu]** `client/src/store/authSlice.ts` → `fetchProfile.rejected` sadece `state.error`'ı set ediyor, `userProfile`/`isAuthenticated`'a dokunmuyor — 15 dk token süresi dolduğunda eski profil sessizce ekranda kalmaya devam ediyor.
> 6. 🟡 **[doğrulandı, hâlâ mevcut]** `client/src/components/UserProfile/UploadDocumentModal.tsx`, fotoğraf yükleme sonrası 2 sn gecikmeyle `dispatch(fetchMe())` çağırıyor; `App.tsx`'teki `RequireAuth`, `auth.loading===true` iken TÜM `AppLayout`'u (overlay değil, tam replace) `GlobalSpinner` ile değiştiriyor. Kullanıcı talimatı gereği bucket/upload akışına bu turda dokunulmadı.
> 7. 🟢 **[yeni bulundu, düşük öncelik]** `client/src/pages/Appointments/AppointmentsList.tsx:50` ve `Request.tsx:50`, API response'unu şekil kontrolü yapmadan `.map()`'e veriyor (`substances_used` bug'ıyla aynı aile) — artık ErrorBoundary yakalıyor ama kök neden düzeltilmedi.
> 8. 🟢 **[önceliği düşürüldü]** Expert'teki `lib/handle-server-error.ts`'in `.title`-okuma bug'ı (önceki dokümanlarda "aktif sorun" olarak işaretlenmişti) — bu turda doğrulandı: projede `useMutation`/`useQuery` (React Query) **hiç kullanılmıyor**, bu yüzden bu fonksiyon şu an hiç tetiklenmiyor. Gizli/pasif bir risk (birisi ileride bir mutation'ı React Query'ye taşırsa aktifleşir).
>
> **Yerel geliştirme ortamı (yeni, bu turda kuruldu — çalışır durumda doğrulandı)**:
> - `backend/venv/` — **Python 3.12** (Python 3.14 DEĞİL — `psycopg2`, `pyiceberg`, `pyroaring` paketlerinin 3.14 için henüz derlenmiş wheel'i yok, makinede C++ derleyicisi de yok; 3.12 ile `requirements.txt` hiç değiştirilmeden eksiksiz kuruluyor). `.env` zaten mevcuttu (mock storage, mock Zoom). `db.sqlite3` zaten migrate+seed edilmiş (96 kullanıcı; `expert1@mail.com` / `client1@mail.com`, şifre `password123`).
> - `client/node_modules`, `expert/node_modules` kuruldu; `npx tsc --noEmit` her ikisinde de temiz.
> - Üç servis de (`:8000`, `:5174`, `:5173`) ayakta test edildi; profil PATCH akışı gerçek curl istekleriyle uçtan uca doğrulandı.

> ## 🔧 Son Değişiklikler (2026-08-17) — Randevu Zinciri Düzeltmeleri
> Bu turda **randevu oluşturma/onaylama/iptal zinciri** (client→backend→expert ve expert→backend→client) uçtan uca incelendi ve düzeltildi. Öncelik buydu; Zoom bağlantı sağlığı gibi yan konulara **dokunulmadı** (sıradaki iş). Kısa özet (detay için backend/client/expert `claude.md`'lerindeki kendi "Son Değişiklikler" bölümlerine bakın):
> - **Kök neden bulundu ve giderildi**: `GET /accounts/me/` ve `POST /accounts/login/` kullanıcının kendi `id`/`role`'ünü hiç döndürmüyordu. Bunun somut sonucu: expert uygulaması kendi `User.id`'sini bilmiyordu ve `expertId`'yi SADECE var olan randevulardan türetiyordu → **hiç randevusu olmayan yeni bir uzman ilk randevusunu asla oluşturamıyordu**. Backend'e `id`+`role` eklendi, expert app artık kendi id'sini oradan alıyor (randevu geçmişine bağımlılık sadece fallback).
> - **3-ID karışıklığı (senin işaret ettiğin risk) doğrulandı**: `accounts/experts/` ve `accounts/clients/` uçları `id` alanında `ExpertProfile.id`/`ClientProfile.id` döndürüyor — `Appointment`/`availability` ise her yerde `User.id` bekliyor. İki sayı genelde eşleşmez. Bu iki serializer'a artık ayrıca, açıkça isimlendirilmiş `user_id` alanı eklendi; randevu/müsaitlik akışlarında kişi referansı için **her zaman `user_id` (genel/global id) kullanılmalı**, `id` değil. Client'ın mevcut randevu-oluşturma akışı zaten (şans eseri) `user_id`/`expert_user_id` kullanıyordu, dokunulmadı.
> - **Client tarafında iptal işlemi hiç yoktu** — eklendi: onaylanmış randevu için "iptal talebi gönder" (→`cancel_requested`), henüz uzman onayı almamış kendi talebi için "talebi geri çek" (→`cancelled`, bunun için backend'de yeni bir izin kuralı eklendi — önceden sadece uzman iptal edebiliyordu).
> - **Client `Appointment` tipi gerçek backend şekliyle uyumlu hale getirildi** (`expert`/`client` düz `User.id`'dir, iç içe nesne değil) — önceki tip tanımı yanlıştı ve kod içinde `as any` ile geçiştiriliyordu.
> - Expert'in kendi `ToDo.md`'sinde yazan "randevu reddetme 403" hatası araştırıldı: mevcut backend kodunda (commit `b74a87d`) zaten düzeltilmiş görünüyor — ToDo.md'nin bu maddesinin ekip tarafından kapatılması önerilir.
> - ⚠️ **Test durumu**: Bu ortamda ne Python ne çalışan bir `tsc`/build zinciri vardı (kurulum eksik, kullanıcı henüz lokal DB kurmadı) — değişiklikler dikkatli kod okuması ile doğrulandı ama **gerçek DB + çalışan sunucularla uçtan uca test edilmedi**. İlk fırsatta bir geliştirme ortamında bu zincirin (create → approve/reject → cancel/withdraw) manuel test edilmesi gerekiyor.

## 📋 Proje Tanımı

**Lunova**, psikologlar (Uzmanlar) ve danışanları bir araya getiren, video görüşme odaklı bir telepsikiyatri/teledanışmanlık platformudur.

- **Amaç**: Uzmanlar ile danışanları randevu sistemi üzerinden bağlayarak online terapi seansları sağlamak
- **Teknoloji Stack**: Django 5.2.4 Backend + 2 ayrı React 19 Frontend + Zoom entegrasyonu + Supabase dosya depolama
- **Veritabanı**: PostgreSQL (Production) / SQLite (Development)
- **Kimlik Doğrulama**: JWT (httpOnly cookie, `djangorestframework_simplejwt`)

## 📊 Sistem Durumu Özeti & Yol Haritası

> Bu bölüm eskiden ayrı bir dosya olan `SYSTEM_REPORT.md`'nin yerine geçiyor (2026-08-17, 4. tur'da buraya taşındı — gerekçe için dosyanın en üstündeki "Kalıcı Kural"a bakın). Ekip için hızlı bir durum özeti + kısa/orta vadeli plan sunar; teknik detay ve kanıt için her zaman ilgili `claude.md` bölümüne/dosyasına bakın. **Bu bölümü güncel tutmak, yeni bir dosya açmaktan daha önemli — her değişiklik turu bunu da gözden geçirmeli.**

```
Backend (Django)         🟢 Sağlam temel; appointments/forms iyi; oturum yönetimi + CSRF koruması artık tamamlandı
Client (danışan, Redux)  🟡 401/refresh otomatik, CSRF token otomatik ekleniyor; profil+randevu formlarındaki "kayıt/talep sonrası yönlendirmiyor" hata ailesi kapatıldı; README hâlâ proje ile alakasız
Expert (uzman, Zustand)  🟡 Randevu/profil zinciri düzeltildi, CSRF token otomatik ekleniyor; hata mesajı gösterimi (.title bug) hâlâ yanlış ama React Query hiç kullanılmadığı için şu an pasif risk
Entegrasyon (backend↔fe) 🟢 CSRF koruması artık aktif (5. tur) — gerçek tarayıcıda uçtan uca tıklanarak henüz doğrulanmadı (bkz. 5. tur changelog notu), ama backend tarafı + axios mekanizması ayrı ayrı sıkı doğrulandı
```

### ✅ Kapatılmış kritik/yüksek öncelikli maddeler (2026-08-17 turları)

- Access token refresh mekanizması yoktu → `POST /accounts/token/refresh/` + iki frontend'de otomatik retry (3. tur).
- CSRF koruması hiç aktif değildi → `SameSite=Lax` + gerçek CSRF token doğrulaması (`enforce_csrf`) + iki frontend'de otomatik `X-CSRFToken` header'ı (5. tur, bkz. yukarıdaki changelog — **artık bir sonraki oturumun ilk işi bu değil**).
- Login/`/me/` `role`/`id` döndürmüyordu → ikisi de artık dönüyor (Randevu Zinciri turu).
- Profil kaydı sonrası "beyaz sayfa" / yönlendirmeme zinciri (ProfileView write-serializer bug'ı, `substances_used` null-check, ErrorBoundary yokluğu, expert profil formunda `alert()`+yönlendirmeme, yanlış taxonomy ID eşlemesi) → tamamı düzeltildi (devam turu).
- Randevu talebi/onay/iptal zincirindeki 3-ID karışıklığı ve client'ta iptal aksiyonu eksikliği → düzeltildi (Randevu Zinciri turu).
- `AvailabilityExceptionView.delete()` ve `ExpertAvailability.tsx` navigate no-op → düzeltildi (4. tur).

### 🟠 En öncelikli açık madde

**Gerçek bir tarayıcıda CSRF fix'inin uçtan uca doğrulanması** — axios'un `withXSRFToken` mekanizması kaynak kodu okunarak ve backend curl ile (gerçek `Origin` header'ı simüle edilerek) ayrı ayrı doğrulandı, ama ikisinin birlikte gerçek bir tarayıcıda çalıştığı hiç tıklanarak test edilmedi (bu ortamda tarayıcı otomasyon aracı yok). Client/expert'te login olup bir POST/PATCH/DELETE işlemi (profil kaydetme, randevu talebi, randevu iptali) deneyip başarılı olduğunu gözlemlemek yeterli. **Eğer bu akışlar 403 CSRF hatası veriyorsa**, önce tarayıcının DevTools → Network sekmesinde `X-CSRFToken` header'ının gerçekten gönderilip gönderilmediğine, `csrftoken` cookie'sinin `document.cookie`'de görünüp görünmediğine bakılmalı.

### 🟡 Doğrulanmış, hâlâ açık, öncelik sırasıyla

1. `expert/lib/handle-server-error.ts`'in `.title`-okuma bug'ı — backend hemen hiç `title` döndürmüyor (`detail`/`error` kullanıyor). Şu an **pasif risk** (React Query/`useMutation`/`useQuery` projede kullanılmıyor), ama biri ileride bir mutation'ı React Query'ye taşırsa aktifleşir. Düzeltmesi tek satırlık bir `.detail || .error` fallback'i.
2. `client/src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub, kullanıcıya geri bildirim yok.
3. `client/src/store/authSlice.ts` → `fetchProfile.rejected`, `userProfile`/`isAuthenticated`'ı temizlemiyor (refresh'in kendisi başarısız olursa eski veri ekranda kalır — pratikte interceptor yönlendirdiği için fark edilmiyor ama düzeltilmedi).
4. `client/src/components/UserProfile/UploadDocumentModal.tsx` sonrası `RequireAuth`'un tüm `AppLayout`'u tam ekran spinner'a çevirmesi (rutin foto yüklemesi tüm uygulamayı kısa süreliğine kaybettiriyor).
5. `client/src/pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response şekil kontrolsüz `.map()`'e veriliyor (ErrorBoundary artık yakalıyor, kök neden düzeltilmedi).
6. İki frontend de açık kaynak şablon kimliğiyle duruyor (`tailadmin-react`/`shadcn-admin` package adları, orijinal şablon README'leri, kullanılmayan `@clerk/clerk-react` bağımlılığı — bu turda hâlâ `expert/package.json`'da doğrulandı).
7. `client/store/authReducer.ts` ölü kod (store'a bağlı değil, bu turda hâlâ dosyanın var olduğu doğrulandı).
8. `backend/requirements.txt`'te kullanılmayan/şüpheli `rest-framework-simplejwt==0.0.2` satırı hâlâ duruyor (bu turda doğrulandı; UTF-8 kodlama sorunu daha önce çözülmüştü, bu ayrı bir kalem).
9. `FRONTEND_URLS`'teki zorunlu `admin` anahtarının ne için kullanıldığı netleştirilmedi.
10. **[teyit edilmedi]** `expert/ToDo.md`, `dashboard/api.ts`'in hardcoded `localhost` kullandığını "yapılacak" olarak listeliyor ama o dosya artık repoda yok — muhtemelen çözülmüş, teyit gerekiyor (bkz. 4. tur changelog notu).
11. **[5. turda bulundu, kritik değil]** `SIMPLE_JWT` içindeki `AUTH_COOKIE*` anahtarları ölü konfigürasyon (hiçbir yerde okunmuyor, gerçek cookie parametreleri `set_auth_cookies()`'te ayrı) — temizlenebilir.
12. **[5. turda bulundu, kritik değil]** `LogoutView`, `access_token`'ı blacklist'e almıyor (sadece `refresh_token`'ı) — logout sonrası eski access token kendi 15 dk'lık ömrü boyunca teorik olarak hâlâ geçerli kalabiliyor. CSRF'le ilgisiz, önceden beri var olan bir tasarım tercihi.
13. Rate limiting yok, DRF pagination global tanımlı değil (`available-experts/` gibi sınırsız listelerde risk; `appointments/` zaten tarih aralığıyla sınırlı).
14. CI/otomatik test yok (`appointments` hariç hiçbir app'te; frontend'lerde hiç test dosyası yok).

### 🚀 Önerilen sıradaki adımlar (öncelik sırasıyla)

1. **CSRF fix'inin gerçek tarayıcıda doğrulanması** (yukarıda, 🟠).
2. `handle-server-error.ts` `.detail || .error` fallback'i (ucuz, birisi React Query'ye geçerse aktifleşecek riski önler).
3. Yukarıdaki "hâlâ açık" listesindeki 2-5 arası kullanıcı deneyimi hataları (documents delete stub, authSlice temizliği, upload modal spinner, response şekil kontrolü).
4. Şablon temizliği (README'ler, paket adları, `authReducer.ts`/`clerk` ölü kod/bağımlılık kararları) — yayına çıkmadan önce.
5. Orta vadeli: gerçek test/CI altyapısı, `available-experts`/takvim uçlarının performansı, rate limiting, hata response formatının backend genelinde tutarlı hale getirilmesi (`detail` standardı).

## ⚠️ Repo Yapısı Hakkında Önemli Not

Bu dizin (`Lunova/`) bir monorepo **değildir** ve kendisi bir git deposu **değildir**. İçinde 3 tane **bağımsız git deposu** var:

```
Lunova/                 ← git deposu DEĞİL (sadece klasör)
├── backend/            ← kendi .git'i var (Django)
├── client/              ← kendi .git'i var (React, danışan arayüzü)
└── expert/              ← kendi .git'i var (React, uzman arayüzü)
```

Bu yüzden: `git log`, `git status` gibi komutları root'ta çalıştırmak işe yaramaz — her alt klasörde ayrı ayrı çalıştırılmalı. Sürüm/branch senkronizasyonu (backend'in hangi commit'i hangi frontend commit'iyle uyumlu) manuel takip ediliyor, otomatik bir bağ yok.

## 🏗️ Sistem Mimarisi

```
┌──────────────────────────┐   ┌──────────────────────────┐
│   CLIENT (danışan)       │   │   EXPERT (uzman)         │
│   React 19 + Redux TK    │   │   React 19 + Zustand     │
│   Axios, TailAdmin UI    │   │   TanStack Router/Query  │
│   template: "tailadmin-  │   │   shadcn/ui              │
│   react" (yeniden        │   │   template: "shadcn-     │
│   adlandırılmamış)       │   │   admin" (yeniden        │
│   dev port: 5174         │   │   adlandırılmamış)       │
│                          │   │   dev port: 5173         │
└────────────┬─────────────┘   └────────────┬─────────────┘
             │  HTTP/REST, withCredentials:true, X-Frontend-Type header
             └──────────────┬───────────────┘
                            │
              ┌─────────────▼───────────────┐
              │  BACKEND (Django, :8000)    │
              │  /api/v1/...                │
              ├─────────────────────────────┤
              │ accounts │ appointments     │
              │ availability │ zoom │ forms │
              └──┬──────────┬─────────┬─────┘
                 │          │         │
           JWT (cookie) │ CORS │ Storage (Supabase/Mock)
                 │
          PostgreSQL (prod) / SQLite (dev)
```

İki frontend de **açık kaynak admin şablonlarının üzerine** kurulmuş ve şablonların kimliği (`package.json` adı, `README.md`, çoğu sayfa) hâlâ değiştirilmemiş durumda:

- `client/` → [TailAdmin React](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) şablonu (`package.json` adı: `tailadmin-react`)
- `expert/` → [shadcn-admin](https://github.com/satnaing/shadcn-admin) şablonu (`package.json` adı: `shadcn-admin`, ayrıca kullanılmayan `@clerk/clerk-react` bağımlılığı ve `routes/clerk/` klasörü mevcut — muhtemelen şablondan kalma, gerçek auth JWT tabanlı)

Bu, ilerideki bir "rebrand/temizlik" işinin parçası olarak bilinmeli — `README.md` dosyaları da dahil (bkz. aşağıdaki "Bilinen Sorunlar").

## 🔐 Kimlik Doğrulama Akışı (doğrulanmış)

### Login

```
POST /api/v1/accounts/login/   Body: { email, password }

Backend (accounts/views/views.py: LoginView):
1. X-Frontend-Type header'ı (veya Referer) ile expert/client ayrımı yapılır;
   yanlış arayüzden giriş denenirse 403 döner.
2. Kullanıcı doğrulanır, RefreshToken.for_user(user) ile access+refresh üretilir.
3. Response body SADECE şunları içerir:
   { "name", "surname", "email", "profile_photo", "gender" }
   → "access"/"refresh"/"user"/"role"/"id" alanları YOKTUR (önceki dokümantasyonun
     iddia ettiğinin aksine — token'lar sadece cookie'de taşınır).
4. Cookie'ler set edilir:
   - access_token  → httpOnly, Secure=True, SameSite=None, max_age=15 dakika
   - refresh_token → httpOnly, Secure=True, SameSite=None, max_age=7 gün
```

### ✅ [2026-08-17'de eklendi] Access token 15 DAKİKA, ama artık gerçek bir refresh akışı VAR

Önceden burada "en kritik eksik" olarak işaretlenen sorun (`token/refresh/` endpoint'i yok, hiçbir frontend 15 dk'lık düşüşü telafi etmiyor) bu turda düzeltildi:

```python
# backend/lunova_backend/settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=1),   # önceden 7 gündü, bilinçli olarak 1 saate çekildi (aşağıya bakın)
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

- **`POST /api/v1/accounts/token/refresh/`** (yeni, `accounts/views/views.py` → `TokenRefreshView`) — body gerekmez, cookie'deki `refresh_token`'ı kullanır, `rest_framework_simplejwt.serializers.TokenRefreshSerializer` ile doğrulayıp rotasyonlu (yeni jti/exp, eskisi blacklist'e düşer) yeni bir access+refresh çifti üretir, ikisini de httpOnly cookie olarak set eder. Token hiçbir zaman JS'e/response body'sine sızmaz — login/logout ile aynı güvenlik modeli.
- **`client/src/lib/api.ts`** ve **`expert/src/lib/api-setup.ts`**: artık ikisinde de axios response interceptor'ı var — 401 alan bir istek önce sessizce `token/refresh/`'i dener, başarılıysa orijinal isteği bir kez daha yapar; refresh de başarısız olursa (oturum gerçekten bitmiş) kullanıcıyı giriş sayfasına yönlendirir. Eşzamanlı birden fazla 401 gelirse hepsi TEK bir refresh çağrısını paylaşır (`refreshPromise` single-flight deseni).
- **Neden `REFRESH_TOKEN_LIFETIME` 1 saat (30 dk değil)**: Kullanıcı talebi üzerine bilinçli seçildi. Bu, bir "kayan pencere" (sliding window) oturumu: kullanıcı aktif oldukça (en az saatte bir istek attıkça, ki refresh her kullanımda kendini yeniler) oturum kendini uzatır; kullanıcı TAMAMEN hareketsiz kalırsa (hiç istek atmazsa) 1 saat sonra oturum düşer ve tekrar giriş istenir. 1 saat özellikle seçildi çünkü seanslar Zoom üzerinden yapılıyor ve bir görüşme sırasında (appointment_duration en fazla 50 dk) kullanıcı Lunova sekmesinde hiç işlem yapmayabilir — 30 dk'lık bir pencere görüşme ortasında oturumu düşürüp kullanıcıyı görüşme biter bitmez tekrar login'e zorlardı, 1 saat bunu güvenle kapsıyor.
- Bu akış `curl` ile uçtan uca doğrulandı: login → refresh (yeni jti/exp) → eski (rotasyonlanmış) refresh token'ı tekrar kullanmaya çalışma → `{"detail":"Token is blacklisted"}` 401 (doğru davranış) → yeni access token ile korumalı endpoint'e erişim → 200.

### Diğer doğrulanmış auth gerçekleri

- `MeView` (`GET /api/v1/accounts/me/`) **2026-08-17'de düzeltildi**: artık `id` ve `role` de dönüyor (`first_name, last_name, email, profile_photo, gender`'a ek olarak) — bu turda `curl` ile yeniden doğrulandı. Önceki dokümantasyonda burada "dönmüyor" yazıyordu, bu artık yanlış.
- Cookie'ler **her ortamda** (dev dahil) `Secure=True` ve `SameSite=None` ile set ediliyor. Bu, `localhost` özel durumu sayesinde Chrome'da genelde çalışır ama tarayıcıya bağlı kırılgan bir davranıştır — Firefox/Safari'de farklılık gösterebilir, doğrulanmalı.
- Şifre sıfırlama akışı gerçek ve çalışır durumda: `POST /api/v1/accounts/auth/password-reset/` ve `.../password-reset/confirm/` (önceki dokümantasyonda hiç yoktu).
- `FRONTEND_URLS` env değişkeni production'da `expert`, `client` **ve `admin`** anahtarlarının hepsini zorunlu kılıyor (`settings.py`), ama repo içinde ayrı bir "admin" frontend uygulaması yok — sadece Django'nun kendi `/admin/` paneli var (bkz. `backend/README.md`). Bu üçüncü URL'nin ne için kullanılacağı (muhtemelen sadece şifre sıfırlama e-postası linki) ekip içinde netleştirilmeli.

## 🔌 API Endpoint Yapısı (gerçek `urls.py` dosyalarından)

```
# accounts/urls.py
POST   /api/v1/accounts/register/expert/
POST   /api/v1/accounts/register/client/
POST   /api/v1/accounts/register/admin/
POST   /api/v1/accounts/login/
POST   /api/v1/accounts/logout/
GET    /api/v1/accounts/me/
GET    /api/v1/accounts/experts/            (?category=<service-slug>)
GET    /api/v1/accounts/clients/            (rol bazlı: admin tümü, expert kendi danışanları)
GET/PATCH /api/v1/accounts/profile/
POST   /api/v1/accounts/documents/presign-upload/   (presigned URL üretir, dosya backend'e gelmez)
GET    /api/v1/accounts/documents/
DELETE /api/v1/accounts/documents/<uid>/
POST   /api/v1/accounts/auth/password-reset/
POST   /api/v1/accounts/auth/password-reset/confirm/

# appointments/urls.py
GET    /api/v1/appointments/                        (start_date & end_date ZORUNLU; max 4 ay, admin 6 ay)
POST   /api/v1/appointments/expert/create/
POST   /api/v1/appointments/client/request/
GET/PATCH/DELETE /api/v1/appointments/<id>/
PATCH  /api/v1/appointments/<id>/status/             (aynı view, "status" alanı varsa buraya yönlenir)
GET    /api/v1/appointments/<id>/meeting-info/
GET    /api/v1/appointments/experts/<expert_id>/appointments/   (client'lar için, özet bilgi)

# availability/urls.py
GET         /api/v1/availability/                    (kendi haftalık+istisna takvimi; client ise ?expert_user_id=)
GET/PUT/DELETE /api/v1/availability/weekly/           (toplu ekle/sil/birleştir mantığı var — basit CRUD değil)
GET/PUT/DELETE /api/v1/availability/exceptions/
GET         /api/v1/availability/expert/<expert_id>/
GET         /api/v1/availability/available-experts/   (?category=&start_date=&end_date=)

# zoom/urls.py — SADECE 1 endpoint var
POST   /api/v1/zoom/meetings/

# forms/urls.py — TAM İŞLEVSEL bir modül (önceki raporun aksine)
GET    /api/v1/forms/
GET    /api/v1/forms/<form_id>/
POST   /api/v1/forms/submit/
GET    /api/v1/forms/me/form-responses/
GET    /api/v1/forms/me/form-responses/<response_id>/
GET    /api/v1/forms/clients/<client_id>/form-responses/            (expert erişimi)
GET    /api/v1/forms/clients/<client_id>/form-responses/<response_id>/
```

**Düzeltme**: Önceki dokümantasyonda Zoom için `GET/PATCH/DELETE /zoom/meetings/{id}/` gibi tam bir CRUD listelenmişti — bunlar **yok**. Gerçek meeting oluşturma, `appointments` view'ı içinden `zoom.services.create_zoom_meeting()` fonksiyonu doğrudan çağrılarak yapılıyor (randevu `confirmed` olduğunda). `zoom` app'i pratikte `appointments`'a sıkı bağımlı, bağımsız bir REST kaynağı değil.

## 📊 Data Models (gerçek `models.py` alanları)

Önceki dokümantasyon, profil alanlarının çoğunu (bio, hourly_rate, phone_verified, timezone konumu, birth_date konumu vb.) **yanlış tahmin etmişti**. Gerçek şema, alanları `User` ile profil modelleri arasında farklı dağıtıyor:

```
User (accounts/models.py, AbstractUser'dan türer)
├── email (unique, USERNAME_FIELD)
├── role: admin | expert | client
├── first_name, last_name, gender, birth_date, timezone   ← BUNLAR PROFİLDE DEĞİL, USER'DA
├── national_id / id_number (TCKN, regex validasyonlu), phone_number, country
└── is_deleted

ExpertProfile (BaseProfile → user OneToOne)
├── about (bio DEĞİL), title (unvan), approval_status
├── license_number, experience_years, institution
├── session_price + currency (hourly_rate DEĞİL, "session_price")
├── appointment_duration (default 45), free_first_session, video_intro_url
├── availability_status: available|active|busy|away  (önceki listeden farklı)
├── rating_average, rating_count
├── university/degree_level/major (FK'lar) + services/specializations/languages/
│   approach_methods/target_groups/session_types (ManyToMany'ler — zengin bir taksonomi)
└── profile_photo YOK — foto, Document modeli üzerinden type=profile_photo ile tutulur

ClientProfile (BaseProfile → user OneToOne)
├── expert (FK → ExpertProfile, atanan uzman — nullable)
├── substances_used (M2M → AddictionType), support_goal (tekil, "goals" değil)
├── received_service_before, onboarding_complete, is_active_in_treatment
└── emergency_contacts (ters FK → EmergencyContact, çoklu kayıt olabilir)

Document (tek, generic model — hem profil fotoğrafı hem diploma/CV/onay formu için kullanılıyor)
├── user (FK), uid (UUID), file_key, type: profile_photo|degree|cv|consent_form|other
├── is_primary, is_current, verified, verified_at
└── presign-upload akışı: backend sadece presigned URL üretir, dosya doğrudan Supabase'e gider

Appointment (appointments/models.py)
├── expert, client (User FK, ExpertProfile/ClientProfile DEĞİL)
├── date, time, duration (default 45), status (6 durum — bkz. backend/claude.md)
├── zoom_start_url, zoom_join_url, zoom_meeting_id
└── is_deleted (soft delete)

WeeklyAvailability / AvailabilityException (availability/models.py)
└── UniqueConstraint VE CheckConstraint'ler MEVCUT (önceki raporun "eksik" iddiasının aksine):
    - unique_expert_service_day_time (aynı gün/servis/saat çakışmasını DB seviyesinde engeller)
    - start_time < end_time zorunluluğu

Form / Question / FormResponse / Answer / RiskLevelMapping (forms/models.py)
└── DAST-10 ve SDS gibi klinik tarama ölçekleri için otomatik skorlama + risk seviyesi
    hesaplama mantığı var (Form.calculate_risk_level, Answer.calculate_score).
    Bu, "eksik/kullanılmayan" bir modül DEĞİL — tam işlevsel bir klinik form motoru.
```

## 🔍 Frontend ↔ Backend Haberleşmesinde Tespit Edilen Gerçek Sorunlar

Bu bölüm, önceki raporun genel geçer ("pagination yok", "interceptor yok" gibi) maddelerinin ötesinde, **kod okunarak doğrulanmış somut** entegrasyon sorunlarını listeler:

1. **[DÜZELTİLDİ — 2026-08-17]** ~~15 dakikalık access token + refresh mekanizması hiçbir katmanda yok.~~ `POST /accounts/token/refresh/` eklendi, her iki frontend de 401'de otomatik refresh deniyor. Detay için yukarıdaki "Access token 15 DAKİKA, ama artık gerçek bir refresh akışı VAR" bölümüne bakın.

2. **[YÜKSEK] Expert frontend'in hata mesajı okuma mantığı backend'in gerçek hata formatıyla uyuşmuyor.** `expert/src/lib/handle-server-error.ts` sadece `error.response.data.title` alanını okuyor. Backend'de ise hata gövdeleri neredeyse hep `detail` (accounts, forms, document view'larında 16 yerde) veya `error` (appointments/availability custom validasyonlarında) anahtarını kullanıyor — **`title` anahtarı backend'in hiçbir hata yanıtında yok** (tek `title` kullanımı, `ExpertProfile.title` adlı bambaşka bir model alanının serializer çıktısı). Sonuç: expert arayüzünde kullanıcıya gösterilen hata tostları neredeyse her zaman backend'in asıl mesajı yerine sabit "Something went wrong!" metnini gösteriyor.

3. **[KISMEN DÜZELTİLDİ — 2026-08-17]** ~~`client/` içinde global 401/hata interceptor'ı hiç yok~~ — artık `lib/api.ts`'te bir response interceptor'ı var (401 → refresh dene → başarısızsa `/signin`'e yönlendir). `expert/` içindeki **iki katmanlı, örtüşen** yapı hâlâ mimari olarak duruyor (axios interceptor + React Query `QueryCache.onError`) ama 2026-08-17'de doğrulandığı üzere ikinci katman (React Query) projede `useMutation`/`useQuery` hiç kullanılmadığı için **pratikte ölü kod** — tutarsızlık riski teorik, aktif değil (bkz. expert/claude.md).

10. ✅ **[DÜZELTİLDİ — 2026-08-17, 5. tur]** ~~CSRF koruması muhtemelen hiç aktif değil.~~ İki katmanlı çözüm uygulandı: `access_token`/`refresh_token`/`csrftoken` cookie'leri artık `SameSite=Lax` (önceden `None`), VE `CookieJWTAuthentication.enforce_csrf()` eklenip Django'nun standart CSRF token doğrulaması cookie-tabanlı istekler için gerçekten çalışıyor (`Authorization: Bearer` header'ıyla gelen istekler muaf — CSRF riski taşımıyorlar). İki frontend'in axios client'larına da `xsrfCookieName`/`xsrfHeaderName`/`withXSRFToken` eklendi. `curl` ile orijinal PoC yeniden çalıştırıldı: aynı CSRF token'sız form-encoded `POST /accounts/logout/` artık `205` yerine `403 {"detail":"CSRF doğrulaması başarısız: CSRF token missing."}` dönüyor; doğru `X-CSRFToken` header'ıyla (gerçek `Origin: http://localhost:5174` header'ı simüle edilerek) aynı istek `205` ile başarılı. Detay, tam doğrulama adımları ve tek doğrulanamayan parça (gerçek tarayıcıda axios'un otomatik davranışının tıklanarak test edilememesi) için dosyanın en üstündeki "5. tur" changelog girişine bakın.

4. **[DÜZELTİLDİ — 2026-08-17]** ~~Login/`/me/` yanıtları `role` ve `id` döndürmüyor.~~ Artık ikisi de dönüyor (`accounts/views/views.py`, "Randevu Zinciri" değişikliği — bkz. yukarıdaki changelog). Bu madde önceden buradaydı, hâlâ çözülmemiş gibi göründüğü için düzeltildi; kod bu turda `curl` ile yeniden doğrulandı.

5. **[DÜŞÜK-ORTA] `available-experts/` ve `expert/<id>/calendar/` uçları büyük veri altında yavaşlayabilir.** `AvailableExpertsByCategoryView` ve `MyAvailabilityView` (availability/views.py), her expert × her gün için Python döngüsüyle çakışma hesabı yapıyor (DB seviyesinde değil). Klasik "pagination eksik" değil, asıl risk N+1/quadratic hesaplama — expert sayısı ve tarih aralığı büyüdükçe response süresi lineer/karesel büyür.

6. **[DÜŞÜK] `appointments/` listeleme ucu zaten `start_date`/`end_date` zorunlu tutuyor ve süreyi 4-6 ayla sınırlıyor** — yani "1000+ randevu tek seferde dönüyor" iddiası bu endpoint için abartılı; asıl pagination ihtiyacı `available-experts` ve `clients/` gibi sınırsız listelerde.

7. **[DÜŞÜK] `client/README.md` ve `expert/README.md` hâlâ orijinal açık kaynak şablon README'leri** (TailAdmin / shadcn-admin) — Lunova'dan, backend'den, portlardan hiç bahsetmiyorlar. Yeni bir geliştirici bu dosyalara güvenirse yanlış repo klonlamaya çalışır.

8. **[DÜŞÜK] `backend/requirements.txt` UTF-16 kodlamayla kaydedilmiş** (`file` komutu: "UTF-16, little-endian"). Bazı ortamlarda/araçlarda `pip install -r requirements.txt` sorun çıkarabilir; ayrıca listede gerçek `djangorestframework_simplejwt==5.5.1` yanında anlamsız/muhtemelen yanlışlıkla eklenmiş bir `rest-framework-simplejwt==0.0.2` paketi de var.

9. **Gerçek, ekip tarafından bilinen bir hata** (`expert/ToDo.md`'den, tahmin değil): Randevu reddetme (reject) işlemi expert arayüzünden backend'de **403 Forbidden** ile başarısız oluyor; ayrıca `dashboard/api.ts` hâlâ hardcoded `localhost` kullanıyor (production build'i kıracak). Bu iki madde ToDo.md'de açıkça not edilmiş, doğrulanmış gerçek bug'lar.

## 🚀 Development

```bash
# Backend — .env artık repo'da VAR (gitignore'da ama diskte mevcut, dev-hazır: mock storage, mock Zoom).
# ⚠️ Python sürümü ÖNEMLİ: sistemde varsayılan kurulu olabilecek en yeni Python (örn. 3.14) ile
# requirements.txt'teki bazı paketler (psycopg2, pyiceberg, pyroaring) derlenmiş wheel bulamayıp
# kaynaktan derlemeye çalışır ve C++ derleyicisi yoksa kurulum patlar. Dockerfile'ın kullandığı
# Python 3.12 ile requirements.txt HİÇ değiştirilmeden sorunsuz kuruluyor (2026-08-17'de doğrulandı).
cd backend && py -3.12 -m venv venv && venv\Scripts\pip install -r requirements.txt
venv\Scripts\python manage.py migrate
venv\Scripts\python accounts/tests/feed_accounts.py   # zorunlu temel veri (SQLite için tek gereken script)
venv\Scripts\python manage.py runserver               # :8000, admin paneli :8000/admin/

# Client — .env artık repo'da VAR (gitignore'da ama diskte mevcut)
cd client && npm install && npm run dev   # :5174

# Expert — .env.example VE .env artık repo'da VAR
cd expert && npm install && npm run dev   # :5173 (Vite otomatik farklı porta kayabilir)
```

> `backend/venv/`, `client/node_modules/`, `expert/node_modules/` bu makinede 2026-08-17'de zaten kuruldu (hepsi gitignore'da, diskte duruyor) — yeni bir agentic çalışma başlarken önce bunların var olup olmadığını kontrol et, muhtemelen `npm install`/`pip install`'ı tekrar çalıştırmana gerek kalmaz.

## 🐳 Docker (2026-08-17'de eklendi)

Root'ta `docker-compose.yml` var — backend/client/expert'in her biri kendi `Dockerfile`'ına ve kendi `.env`'ine sahip (`backend/.env`, `client/.env`, `expert/.env` — hepsi dev-hazır değerlerle oluşturuldu, gitignore'da). Orkestrasyon olarak **Docker Compose** seçildi (Swarm/Kubernetes değil — tek makinede, tek geliştirici için gereksiz karmaşıklık olurdu).

```bash
docker compose up              # backend + client + expert, hepsi
docker compose up backend      # sadece backend (SQLite, host'ta :8000)
docker compose up client       # sadece danışan arayüzü (:5174)
docker compose up expert       # sadece uzman arayüzü (:5173)
docker compose down            # durdur (SQLite dosyası ve kod host'ta kaldığı için veri kaybı yok)
```

Backend container'ı açılışta otomatik `migrate` çalıştırır (`backend/docker-entrypoint.sh`). `backend/db.sqlite3` host ile bind-mount edildiği için container içinde yapılan değişiklikler kalıcıdır — ayrı bir DB volume'una gerek yok. Frontend container'ları `./client`/`./expert`'i bind-mount eder (hot-reload çalışır), `node_modules` için host/Linux karışmasını önlemek adına ayrı anonim volume kullanılır.

`backend/requirements.txt` bu turda UTF-16'dan UTF-8'e çevrildi — önceden Linux container'da `pip install` bunu düzgün okuyamayabilirdi.

## 🧭 Geliştirme Fikirleri (notlar — henüz uygulanmadı)

Bu bölüm hata/bug listesi değil; kullanıcının ileride sistem geneli için ayrıca paylaşacağı planlama dokümanlarına girdi olması için düşülmüş, **henüz değerlendirilmemiş, henüz uygulanmamış** basit fikir notlarıdır. Sonraki bir oturumda kullanıcıyla birlikte önceliklendirilmeli.

1. **Randevu hatırlatma e-postası.** `backend`'de e-posta gönderme altyapısı zaten çalışıyor (`send_mail`, şifre sıfırlama akışında kullanılıyor — `EMAIL_BACKEND`/`EMAIL_HOST_*` zaten env'de tanımlı). Randevudan belirli bir süre önce (örn. 24 saat ve/veya 1 saat kala) hem danışana hem uzmana otomatik bir hatırlatma e-postası gönderen basit bir zamanlanmış görev (örn. `manage.py` komutu + cron, ya da Celery gibi bir kuyruk) eklenebilir. Var olan altyapı üzerine kurulduğu için görece düşük efor.
2. **Seans sonrası basit değerlendirme (puan + kısa yorum).** `ExpertProfile` modelinde zaten `rating_average`/`rating_count` alanları var (`backend/accounts/models.py`) ama kod taramasında bu alanları dolduran/güncelleyen bir "danışan uzmanı değerlendirir" akışı görülmedi — alanlar şu an sadece salt-okunur görüntüleniyor gibi duruyor, gerçek veri girişi yok. Randevu `completed` (veya benzeri bir durum) olduğunda danışana "bu seansı değerlendir" diye basit bir 1-5 yıldız + opsiyonel kısa yorum formu sunup `rating_average`/`rating_count`'ı güncelleyen bir akış, zaten var olan ama boş duran bir veri modelini tamamlar.

## 📖 Diğer Dosyalar

- [backend/claude.md](backend/claude.md) — Django app detayları, gerçek modeller, README doğrulaması
- [client/claude.md](client/claude.md) — Redux/Axios mimarisi, gerçek dosya ağacı
- [expert/claude.md](expert/claude.md) — Zustand/TanStack mimarisi, ToDo.md/CHANGELOG.md özetleri
- [SYSTEM_REPORT.md](SYSTEM_REPORT.md) — artık kısa bir stub; asıl içerik yukarıdaki "📊 Sistem Durumu Özeti & Yol Haritası" bölümüne taşındı

---

**Son Güncelleme**: 2026-08-17, 5. tur (CSRF koruması kapatıldı — SameSite=Lax + gerçek CSRF token doğrulaması + iki frontend'de axios xsrf config; backend curl ile sıkı doğrulandı, gerçek tarayıcı testi bekliyor)
**Durum**: Aktif Geliştirme
