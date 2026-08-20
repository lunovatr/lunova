# Client Frontend (Danışan) - Claude Developer Guide

> Bu dosya `client/src` kaynak kodu ve `package.json` doğrudan okunarak doğrulanmıştır. Önceki taslak; Redux thunk isimlerini, paket versiyonlarını ve `.env` dosyalarının varlığını yanlış tahmin etmişti — burada düzeltildi. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `client/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-20, 16. tur) — Notlar: Seans-Bazlı Mesaj Kotası + Dinamik Gösterge
> Kullanıcı, 15. turdaki saatlik gönderim sınırını (backend'de zaten kaldırıldı, bkz. `backend/claude.md` 15. tur) seans-bazlı bir kotaya (iki seans arası 5 not hakkı) çevirip client tarafında dinamik olarak göstermemizi istedi: kalan hak sayacı, tıklanınca açıklama modalı açan bir info badge, hak bitince kırmızı border + disable, 200 karakter limiti, ve gönderilmemiş taslağın localStorage'da korunması.
> - **API yanıt şekli değişti (breaking)**: backend artık GET/POST'ta düz bir mesaj listesi/objesi yerine `{"messages": [...], "client_quota": {"remaining": N, "limit": 5}}` dönüyor (bkz. `backend/claude.md` 15. tur) — `types/messaging.types.ts`'e `ClientQuota`/`MessagesResponse` tipleri + `CLIENT_MESSAGE_MAX_LENGTH=200` eklendi (önceki `MESSAGE_MAX_LENGTH=1000` kaldırıldı, artık danışan için 200 geçerli).
> - **`pages/Messages/Messages.tsx`**: header'a "Kalan Hak: X/5" + `icons/index.ts`'teki (önceden hiç kullanılmayan) `InfoIcon`'dan bir bilgi butonu eklendi — tıklanınca `useModal`/`Modal` (Forms akışında zaten kurulu desen) ile küçük bir açıklama modalı açılıyor ("Bir sonraki seansınıza kadar... her seansınız tamamlandığında bu hak otomatik olarak yeniden 5'e yükselir..."). `quota.remaining<=0` olduğunda: mesaj kutusunun dış border'ı kırmızıya dönüyor (`border-red-400`), `<textarea>` + gönder butonu `disabled`, kutunun altında kırmızı bir uyarı metni beliriyor. Eski mesajlar `overflow-y-auto` ile scroll edilerek görüntülenmeye devam ediyor (disable sadece yeni yazmayı engelliyor).
> - **Sunucu taraflı reddin ele alınması**: `handleSend`, backend'in `code: "quota_exceeded"` (403) ve `code: "message_too_long"` (400) yanıtlarını ayrı ayrı yakalayıp uygun toast'ı gösteriyor — frontend'in `maxLength`/disable'ını atlayıp doğrudan API'ye istek atan biri de (DevTools/curl) aynı server-side kontrolle karşılaşıyor, kullanıcıya net bir bildirim dönüyor.
> - **localStorage taslak koruması**: `body` her değiştiğinde `lunova_message_draft_${expertId}` anahtarına yazılıyor, mount'ta geri okunuyor, başarılı gönderimde temizleniyor — sayfa yanlışlıkla kapatılır/yenilenirse yazılmış ama gönderilmemiş not kaybolmuyor.
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz (dist temizlendi). Backend tarafı (kota hesaplama, 200 karakter/kota'nın sunucu taraflı zorlanması, seans tamamlanınca sıfırlanma) `APIRequestFactory` ile 10 senaryoyla doğrulandı (bkz. backend/claude.md). **`client`'ın kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda 5 not gönderip 6.'nın reddedildiğinin, kırmızı border/disable durumunun, info modalının ve sayfa yenilendiğinde taslağın geri geldiğinin manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 15. tur) — Yeni Özellik: Notlar (Uzman-Danışan Not/Mesaj Sistemi)
> Kullanıcı, eşleşen her uzman-danışan çifti için klasik canlı chat DEĞİL, kompakt bir not bırakma sistemi istedi (backend detayı: `backend/claude.md`'nin 14. tur girdisi). `client/`'ta mesajlaşmayla ilgili tek kalıntı, hiçbir yerde kullanılmayan bir `ChatIcon` asset'iydi (`icons/index.ts` — TailAdmin şablonundan kalma, hiç import edilmemişti) — sayfanın kendisi sıfırdan inşa edildi, `pages/Appointments/AppointmentDetail.tsx` (tam sayfa deseni) ve `NotificationDropdown.tsx` (polling deseni) en yakın referanslar oldu. Client'ın her zaman TEK bir karşı tarafı (kendi atanmış uzmanı) olduğu için expert'teki gibi bir roster/seçici gerekmedi.
> - **Yeni `pages/Messages/Messages.tsx`**: mount'ta `userProfile.expert` yoksa `dispatch(fetchProfile())`; `userProfile.expert.id` (aşağıya bakın) ile `GET/POST /api/v1/messaging/conversations/${expertId}/messages/`. Mesaj balonları (gönderen kendisiyse sağa hizalı), altta karakter sayaçlı (`1000` limit) `<textarea>` + gönder butonu, 60sn'de bir `NotificationDropdown` ile aynı `setInterval` polling deseni, `429` (throttle) yanıtına özel "Çok sık not gönderiyorsunuz" toast'ı. Uzmanı henüz atanmamış danışanlar için "Henüz size atanmış bir uzman bulunmuyor" boş durumu.
> - **🔍 Bu turda bulunan, önceden fark edilmemiş "uyuyan" bir eksiklik düzeltildi**: `types/profile.types.ts`'deki `ProfileResponse.expert` tipi zaten `id: number` bekliyordu ama backend'in `ClientProfileSerializer.get_expert()`'i sadece `full_name`/`title` dönüyordu — `id` HİÇ yoktu. Hiçbir kod bunu okumadığı için gerçek bir çalışma zamanı hatası hiç üretmemişti, ama bu turda Messages sayfasının expert'in `User.id`'sini bilmesi gerektiği için backend'de düzeltildi (bkz. `backend/claude.md` 14. tur) — `client` tarafında ek bir değişiklik gerekmedi, tip zaten doğruydu.
> - **`App.tsx`**: `RequireAuth` bloğuna `<Route path="/messages" element={<Messages />} />`. **`layout/AppSidebar.tsx`**: `navItems`'e `{ icon: <ChatIcon />, name: "Notlar", path: "/messages" }` — önceden kullanılmayan `ChatIcon` asset'i ilk kez kullanıldı.
> - **Bildirim entegrasyonu (kullanıcı onayıyla)**: `types/notification.types.ts`'teki `NotificationType`'a `"message"` + `NotificationItem`'a `related_user_id` eklendi (backend'in yeni alanıyla birebir). `NotificationDropdown.tsx`'in click handler'ı artık `notification_type === "message"` ise sabit `/messages`'a yönlendiriyor (expert'in aksine client'ın tek karşı tarafı olduğu için bir ID'ye ihtiyaç yok).
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz (dist temizlendi). Backend tarafı (permission/throttle/karakter limiti/bildirim üretimi/dormant `expert.id` düzeltmesi) `APIRequestFactory` ile gerçek verilerle doğrulandı (bkz. backend/claude.md). **`client`'ın kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda danışan olarak giriş yapıp uzmana not gönderme, karakter sayacının/429 hata mesajının doğru göründüğü ve bir "yeni not" bildirimine tıklayınca `/messages`'a yönlendirdiğinin manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 14. tur) — Yeni Özellik: Global Bildirim Sistemi
> Kullanıcı, aktif olarak görülebilecek, yaklaşan (2-3 gün içindeki) randevuları listeleyen, tıklanınca randevu detayına yönlendiren, okundu işaretlenen, 20 gün sonra otomatik temizlenen bir bildirim sistemi istedi. Backend'de sıfırdan bir `notifications/` app eklendi (detay: `backend/claude.md`'nin 12. tur girdisi) — bu turda `client/` tarafı o API'ye bağlandı.
> - **`components/header/NotificationDropdown.tsx` tamamen yeniden yazıldı**: önceden (11. tur değil, en baştan beri — TailAdmin şablonundan kalma) 100% hardcoded/sahte veriyle çalışıyordu (8 tane "Terry Franci" tarzı sahte isim, gerçek API çağrısı hiç yoktu, "okundu" state'i sadece bell ikonundaki tek bir global noktaydı, item bazlı değildi). Artık `GET /api/v1/notifications/`'ı mount'ta + 60sn'de bir polling ile çekiyor, okunmamış sayısını bell ikonundaki noktada gösteriyor, her item'a tıklayınca `PATCH /api/v1/notifications/:id/read/` (optimistic local update + arka planda gerçek çağrı) + `appointment_id` varsa `/appointments/:id`'ye `navigate()`.
> - **Yeni `pages/Appointments/AppointmentDetail.tsx` + `/appointments/:id` route'u**: client'ta randevu detay SAYFASI daha önce hiç yoktu (`AppointmentsList.tsx` düz bir liste, satırlar tıklanamıyordu) — bildirimlerin yönlendireceği bir yer olmadığı için sıfırdan eklendi. `GET /api/v1/appointments/:id/` ile tek randevuyu çekiyor, `AppointmentsTable.tsx`'teki durum renkleri/etiketleri + Zoom katılma + iptal talebi/geri çekme aksiyonlarını (aynı `getZoomJoinBlockMessage` kontrolüyle) tek randevu bazında tekrarlıyor. `PageBreadCrumb`'ın 12. turda eklenen `items` desteğiyle "Home → Randevularım → Randevu Detayı" gösteriyor.
> - **`types/notification.types.ts`** (yeni) — backend `NotificationSerializer` şekliyle birebir.
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz (dist temizlendi). Backend tarafı (sync/idempotency/20-gün-temizlik/HTTP endpoint'leri) Django shell + `APIRequestFactory` ile gerçekten çalıştırılarak doğrulandı (bkz. backend/claude.md). **`client`'ın kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok) — bir sonraki oturumda gerçek bir yaklaşan randevu oluşturup bell'de göründüğünün, tıklanınca hem okundu işaretlendiğinin hem doğru randevuya yönlendirdiğinin manuel doğrulanması öneriliyor.

> ## 📜 Daha Eski Turlar (2026-08-20, 13. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor (Formlar'daki `yes_no` seçenek kaybı bug'ının gerçek kök nedeni bulunup düzeltildi [13. tur], Formlar: çoklu seçim bug'ı + breadcrumb + gönderim onay/doğrulama modalleri [12. tur], "Formlar" sekmesi eklendi [11. tur], ana sayfa scroll bug'ı + Zoom 15dk kısıtı + takvim rengi lejantı [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + `/terms`+`/privacy` altyapısı [7. tur], toast z-index bug'ı [6. tur], CSRF token desteği [5. tur], ExpertAvailability navigate no-op [4. tur], access token refresh [3. tur], profil düzenleme + ErrorBoundary [devam turu], randevu tip düzeltmesi + iptal aksiyonları [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 13. tur — Formlar: Gerçek Kök Neden Bulundu (12. Turun Teşhisi Yanlıştı)
> - 2026-08-20, 12. tur — Formlar: Çoklu Seçim Bug'ı + Breadcrumb + Gönderim Onay/Doğrulama Modalleri
> - 2026-08-19, 11. tur — Yeni Özellik: Formlar Sekmesi
> - 2026-08-19, 8. tur — Ana Sayfa Scroll Bug'ı, Zoom 15dk Kısıtı, Takvim Rengi Lejantı
> - 2026-08-19, 7. tur — Mobil Bug'lar, Şablon Temizliği, Ana Sayfa Yeniden Yapıldı
> - 2026-08-19, 6. tur — Profil Kartlarında Gizli Toast Bug'ı
> - 2026-08-17, 5. tur — CSRF Token Desteği
> - 2026-08-17, 4. tur — ExpertAvailability Randevu Formu Yönlendirme Düzeltmesi
> - 2026-08-17, 3. tur — Access Token Refresh
> - 2026-08-17, devam — Profil Düzenleme + Yerel Ortam
> - 2026-08-17 — Randevu Zinciri
>
> </details>

## 📋 Hızlı Başlangıç

`node_modules/` bu makinede 2026-08-17'de zaten kuruldu — yeni bir oturumda önce `ls node_modules` ile kontrol et, muhtemelen `npm install`'a gerek yok.

```bash
cd client
npm install
npm run dev      # :5174
npm run build
npm run lint
npm run preview
```

⚠️ **[2026-08-14'te "yok" denmişti, artık eski]** `client/.env` ve `.env.example` **artık diskte var** (2026-08-17'de Docker altyapısı eklenirken oluşturuldu, `.gitignore`'da olduğu için repo'ya commit edilmemiş — `git status` bunları göstermez, dosyalar yine de mevcut). `VITE_API_BASE_URL` hâlâ `lib/api.ts` içindeki fallback'e (`|| 'http://localhost:8000'`) de sahip.

## ⚠️ Bu Proje Bir Şablon Üzerine Kurulu — README.md Buna Göre Değil

`client/package.json`'daki gerçek isim `"tailadmin-react"` — proje [TailAdmin React](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) şablonunun üzerine inşa edilmiş ve **hiç yeniden adlandırılmamış**. `client/README.md`, TailAdmin'in kendi orijinal şablon README'sidir: TailAdmin'i klonlama talimatı, Pro sürüm fiyatlandırması, Figma linkleri içerir — **Lunova'dan, backend'den, port 5174'ten, `VITE_API_BASE_URL`'den tek kelime bahsetmez.** Yeni bir geliştirici bu README'ye güvenirse yanlış repoyu klonlamaya çalışır. Bunun proje-özel bir README ile değiştirilmesi gerekiyor.

`src/pages/` altında da TailAdmin şablonundan kalma, ürünle ilgisi olmayan sayfalar var: `Calendar`, `Charts`, `Forms`, `UiElements`, `Tables`, `OtherPage` gibi klasörler `Appointments`/`Auth`/`Profile` ile birlikte duruyor — bunların hangisi gerçekten kullanılıyor, hangisi şablon artığı, temizlik gerektiriyor.

## 🏗️ Gerçek Dosya Yapısı (`src/` altı, doğrulanmış)

```
client/src/
├── App.tsx, main.tsx, index.css
├── components/   → UserProfile, auth, common, dashboard, form, header, tables, ui
│                   ("charts"/"ecommerce" KLASÖRLERİ YOK — 7. turda silindi, aşağıya bakın)
├── context/      → SidebarContext.tsx, ThemeContext.tsx
├── hooks/        → useGoBack.ts, useModal.ts, useToast.ts
├── icons/
├── layout/       → AppHeader, AppLayout, AppSidebar, Backdrop, SidebarWidget
├── lib/          → api.ts (TEK dosya)
├── mappers/      → profileMapper.ts
├── pages/        → Appointments, AuthPages, Dashboard, Forms, Legal, Messages (15. tur, YENİ),
│                   OtherPage, UserProfiles
│                   ("Blank"/"Calendar"/"Charts"/"Tables"/"UiElements" YOK —
│                    7. turda TailAdmin şablon leftover'ı olarak silindi; "Legal" 7. turda,
│                    içeriksiz /terms+/privacy altyapısı; "Forms" 11. turda YENİ EKLENDİ —
│                    DİKKAT: eski, silinmiş TailAdmin "Forms" şablon sayfasıyla (jenerik
│                    UI-kit demo'suydu) İSİM ÇAKIŞIYOR ama tamamen farklı/gerçek bir özellik,
│                    klinik form doldurma/görüntüleme - bkz. 11. tur changelog;
│                    Appointments/AppointmentDetail.tsx 14. turda YENİ - önceden randevu
│                    detay SAYFASI hiç yoktu, bildirim sisteminin yönlendirme hedefi olarak eklendi;
│                    Messages/Messages.tsx 15. tur, YENİ - uzman-danışan not/mesaj sistemi,
│                    klasik chat DEĞİL, bkz. 15. tur changelog)
├── store/        → authReducer.ts (KULLANILMIYOR — bkz. aşağı), authSlice.ts, hooks.ts, index.ts
└── types/        → appointment.ts, auth.ts, forms.types.ts (11. tur, YENİ), messaging.types.ts
                    (15. tur, YENİ), notification.types.ts (14. tur, YENİ), profile.payload.ts,
                    profile.types.ts
```

`components/dashboard/` (7. turda yeni) → `WelcomeCard.tsx`, `UpcomingAppointmentsCard.tsx`, `MiniCalendarCard.tsx` — `pages/Dashboard/Home.tsx`'in gerçek veri kullanan widget'ları, `components/ecommerce/*`'in yerine geçti.

## 🔌 API Client (`lib/api.ts`) — birebir doğrulanmış

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Frontend-Type': 'client'
  }
})

export default api
```

Bu, `client/src` içindeki **tek** API client dosyası. **[2026-08-17'de eklendi]** Artık bir response interceptor'ı var: 401 → `POST /accounts/token/refresh/` ile sessiz yenileme dene → başarılıysa orijinal isteği tekrar et → başarısızsa `/signin`'e yönlendir (single-flight `refreshPromise` ile eşzamanlı 401'ler tek çağrıyı paylaşır). 500 için ayrı bir genel toast/yönetim hâlâ yok. `vite.config.ts`'de `server.proxy` de tanımlı değil. **[2026-08-17, 5. tur]** `xsrfCookieName`/`xsrfHeaderName`/`withXSRFToken:true` eklendi — backend artık state-değiştiren isteklerde CSRF token istiyor, axios bunu otomatik `csrftoken` cookie'sinden okuyup `X-CSRFToken` header'ına ekliyor (detay yukarıdaki "5. tur" changelog'unda).

Tek istisna: `components/UserProfile/UploadDocumentModal.tsx` içinde yerel, tek seferlik bir 401 kontrolü var — kullanıcıya "Oturum süreniz dolmuş, sayfayı yenileyin" mesajı gösteriyor ama otomatik yönlendirme/refresh yapmıyor. Diğer sayfalar (`AppointmentsList.tsx`, `Request.tsx` vb.) generic try/catch + component-local `isLoading`/`error` state kullanıyor.

## 📊 Redux State — gerçek thunk/alan isimleri (önceki dokümandan FARKLI)

`store/authSlice.ts` gerçek state şekli:
```typescript
{ user, userProfile, isAuthenticated, loading, error }   // "token" alanı YOK (auth cookie-tabanlı)
```

Gerçek thunk'lar: **`fetchMe`, `fetchProfile`, `logoutThunk`** — önceki dokümanın iddia ettiği `fetchUser`/`loginUser`/`updateProfile` isimleri **yanlış**. Login, bir Redux thunk'ı değil — `components/auth/SignInForm.tsx` içinden doğrudan `api.post('/api/v1/accounts/login/', formData)` çağrısı yapılıp ardından `dispatch(fetchMe())` ile store güncelleniyor.

⚠️ `store/authReducer.ts` diye ikinci bir dosya var (`setUser`/`clearUser`/`setLoading` action'ları ile) ama **store'a hiç bağlı değil** — `store/index.ts` gerçek reducer'ı `authSlice.ts`'den import ediyor. Bu ölü kod; silinmesi veya neden durduğunun netleştirilmesi gerekiyor.

## 📦 Gerçek Bağımlılık Versiyonları (package.json)

```json
"react": "^19.0.0", "@reduxjs/toolkit": "^2.0.0", "axios": "^1.12.2",
"react-redux": "^9.2.0",     // ⚠️ önceki dokümanda ^8.1.0 deniyordu, YANLIŞ
"redux": "^5.0.1"             // ayrı bir doğrudan bağımlılık olarak da var
```
Paket adı: **[7. turda düzeltildi]** ~~`"tailadmin-react"`~~ → `"lunova-client"`, versiyon `"2.0.2"` → `"0.1.0"`.

## 🧪 Testing

Test dosyası yok (`*.test.*`/`*.spec.*` → 0 sonuç), `package.json` scriptlerinde `test` yok, hiçbir test kütüphanesi (`jest`/`vitest`/`testing-library`) bağımlılıklarda yok.

## ⚠️ Gerçek Eksikler (doğrulanmış, spekülasyon değil)

1. **[KISMEN DÜZELTİLDİ — 2026-08-17]** ~~Global axios interceptor yok~~ — artık var (bkz. yukarıdaki "🔌 API Client"). Ama `store/authSlice.ts` → `fetchProfile.rejected` hâlâ sadece `state.error`'ı set ediyor, `userProfile`'a dokunmuyor — normal 15 dk'lık access token düşüşü artık interceptor tarafından sessizce telafi ediliyor (refresh), ama refresh'in KENDİSİ başarısız olursa (1 saatten uzun tam hareketsizlik) `userProfile` yine de eski haliyle ekranda kalmaya devam eder; interceptor kullanıcıyı `/signin`'e yönlendirdiği için pratikte fark edilmez ama teorik olarak hâlâ düzeltilmemiş bir state-temizleme eksikliği.
2. **[DÜZELTİLDİ — 2026-08-17]** ~~Token refresh mantığı hiç yok~~ — `POST /accounts/token/refresh/` backend'e eklendi, client artık 401'de bunu otomatik deniyor. `REFRESH_TOKEN_LIFETIME` 1 saate çekildi (detay kök claude.md'de).
3. **[DÜZELTİLDİ]** ~~`.env`/`.env.example` yok~~ — 2026-08-17'de Docker altyapısıyla birlikte ikisi de diskte oluşturuldu (gitignore'da, commit edilmemiş ama mevcut).
4. **README.md proje ile alakasız** (yukarıda detaylı).
5. **`authReducer.ts` ölü kod** — kafa karıştırıyor, temizlenmeli.
6. **Loading/error state her component'te elle tekrarlanıyor** (`useState` ile) — bu doğrulanmış, gerçek bir gözlem (spekülasyon değil): `AppointmentsList.tsx`, `Request.tsx` aynı paterni tekrarlıyor.
7. **[2026-08-17'de bulundu]** `components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub (`console.log`), silme butonu görünüşte çalışıyor ama hiçbir şey yapmıyor; `useToast` bu dosyada hiç kullanılmıyor (kardeş kartlardan farklı).
8. ✅ **[DÜZELTİLDİ — 2026-08-17, 4. tur]** ~~`pages/Appointments/ExpertAvailability.tsx:296` → `AppointmentForm`'a `navigate={() => {}}` (no-op) geçiyor~~ — artık gerçek `useNavigate()` geçiliyor. Detay için yukarıdaki "4. tur" changelog girişine bakın. **Not**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı, sadece `tsc` + kod-yolu incelemesiyle.
9. **[2026-08-17'de bulundu, düşük öncelik]** `pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response'u şekil kontrolsüz `.map()`'e veriliyor (yeni eklenen `ErrorBoundary` bunu artık yakalıyor, ama kök neden düzeltilmedi).
10. **[doğrulandı, hâlâ mevcut]** `components/UserProfile/UploadDocumentModal.tsx`, fotoğraf yükleme sonrası `dispatch(fetchMe())` → `App.tsx`'teki `RequireAuth` tüm `AppLayout`'u (overlay değil, tam replace) `GlobalSpinner` ile değiştiriyor.
11. **[7. turda bulundu]** Sidebar daraltılmış hâlde gösterilen `public/images/logo/logo-icon.svg` gerçek bir Lunova ikonu değil, TailAdmin'in jenerik placeholder'ı — elimizdeki iki PNG (yatay/dikey lockup) bu kullanım için uygun değil, ayrı bir icon-only asset gerekiyor.
12. **[7. turda bilinçli olarak kapsam dışı bırakıldı]** `README.md` hâlâ orijinal TailAdmin şablon README'si (yukarıda detaylı) — bu tur "canlı UI" turuydu, dokümantasyon turu değil.
13. **[7. turda eklendi, içeriksiz]** `pages/Legal/{TermsOfService,PrivacyPolicy}.tsx` sadece altyapı — gerçek Kullanım Şartları/Gizlilik Politikası metni kullanıcı tarafından eklenecek.
14. **[15. turda eklendi, 16. turda genişledi]** `pages/Messages/Messages.tsx` hiç tarayıcıda açılmadı — mesaj balonlarının, kalan hak sayacının/info modalının, hak tükenince kırmızı border+disable durumunun, 200 karakter limitinin, "yeni not" bildiriminden `/messages`'a yönlendirmenin ve sayfa yenilendiğinde localStorage taslağının geri geldiğinin manuel doğrulanması öneriliyor.

---
**Son Güncelleme**: 2026-08-20, 16. tur ("Notlar" sayfasına seans-bazlı mesaj kotası UI'ı eklendi — backend'in `client_quota` alanı taşıyan yeni yanıt şekline uyum, dinamik "Kalan Hak: X/5" göstergesi + `InfoIcon`'lu açıklama modalı (önceden hiç kullanılmayan bir asset ilk kez kullanıldı), hak tükenince kırmızı border + disable, 200 karakter limiti, `code: "quota_exceeded"`/`"message_too_long"` sunucu yanıtlarının ayrı toast'larla ele alınması, ve gönderilmemiş taslağın `localStorage`'da korunması. `tsc --noEmit`/`vite build` temiz, backend tarafı `APIRequestFactory` ile 10 senaryoyla ayrıca doğrulandı (bkz. backend/claude.md); gerçek tarayıcı testi bekliyor)
