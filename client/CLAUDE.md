# Client Frontend (Danışan) - Claude Developer Guide

> Bu dosya `client/src` kaynak kodu ve `package.json` doğrudan okunarak doğrulanmıştır. Önceki taslak; Redux thunk isimlerini, paket versiyonlarını ve `.env` dosyalarının varlığını yanlış tahmin etmişti — burada düzeltildi. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `client/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-22, 17. tur) — 🔴 Kritik: Danışan Belge/Fotoğraf Yükleme Tamamen Bozuktu + Kapsamlı UX Düzeltme Turu
> Kullanıcı danışan panelinde profil fotoğrafı güncellemeyi denerken "sadece kontrol et" isteğiyle başlayan bu tur, ardışık olarak birkaç gerçek bug ortaya çıkardı; kullanıcı ayrıca ayrı bir mesajda 7 maddelik somut bir UX düzeltme listesi verdi, onu test ederken 3 bug daha bulundu. Backend/infra (Supabase Storage bağlantı sorunları, Netlify/Docker teşhisi) için kök `claude.md`'nin 19. tur girdisine bakın.
> - **🔴 KRİTİK — `UploadDocumentModal.tsx`, var olmayan bir endpoint'e (`/api/v1/accounts/documents/upload/`) istek atıyordu.** Backend'in `accounts/urls.py`'sinde böyle bir route hiç yok — gerçek akış `presign-upload/` (imzalı URL al) → dosyayı doğrudan storage'a PUT et → `documents/` ile finalize et şeklinde 3 adımlı. Sonuç: danışan tarafından yapılan HER profil fotoğrafı/belge yükleme denemesi backend'e hiç ulaşmadan 404 ile başarısız oluyordu. Expert'in ZATEN doğru uyguladığı (`features/profile/api.ts::uploadDocument`) akışla birebir aynı hale getirilerek düzeltildi; eski hata-mesajı eşleme mantığı da (`errorData.file` diye backend'in hiç döndürmediği bir alanı kontrol ediyordu) gerçek alan adlarına (`file_key`, `detail`) göre düzeltildi.
> - **🟠 YÜKSEK — `default-avatar.png` dosyası hiç mevcut değildi, `UserMetaCard.tsx`'teki `onError` handler'ı bunu sonsuz bir hata döngüsüne çeviriyordu.** Fotoğrafı olmayan (yukarıdaki bug yüzünden pratikte NEREDEYSE TÜM danışanlar) her kullanıcı profil düzenleme sayfasına girdiğinde: fallback görsel de 404 alıyor → `onError` tekrar aynı (kırık) yola set ediyor → tekrar 404 → sonsuza kadar, sunucuya sürekli istek gidiyordu. Düzeltme: gerçek bir `client/public/default-avatar.svg` (basit, nötr bir kişi silüeti) eklendi + hem `UserMetaCard.tsx` hem `UserDropdown.tsx`'teki `onError` handler'ları `onerror = null` guard'ıyla kendini bir kez çalıştıktan sonra susturacak şekilde sağlamlaştırıldı.
> - **Netlify SPA yönlendirme eksikliği (expert'te)**: sayfa yenilendiğinde/derin bir URL'e doğrudan gidildiğinde Netlify'ın kendi 404 sayfası geliyordu. Kök neden: `expert/public/_redirects` hiç yoktu (`client`'ta zaten vardı, sorunsuzdu) — eklendi (`/*  /index.html  200`), build'de `dist/_redirects` olarak doğru yerde olduğu doğrulandı. İkisinin de kendi 404 sayfası zaten vardı ve router'a doğru bağlıydı (client: `pages/OtherPage/NotFound.tsx`; expert: TanStack Router `notFoundComponent`) — yeni bir 404 şablonu oluşturmaya gerek kalmadı.
> - **Kullanıcının 7 maddelik UX listesi, hepsi uygulandı**: (1) header avatarı (`UserDropdown.tsx`) `<img>`'e boyut/konumlama sınıfı (`h-full w-full object-cover object-center`) hiç tanımlı değildi, eklendi. (2) danışan girişinde yükleniyor göstergesi yoktu — `SignInForm.tsx`'e `isSubmitting` + disable + spinner eklendi. (3) header dropdown'daki 3 öğe ("Edit profile"/"Account settings"/"Support") ÜÇÜ DE aynı `/profile`'a gidiyordu, İngilizce'ydi — tek "Profilim" + Türkçeleştirilmiş "Çıkış Yap"a sadeleştirildi. (4) belge yükleme modalındaki `<select>` focus'ta okunamaz hale geliyordu (`focus:bg-slate-950` `dark:` ile sınırlı değildi, light mode'da da arka planı simsiyaha çeviriyordu, eşleşen bir metin rengi yoktu) — kaldırılıp açık `bg-white text-gray-800` eklendi. (5) profil fotoğrafı DIŞINDAKİ yüklemeler sayfa yenileniyormuş gibi hissettiriyordu — kök neden her yüklemeden sonra çağrılan `fetchMe()`'nin `RequireAuth`'u `auth.loading=true` iken tüm `AppLayout`'u tam ekran `GlobalSpinner`'a çevirmesiydi; artık SADECE `documentType === 'profile_photo'` iken tetikleniyor. (6) profil kartlarındaki "Kaydet" butonlarında spinner yoktu — paylaşılan `Button.tsx`'e yeni bir `isLoading` prop'u eklendi, üç karta bağlandı. (7) randevu talebinde uzman müsaitliği accordion'du, artık kategori+tarih seçilince hepsi otomatik açık geliyor (`Request.tsx`'teki `openExpertId`/`handleExpertClick` kaldırıldı).
> - **Bu listeyi test ederken bulunan 3 ek bug**: 🟡 `ExpertAvailability.tsx`'in "seçili slot" state'i HER uzman paneli için ayrı/local'di — bir uzmanın slotunu seçip başka bir uzmanınkine tıklayınca ikisi de seçili kalıp iki ayrı `AppointmentForm` açık kalabiliyordu; state `Request.tsx`'e taşınıp tüm uzmanlar arasında en fazla BİR slot seçili olacak şekilde düzeltildi (kategori/tarih değişince de temizleniyor). 🟡 randevu gönderiminde `finally` bloğu koşulsuz `submitting=false` yaptığı için, başarılı gönderim sonrası "yönlendirme öncesi" 2 saniyelik pencerede buton tekrar tıklanabiliyor, art arda basınca "bu saatte randevunuz var" hatası alınıyordu — bu state de (`isSubmittingAppointment`) yukarı taşındı, artık SADECE hata durumunda resetleniyor; aynı bayrak submit sırasında diğer uzmanların slotlarının da (görsel değişiklik olmadan) tıklanmasını engelliyor. 🟢 `AppointmentForm.tsx`'teki "Gönderiliyor..." spinner'ının path'i (önceden var olan kod) bozuktu, ince bir çentik yerine yanlışlıkla tam daire çiziyordu (`a8 8 0 100-16...`) — `Button.tsx`/`SignInForm.tsx`'teki doğru path (`a8 8 0 018-8V0C5.373...`) ile değiştirildi.
> - **Doğrulama**: her adımda `npx tsc -b` + `npx vite build` temiz (dist temizlendi, `default-avatar.svg`'nin build çıktısına kopyalandığı ayrıca doğrulandı). Belge yükleme akışının kendisi (presign→PUT→finalize) gerçek bir Docker container'dan gerçek bir Supabase projesine karşı GERÇEKTEN çalıştırılıp uçtan uca doğrulandı (bkz. kök `claude.md` 19. tur — Supabase Storage bağlantı sorunları kod değil `.env`'deki bozuk/yanlış-tipte değerlerden çıktı). **Geri kalan tüm UX düzeltmeleri (avatar konumu, spinner'lar, dropdown, select kontrastı, accordion, slot seçim çakışması, çift-tıklama önleme) `tsc`/`build` ile doğrulandı ama gerçek bir tarayıcıda tıklanarak henüz test edilmedi.**

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

> ## 📜 Daha Eski Turlar (2026-08-20, 14. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor (global bildirim sistemi eklendi [14. tur], Formlar'daki `yes_no` seçenek kaybı bug'ının gerçek kök nedeni bulunup düzeltildi [13. tur], Formlar: çoklu seçim bug'ı + breadcrumb + gönderim onay/doğrulama modalleri [12. tur], "Formlar" sekmesi eklendi [11. tur], ana sayfa scroll bug'ı + Zoom 15dk kısıtı + takvim rengi lejantı [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + `/terms`+`/privacy` altyapısı [7. tur], toast z-index bug'ı [6. tur], CSRF token desteği [5. tur], ExpertAvailability navigate no-op [4. tur], access token refresh [3. tur], profil düzenleme + ErrorBoundary [devam turu], randevu tip düzeltmesi + iptal aksiyonları [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 14. tur — Yeni Özellik: Global Bildirim Sistemi
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
10. ✅ **[DÜZELTİLDİ — 2026-08-22, 17. tur]** ~~`components/UserProfile/UploadDocumentModal.tsx`, fotoğraf yükleme sonrası `dispatch(fetchMe())` → `App.tsx`'teki `RequireAuth` tüm `AppLayout`'u (overlay değil, tam replace) `GlobalSpinner` ile değiştiriyor.~~ — `fetchMe()` artık sadece `documentType === 'profile_photo'` iken tetikleniyor, diğer belge tiplerinde bu tam ekran flaş'ı hiç oluşmuyor. Detay için yukarıdaki "17. tur" changelog girişine bakın.
11. **[7. turda bulundu]** Sidebar daraltılmış hâlde gösterilen `public/images/logo/logo-icon.svg` gerçek bir Lunova ikonu değil, TailAdmin'in jenerik placeholder'ı — elimizdeki iki PNG (yatay/dikey lockup) bu kullanım için uygun değil, ayrı bir icon-only asset gerekiyor.
12. **[7. turda bilinçli olarak kapsam dışı bırakıldı]** `README.md` hâlâ orijinal TailAdmin şablon README'si (yukarıda detaylı) — bu tur "canlı UI" turuydu, dokümantasyon turu değil.
13. **[7. turda eklendi, içeriksiz]** `pages/Legal/{TermsOfService,PrivacyPolicy}.tsx` sadece altyapı — gerçek Kullanım Şartları/Gizlilik Politikası metni kullanıcı tarafından eklenecek.
14. **[15. turda eklendi, 16. turda genişledi]** `pages/Messages/Messages.tsx` hiç tarayıcıda açılmadı — mesaj balonlarının, kalan hak sayacının/info modalının, hak tükenince kırmızı border+disable durumunun, 200 karakter limitinin, "yeni not" bildiriminden `/messages`'a yönlendirmenin ve sayfa yenilendiğinde localStorage taslağının geri geldiğinin manuel doğrulanması öneriliyor.

---
**Son Güncelleme**: 2026-08-22, 17. tur (🔴 kritik: danışan belge/profil fotoğrafı yükleme akışı var olmayan bir endpoint'e istek attığı için tamamen bozuktu, expert'in doğru akışıyla aynı 3 adımlı [presign→PUT→finalize] yapıya çevrildi; 🟠 `default-avatar.png` hiç yoktu, `onError` bunu sonsuz döngüye çeviriyordu, gerçek bir SVG + `onerror=null` guard'ıyla düzeltildi; expert'e eksik olan Netlify `_redirects` eklendi; kullanıcının 7 maddelik UX listesi [avatar konumu, login spinner, dropdown sadeleştirme+TR, select kontrast bug'ı, non-photo upload'ta tam-ekran-spinner flaş'ının kaldırılması, kaydet butonlarına spinner (`Button.tsx`'e yeni `isLoading` prop'u), randevu müsaitlik panellerinin accordion yerine otomatik açık gelmesi] uygulandı; bunu test ederken bulunan 3 ek bug [uzmanlar arası slot seçim çakışması, randevu gönderiminde çift-tıklama yarışı, bozuk spinner SVG path'i] düzeltildi. `tsc -b`/`vite build` her adımda temiz; upload akışının kendisi gerçek Supabase'e karşı uçtan uca test edildi, geri kalan UX düzeltmeleri gerçek tarayıcı testi bekliyor)
