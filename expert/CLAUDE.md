# Expert Frontend (Uzman) - Claude Developer Guide

> Bu dosya `expert/src` kaynak kodu, `package.json`, ve projenin **kendi** `ToDo.md`/`CHANGELOG.md` dosyaları okunarak doğrulanmıştır. Önceki taslak dizin ağacının önemli bir kısmını (`pages/`, `types/`, `components/shared/` gibi klasörleri) icat etmişti — burada gerçek ağaç var. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `expert/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-19, 8. tur) — Randevu Onaylama Çift-Modal Bug'ı, Program Takviminde Durum Renklendirmesi
> Kullanıcının bildirdiği somut bir bug + bir UX iyileştirmesi. Tam detay için kök [claude.md](../claude.md)'nin 8. tur girdisine bakın.
> - **`features/reservations/components/pending-appointments.tsx` — gerçek bug düzeltildi**: bekleyen bir randevuyu onay (✓) ikonuyla onaylayınca, işlem gerçekten oluyordu AMA ayrıca bir detay modalı da açılıp tekrar "Onayla" istiyordu, ikinci onaylamada backend "zaten confirmed" hatası veriyordu. Kök neden: ✓/✗ butonları, satırı saran ve `onClick={() => onAppointmentClick(...)}` (detay modalını açan) bir `<div>`'in içinde, `stopPropagation()` olmadan duruyordu — butona tıklayınca hem `handleApprove()` (gerçek PATCH) hem event bubbling ile üstteki div'in click handler'ı (detay modalı) tetikleniyordu. `features/reservations/components/appointments-table.tsx`'te AYNI kalıp zaten doğru (`onClick={(e) => e.stopPropagation()}`) — aynı satır `pending-appointments.tsx`'e de eklendi.
> - **`features/reservations/components/expert-daily-schedule.tsx`** ("Program" widget'ı — Rezervasyonlar sayfasındaki günlük/haftalık takvim): önceden 3 yerde de (`appointmentsByDate` yoğunluk hesabı, günlük timeline filtresi, haftalık grid filtresi) sadece `status === 'confirmed'` gösteriyordu — bekleyen/onay bekleyen randevular takvimde tamamen görünmezdi. Üçü de `status !== 'cancelled'`e genişletildi. Yeni `STATUS_STYLES` map'i (yeşil=onaylandı, amber=bekliyor/onay bekliyor, turuncu=iptal talebi, gri=tamamlandı) hem günlük timeline bloklarına hem haftalık grid hücrelerine uygulandı (önceden hepsi sabit `bg-primary/10` idi), `CardHeader` altına bir renk lejantı eklendi.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Gerçek tarayıcıda tıklanarak test edilmedi (araç yok) — özellikle "bekleyen bir randevuyu ✓ ile onaylayınca artık ekstra modal açılmadığı" ve "Program takviminde bekleyen randevuların amber renkte göründüğü" akışlarının manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-19, 7. tur) — Lunova Logosu, Şablon/Clerk Temizliği, Üçüncü Parti Giriş Kaldırıldı
> Geniş bir UI turu — tam detay için kök [claude.md](../claude.md)'nin 7. tur girdisine bakın. Burada sadece `expert`'e özgü teknik özet.
> - **Lunova logosu eklendi (önceden hiç yoktu)**: `client/public/images/logo/{logo-black-red.png,logo.png}` (gerçek Lunova logosu) `expert/public/images/logo/`'ya kopyalandı.
>   - `features/auth/auth-layout.tsx` (sign-in/sign-up/forgot-password/otp'nin ORTAK sarmalayıcısı) → jenerik SVG ikon + sabit "Shadcn Admin" yazısı yerine gerçek Lunova logosu.
>   - `components/layout/authenticated-layout.tsx` → sidebar'ın en üstünde hiçbir zaman hiçbir şey render olmuyordu (`sidebarData.teams` hep `[]` olduğu için `TeamSwitcher` koşulu hiç doğru olmuyordu) → statik bir Lunova logo bloğu eklendi.
>   - Tek-marka bir ürün için anlamsız olan `team-switcher.tsx` ("Teams" dropdown'ı, "Add team" seçeneğiyle) tamamen silindi; `SidebarData`/`types.ts`'ten `teams`/`Team` alanları da kaldırıldı.
> - **`components/layout/nav-user.tsx` — gerçek bir bug düzeltildi**: sidebar altındaki kullanıcı kutusu `sidebar-data.ts`'teki hardcoded `{name:'satnaing', email:'satnaingdev@gmail.com', avatar:'/avatars/shadcn.jpg'}`'ı gösteriyordu — gerçek giriş yapmış uzmanın adı/e-postası HİÇ görünmüyordu (`/avatars/shadcn.jpg` de zaten repoda yoktu, 404 verip sessizce "SN" fallback'ine düşüyordu). Artık `useAuthStore()`'daki gerçek oturum verisini okuyor (`useAuthGuard` zaten `setAuthUser` ile bu store'u dolduruyordu — sadece `NavUser` tüketmiyordu). Baş harfler artık gerçek isimden hesaplanıyor, "Upgrade to Pro" dead comment silindi, "Sign out"→"Çıkış Yap".
> - **Üçüncü parti giriş butonları kaldırıldı**: `features/auth/sign-in/components/user-auth-form.tsx` ve `features/auth/sign-up/components/sign-up-form.tsx`'teki dekoratif (hiç `onClick`'i olmayan) GitHub/Facebook butonları + "Veya devam et" ayracı silindi — sitede hiçbir dış hesap/OAuth servisi yok, sadece e-posta/şifre girişi kaldı. Google ile giriş **TODO** olarak hem kod yorumlarına hem `expert/ToDo.md`'ye eklendi.
> - **Clerk tamamen söküldü**: `.env`'de `VITE_CLERK_PUBLISHABLE_KEY` hiç yoktu, `main.tsx`'te `ClerkProvider` hiç kurulu değildi, gerçek nav'da `/clerk/*`'e giden tek link zaten yorum satırındaydı (önceki turlarda "muhtemelen ölü kod" olarak not edilmişti — bu turda kesinleşti ve fiilen silindi): `routes/clerk/` (6 dosya), `assets/{clerk-logo,clerk-full-logo}.tsx`, `package.json`'dan `@clerk/clerk-react` (+ `npm install`, 8 paket kaldırıldı, lockfile senkron).
> - **Diğer kullanılmayan şablon sayfaları silindi** (hepsi zaten `sidebar-data.ts`'te yorum satırındaydı/linklenmiyordu — artık dosyalar da yok): `routes/_authenticated/{apps,chats,tasks,users,help-center}/` + `features/{apps,chats,tasks,users}/` + `components/coming-soon.tsx`; `routes/(auth)/sign-in-2.tsx` + `features/auth/sign-in/sign-in-2.tsx` (sahte Vite logosu + sahte testimonial'lı, linklenmeyen alternatif giriş varyantı); `routes/_authenticated/settings/{index,account,notifications,display}.tsx` + `features/settings/{account,notifications,display,profile}/` (sadece `/settings/appearance` gerçekti — `features/settings/index.tsx`'teki `sidebarNavItems` tek gerçek girdiye indirildi, Türkçe'ye çevrildi). `sidebar-data.ts`'teki tüm ölü yorum bloğu (Clerk import, Apps/Chats/Users/Pages/Errors taslakları) temizlendi. **Route dosyaları silindikten sonra `npx vite build` çalıştırılıp `@tanstack/router-plugin`'in `routeTree.gen.ts`'i doğru şekilde yeniden ürettiği doğrulandı** (build çıktısında artık clerk/apps/chats/tasks/users chunk'ları yok).
> - `index.html`: `og:url`/`twitter:url` **gerçekten `https://shadcn-admin.netlify.app`'e**, `og:image`/`twitter:image` de şablonun ekran görüntüsüne işaret ediyordu — hepsi kaldırıldı (yanlış bir Lunova URL'si uydurmak yerine silindi). `<title>`/`meta name="title"` "Shadcn Admin" → "Lunova | Uzman Paneli".
> - `package.json`: `name` `shadcn-admin` → `lunova-expert`, `private` `false`→`true`, `version` `2.1.0`→`0.1.0`.
> - **Hukuki sayfa altyapısı eklendi (İÇERİKSİZ)**: `features/legal/legal-page.tsx` (paylaşılan şablon) + `routes/{terms,privacy}.tsx`. Sign-in/sign-up'ta zaten `href="/terms"`/`href="/privacy"` yazan ama karşılığı olmayan (404'e düşen) linkler vardı — artık gerçek sayfalara gidiyor, `<a href>`'den TanStack `<Link to>`'a çevrildi.
> - **Doğrulama**: `npx vite build` başarılı (route tree yeniden üretildi), `npx tsc -b` bir `unused import` hatası dışında temizdi (düzeltilip tekrar çalıştırıldı, temiz), `npm install` başarılı. `npm run lint`'te 81 pre-existing hata var (console/`any`/type-import kuralları) — hiçbiri bu turun dokunduğu satırlardan kaynaklanmıyor, önceden de vardı, bu turun kapsamı dışı. **Gerçek tarayıcıda tıklanarak hiçbiri test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok).
> - **Fark edilen, ele alınmayan follow-up**: `public/images/favicon*.{png,svg}` hâlâ şablonun jenerik varsayılanı — elimizde uygun bir icon-only Lunova asset'i yok. `README.md` ve `public/images/shadcn-admin.png` (sadece o README'den referans edilen ölü ekran görüntüsü) bu turun kapsamı dışında bırakıldı.

> ## 🔧 Son Değişiklikler (2026-08-17, 5. tur) — CSRF Token Desteği
> Backend artık POST/PATCH/DELETE'lerde gerçek CSRF token doğrulaması yapıyor (kök [claude.md](../claude.md)'deki 5. tur changelog'una bakın). Kapsam: sadece `src/lib/api.ts`.
> - **`src/lib/api.ts`**: axios instance'ına `xsrfCookieName:'csrftoken'`, `xsrfHeaderName:'X-CSRFToken'`, `withXSRFToken:true` eklendi. İlk ikisi axios'un varsayılan (Angular konvansiyonu `XSRF-TOKEN`/`X-XSRF-TOKEN`) isimlerini Django'nunkiyle eşleştiriyor; `withXSRFToken:true` ZORUNLU — axios kaynak kodu okunarak doğrulandı: bu olmadan axios, XSRF header'ını sadece same-origin isteklerde otomatik ekliyor, backend burada her zaman farklı bir portta/subdomain'de olduğu için header hiç gönderilmezdi.
> - **Doğrulama**: `npx tsc --noEmit` temiz. Backend tarafı `curl` ile (gerçek `Origin: http://localhost:5173` header'ı simüle edilerek) sıkı doğrulandı, ama axios'un bu config'le gerçek bir tarayıcıda `csrftoken` cookie'sini okuyup `X-CSRFToken` header'ına doğru koyduğu **tıklanarak test edilmedi** (ortamda tarayıcı otomasyon aracı yok). Bir sonraki oturumda login olup bir POST/PATCH (örn. profil kaydetme, randevu oluşturma/reddetme) deneyip başarılı olduğunu gözlemlemek önerilir — 403 CSRF hatası alınırsa DevTools → Network'te `X-CSRFToken` header'ının gerçekten gittiğine bakılmalı.

> ## 🔧 Son Değişiklikler (2026-08-17, 3. tur) — Access Token Refresh
> **`src/lib/api-setup.ts`**: `setupApiInterceptors()`'daki response interceptor genişletildi. Önceden HER 401'de doğrudan `logout()` + toast tetikleniyordu. Artık: 401 → (login/refresh isteklerinin kendisi ve zaten bir kez denenmiş istekler HARİÇ) önce sessizce `POST /api/v1/accounts/token/refresh/` ile oturumu yenilemeyi dener, başarılıysa orijinal isteği tekrar yapar; refresh de başarısız olursa (oturum gerçekten sona ermiş) var olan `logout()`+toast akışına düşer. Eşzamanlı 401'ler tek bir refresh çağrısını paylaşır (single-flight `refreshPromise`). `main.tsx`'teki dormant `QueryCache.onError` katmanına (React Query hiç kullanılmadığı için zaten tetiklenmiyor, bkz. aşağıdaki "İKİ KATMANLI" notu) bilinçli olarak dokunulmadı. Tasarım gerekçesi (neden `REFRESH_TOKEN_LIFETIME` 1 saat, Zoom seansları) için kök [claude.md](../claude.md)'ye bakın.

> ## 🔧 Son Değişiklikler (2026-08-17, devam) — Profil Düzenleme + Yerel Ortam
> Kullanıcının bildirdiği "profil kaydından sonra sayfa beyaz kalıyor, yönlendirmiyor" şikâyeti araştırıldı. Tam detay için kök [claude.md](../claude.md)'deki changelog'a bakın; özet:
> - **`src/features/profile/profile-form.tsx`**: Kayıt başarılı olduğunda `navigate()` HİÇ çağrılmıyordu — yerine sayfayı görsel olarak dondurup griye çeviren bloklayan `alert("Profil başarıyla güncellendi!")` kullanılıyordu (asıl "beyaz sayfa" algısının kök nedeni). `alert()` kaldırıldı, `useNavigate()` (`@tanstack/react-router`) ile `/profile`'a yönlendirme eklendi.
> - **`src/features/profile/api.ts` → `handleApiError`**: Backend'in düz alan-bazlı DRF validasyon hatalarını (`{"university": ["Invalid pk ..."]}`) tanımıyordu, `errorData.errors` (sarmalanmış obje) bekliyordu — gerçek format bu değil, jenerik "İşlem başarısız oldu" mesajına düşüyordu. Artık düz obje formatı da destekleniyor.
> - **`src/features/profile/maps.ts`**: Canlı DB'ye (`python manage.py shell`) karşı doğrulanınca, `APPROACH_METHODS` (id 2-4) ve `SERVICES[5]` etiketleri gerçek backend ID'leriyle **uyuşmuyordu** — örn. arayüzde "Psikanalitik Terapi" (id=2) seçilince gerçekte DB'de id=2 olan "Kabul ve Kararlılık Terapisi (ACT)" kaydediliyordu. **Bu bir 400 hatası bile vermiyordu — sessizce yanlış approach_method kaydediyordu.** Gerçek DB değerleriyle düzeltildi, `curl` ile PATCH → GET round-trip'i doğrulandı. Diğer taksonomiler (university/degree_level/major/specializations/target_groups/session_types/languages) zaten DB ile birebir örtüşüyordu, dokunulmadı.
> - **`backend/accounts/serializers/profile_update_serializers.py`**: `timezone` alanı eklendi (bu formu değil, client'ın "İletişim Bilgileri" kartını etkiliyor — bkz. client/claude.md).
>
> **Bu turda ayrıca genel bir "aynı hata sınıfı başka yerde tekrarlanıyor mu" taraması yapıldı — reservations/availability/settings temiz çıktı:**
> - `alert()` kullanımı repo genelinde **sıfır** (`grep -rn "alert("` → 0 sonuç); tüm reservations/availability akışları zaten `toast.success`/`toast.error` ile düzgün geri bildirim veriyor.
> - Hardcoded/dummy taxonomy ID→etiket eşlemesi **sadece** `features/profile/maps.ts`'te var; reservations/availability hiçbir yerde böyle bir katman kullanmıyor (backend'den doğrudan isim/string geliyor).
> - **`lib/handle-server-error.ts`'in `.title`-okuma bug'ı (önceki dokümanda "aktif sorun" işaretlenmişti) — bu turda ÖNCELİĞİ DÜŞÜRÜLDÜ**: `grep -rn "useMutation|useQuery"` tüm `src/` genelinde **0 sonuç** — projede React Query'nin `useMutation`/`useQuery` hook'ları hiç kullanılmıyor. `main.tsx`'teki global `mutations.onError: handleServerError` bağlı olsa da tetiklenecek bir mutation yok. Tüm gerçek özellikler (profile, reservations, availability) kendi yerel `try/catch`+`toast` mantığını kullanıyor, hepsi `detail`/`error` okuyor — `title` değil, ama bu doğru çünkü zaten `handleServerError` çağrılmıyor. **Risk gizli/pasif**: birisi ileride bir `useMutation` eklerse aktifleşir.
> - `features/settings/profile/profile-form.tsx` (`SettingsProfile`) hâlâ tamamen ölü şablon kodu — `sidebar-data.ts`'te route'u yorum satırında, gerçek akışı etkilemiyor (temizlik konusu, bug değil).
>
> **Yerel ortam**: `expert/node_modules` bu turda kuruldu, `npx tsc --noEmit` temiz.

> ## 🔧 Son Değişiklikler (2026-08-17) — Randevu Zinciri
> - **Kök neden bulundu**: `useAuthStore().user.id` HER ZAMAN `undefined` idi çünkü backend `/me/` bunu hiç döndürmüyordu. `hooks/use-auth-guard.ts` bunu fark etmeden `role`'ü sabit `['expert']` olarak varsayıyordu. Bunun somut sonucu: `features/reservations/use-appointments.ts` kendi `expertId`'sini SADECE var olan randevulardan (`combined[0].expert`) türetebiliyordu → **randevusu olmayan yeni bir uzman "Randevu Oluştur" modalını hiç kullanamıyordu** ("Expert ID bulunamadı" hatası).
> - **`stores/auth-store.ts`**: `AuthUser.role` tipi `string[]` → `string` (backend'in gerçek `role` alanı tek bir string, dizi değil).
> - **`hooks/use-auth-guard.ts`**: artık backend'in gerçekten döndürdüğü `id`/`role`'ü kullanıyor; hardcoded `['expert']` fallback'i kaldırıldı (backend'de bu alanlar eklendi, bkz. [backend/claude.md](../backend/claude.md)).
> - **`features/reservations/use-appointments.ts`**: `expertId` artık öncelikle `useAuthStore().user.id`'den geliyor; eski randevu-geçmişinden-türetme mantığı sadece store henüz hazır değilken fallback olarak duruyor. Bu, yukarıdaki "yeni uzman ilk randevusunu oluşturamıyor" hatasını çözer.
> - **Araştırıldı, dokunulmadı**: `ToDo.md`'deki "randevu reddetme 403" hatası — backend'de zaten (commit `b74a87d`) düzeltilmiş görünüyor (`PATCH .../status/` artık doğru şekilde `status_update()`'e yönleniyor). ToDo.md'de bu maddenin ekip tarafından kapatılması/doğrulanması önerilir.
> - **Bilinçli olarak DEĞİŞTİRİLMEDİ**: `create-appointment-modal.tsx`'teki danışan (client) seçim listesi hâlâ sadece geçmişte randevusu olan danışanları gösteriyor (`use-appointments.ts`'teki appointment-geçmişi türetmesi). `GET /accounts/clients/`'e geçmek "daha doğru" görünse de, backend'de `ClientProfile.expert` (atanan uzman) hiçbir yerde otomatik set edilmiyor — yani bu uç şu an hemen her uzman için BOŞ döner. Bunu değiştirmek, "hiç randevusu olmayan yeni bir danışanla ilk randevuyu oluşturma" gerçek sorununu ÇÖZMEZ, sadece mevcut (çalışan) listeyi boşaltır. Gerçek çözüm bir "danışan atama" akışı gerektirir — bu randevu zincirinin dışında, ayrı bir özellik kararı.
> - Test edilemedi: bu ortamda `node_modules` kurulu ama `typescript` paketi eksikti (`tsc` binary'si yok) — değişiklikler dikkatli manuel inceleme ile doğrulandı, `npm run build`/canlı tarayıcı testi henüz yapılmadı.

## 📋 Hızlı Başlangıç

`node_modules/` bu makinede 2026-08-17'de zaten kuruldu — yeni bir oturumda önce `ls node_modules` ile kontrol et, muhtemelen `npm install`'a gerek yok.

```bash
cd expert
npm install
npm run dev          # :5173 (Vite dolu ise otomatik başka porta kayar)
npm run build
npm run lint
npm run format / format:check
npm run knip          # kullanılmayan import/export tarayıcı
npm run preview
```

`expert/.env.example` mevcut. **[Güncelleme]** Artık `client/` ve `backend/`de de `.env`/`.env.example` var (2026-08-17'de Docker altyapısıyla eklendi) — "expert bu konuda en iyi durumda" artık geçerli bir ayrım değil, üçü de aynı durumda.

## ⚠️ Bu Proje de Bir Şablon Üzerine Kurulu

`package.json`'daki isim **[7. turda düzeltildi]** ~~`"shadcn-admin"` v2.1.0~~ → `"lunova-expert"` v0.1.0 — proje yine de [shadcn-admin](https://github.com/satnaing/shadcn-admin) açık kaynak şablonu üzerine kurulu olmaya devam ediyor (UI kütüphanesi/bileşen mimarisi olarak). `expert/README.md` hâlâ şablonun orijinal README'si (satnaing'in kendi bio'su, sponsorluk linkleri, `pnpm install` talimatları) — bu 7. turun kapsamı dışında bırakıldı (bkz. yukarıdaki changelog).

**[7. turda kesinleşti ve kaldırıldı]** ~~`@clerk/clerk-react` bağımlılığı ve `src/routes/clerk/` klasörü~~ — Clerk, şablonun demo/örnek auth sağlayıcısıydı, `.env`'de hiç API key tanımlı olmadığı ve gerçek nav'da hiç linklenmediği doğrulanıp tamamen söküldü (routes/clerk/, assets/clerk-*.tsx, package.json'dan bağımlılık). Projenin gerçek auth'u kendi JWT/cookie sistemi (`stores/auth-store.ts` + `lib/api.ts`).

## 🏗️ Gerçek Dosya Yapısı (`src/` altı, doğrulanmış — önceki taslaktan önemli farklarla)

```
expert/src/
├── main.tsx, routeTree.gen.ts (auto-generated), vite-env.d.ts
├── assets/        → brand-icons/, custom/, vite.svg  ("clerk-logo.tsx"/"clerk-full-logo.tsx" YOK, 7. turda silindi)
├── components/    → SADECE ui/, layout/, data-table/  ("components/shared" YOK, "coming-soon.tsx" YOK — 7. turda silindi)
├── config/        → SADECE fonts.ts  ("constants.ts"/"navigation.ts" YOK)
├── context/       → direction-provider, font-provider, layout-provider, search-provider, theme-provider (5 dosya)
├── features/      → auth, availability, dashboard, errors, legal, profile, reservations, settings
│                    ("appointments" ve "clients" klasörleri YOK — randevu/danışan
│                     mantığı "reservations" ve "dashboard" altında yaşıyor;
│                     "apps"/"chats"/"tasks"/"users" YOK — 7. turda silindi, hiç
│                     linklenmeyen şablon demo sayfalarıydı; "settings" artık
│                     sadece "appearance"+"components" içeriyor; "legal" yeni,
│                     içeriksiz /terms+/privacy altyapısı)
│                    API çağrıları burada, her feature'ın kendi api.ts'inde
│                    (örn. features/reservations/api.ts, features/profile/api.ts)
├── hooks/         → use-auth-guard.ts, use-dialog-state.tsx, use-mobile.tsx, use-table-url-state.ts
├── lib/           → api.ts, api-setup.ts, handle-server-error.ts, utils.ts
├── routes/        → (auth)/, (errors)/, _authenticated/, terms.tsx, privacy.tsx, __root.tsx
│                    (TanStack Router file-based; "clerk/" klasörü YOK — 7. turda silindi;
│                     (auth)/sign-in-2.tsx YOK — 7. turda silindi;
│                     _authenticated/{apps,chats,tasks,users,help-center}/ YOK — 7. turda silindi)
├── services/      → SADECE auth.ts  (diğer servisler features/*/api.ts altında, ayrı bir "services" katmanı değil)
├── stores/        → auth-store.ts (Zustand)
└── styles/

# "pages/" ve "types/" adında klasörler YOK — önceki dokümanda uydurulmuştu.
```

## 🔐 API Client ve Hata Yönetimi — İKİ KATMANLI (önemli, önceki dokümanda eksikti)

**`lib/api.ts`** (birebir doğrulandı):
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: { 'X-Frontend-Type': 'expert', 'Content-Type': 'application/json' },
  // [2026-08-17, 5. tur] Backend artık CSRF token istiyor
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withXSRFToken: true
})
```

**`lib/api-setup.ts`** — `main.tsx` içinde `setupApiInterceptors()` olarak gerçekten çağrılıyor (önceki dokümanda "acaba bağlı mı" belirsizdi, doğrulandı: bağlı). 401'de `isLoggingOut` bayrağını kontrol ederek `logout()` + toast; 500+'de generic toast.

**Ayrıca `main.tsx` içinde React Query'nin `QueryCache.onError`'ı da AYRI, daha kapsamlı bir 401/500 yönetimi yapıyor** — cache temizleme, `/sign-in`'e yönlendirme, `/500`'e yönlendirme dahil. Yani mimari olarak **iki bağımsız hata yönetimi katmanı** tanımlanmış (axios interceptor + React Query onError).

> **⚠️ Güncelleme (2026-08-17)**: `QueryCache`/`mutations.onError` katmanı pratikte **ölü/tetiklenmeyen kod** — `grep -rn "useMutation|useQuery"` tüm `src/` genelinde **0 sonuç** verdi, projede React Query'nin bu hook'ları hiç kullanılmıyor. Yani şu an aktif olan **tek** katman axios interceptor'ı (`lib/api-setup.ts`). Ayrıca `features/profile/api.ts` gibi bazı feature'lar (profile, muhtemelen reservations/availability de) kendi **üçüncü, tamamen bağımsız** yerel `handleApiError`/`try-catch` mantığını kullanıyor — bunlar `detail`/`error` okuyor, doğru çalışıyor. Risk hâlâ gerçek ama gizli: biri ileride bir `useMutation` eklerse, o an aniden aktifleşecek olan `handleServerError`'ın `.title`-okuma bug'ı (aşağıya bakın) devreye girer.

### 🔴 `handle-server-error.ts` gerçek davranışı — backend ile UYUŞMUYOR

```typescript
export function handleServerError(error: unknown) {
  let errMsg = 'Something went wrong!'
  if (error && typeof error === 'object' && 'status' in error && Number(error.status) === 204) {
    errMsg = 'Content not found.'
  }
  if (error instanceof AxiosError) {
    errMsg = error.response?.data.title   // ← SADECE "title", ".detail" fallback'i YOK
  }
  toast.error(errMsg)
}
```

Backend'in gerçek hata gövdelerinde (`backend/claude.md`'ye bakın) `title` anahtarı **hiç kullanılmıyor** — 16 yerde `detail`, bazı yerlerde `error` kullanılıyor. Sonuç: bu fonksiyon çağrıldığında `errMsg` neredeyse her zaman `undefined` olup **sabit "Something went wrong!" mesajına düşüyor**, backend'in gerçek validasyon mesajı (örn. "pending durumundan cancelled'a geçiş yapılamaz") kullanıcıya hiç ulaşmıyor. Bu, önceki raporun genel "response format tutarsız" maddesinden çok daha somut ve doğrudan düzeltilebilir bir hata.

## 📊 Zustand Store — gerçek alan isimleri (önceki dokümandan FARKLI)

```typescript
// stores/auth-store.ts — gerçek şekil
{ user, loading, error, initialized, isLoggingOut,
  setUser, fetchUser, logout, reset }
// "isLoading" DEĞİL "loading"; "login" action'ı YOK.
```
Login burada da bir store action'ı değil — `features/auth/sign-in/components/user-auth-form.tsx` içinden doğrudan `api.post('/api/v1/accounts/login/', ...)` çağrılıp ardından `fetchUser()` tetikleniyor. (`client/`deki pattern ile aynı — iki frontend de login'i store dışında, component içinde yapıyor.)

## 📦 Gerçek Bağımlılık Versiyonları

Önceki dokümanda hemen her paket için "latest" yazıyordu — gerçek `package.json` tamamen pinlenmiş semver aralıkları içeriyor:

```json
"zustand": "^5.0.8", "@tanstack/react-router": "^1.132.25", "@tanstack/react-query": "^5.90.2",
"axios": "^1.12.2", "sonner": "^2.0.7", "react-hook-form": "^7.63.0", "zod": "^4.1.11",
"react": "^19.1.1", "tailwindcss": "^4.1.13"   // ⚠️ önceki doküman "^3.x" diyordu, YANLIŞ (v4)
```
Dokümante edilmemiş ama gerçekte kullanılan önemli paketler: `@schedule-x/*` (takvim), `@tanstack/react-table`, `recharts`, `date-fns`, `temporal-polyfill`. **[7. turda kaldırıldı]** ~~`@clerk/clerk-react`~~ — bkz. yukarıdaki "Şablon Üzerine Kurulu" bölümü.

## 🧪 Testing

Test dosyası yok, `vitest`/`jest`/`testing-library` bağımlılıklarda yok.

## 🗒️ Ekip Notları (önceden `ToDo.md`'de tutuluyordu — 2026-08-19'da içeriği doğrulanıp buraya taşındı, `ToDo.md` silindi)

`expert/ToDo.md`, projenin kendi geliştiricisinin elle tuttuğu bir yapılacaklar/yapılmışlar listesiydi. Kök `CLAUDE.md`'nin "🚀 Önerilen sıradaki adımlar" ve "🟡 Doğrulanmış, hâlâ açık" mekanizması aynı işlevi zaten (önem derecesiyle, otomatik yüklenen bir dosyada) karşılıyor — ayrı bir dosya olarak tutulması gereksiz hale gelmişti. Silinmeden önce her madde tek tek koda karşı yeniden doğrulandı — birkaçı ("Yapılacaklar" olarak işaretli olsa da) aslında çoktan çözülmüş, dosyanın kendisi güncellenmemiş (drift):

- ✅ **[ÇÖZÜLDÜ — ToDo.md'nin bilgisi güncel değildi]** "Randevu reddetme 403 Forbidden" — ToDo.md hâlâ "bilinen bug" diye listeliyordu, ama backend'de (commit `b74a87d`) çoktan düzeltilmiş görünüyor (`PATCH .../status/` doğru şekilde `status_update()`'e yönleniyor).
- ✅ **[ÇÖZÜLDÜ — ToDo.md'nin bilgisi güncel değildi, bu turda doğrulandı]** "`features/dashboard/api.ts` hardcoded `localhost` kullanıyor" — bu dosya artık repoda yok (`features/dashboard/` altında sadece `index.tsx` var; içinde hiç `localhost` hardcode'u yok, `grep` ile doğrulandı) — muhtemelen bir refactor sırasında dosya kaldırılırken sorun da kendiliğinden ortadan kalkmış.
- 🟡 **[KISMEN ÇÖZÜLDÜ — ToDo.md'nin bilgisi de güncel değildi]** "Randevu oluşturma ekranında danışan seçimi manuel ID girişi (isimle arama yok)" — artık doğru değil: `create-appointment-modal.tsx` (gerçek yolu `features/reservations/components/`, ToDo.md'de yanlışlıkla `features/dashboard/components/` yazıyordu) gerçek bir `<Select>` dropdown'ı, danışan **isimlerini** gösteriyor (`client.name`), ham ID girişi yok. **Hâlâ açık kalan gerçek sınırlama**: `use-appointments.ts`'teki `clients` listesi backend'in `GET /accounts/clients/` ucundan DEĞİL, sadece mevcut randevu geçmişinden türetiliyor (`combined.forEach(a => clientMap.set(a.client, a.client_name))`) — hiç randevusu olmamış bir danışan bu dropdown'da hiç görünmüyor. Bunu gerçek endpoint'e bağlamak, backend'de `ClientProfile.expert` (atanan uzman) ilişkisinin doldurulduğu bir "danışan atama" akışı gerektirir (şu an hiçbir yerde otomatik set edilmiyor) — bu bilinçli ertelenmiş bir mimari karar, unutulmuş bir todo değil.
- ✅ **[ÇÖZÜLDÜ]** "Saatlik randevuların üstüne tıklandığında detay görme... olmalı" — `AppointmentDetailDialog` (`appointment-detail-dialog.tsx`) zaten var ve çalışıyor; `ExpertDailySchedule`, `AppointmentsTable` ve `PendingAppointments`'taki randevu satırlarının hepsinden açılabiliyor. **Kısmen açık kalan**: "...ve update edebilme" — sadece DURUM güncellemesi yapılabiliyor (Onayla/Reddet/İptal Talebini Reddet/İptal Et), tarih/saat/süre/not gibi diğer alanların sonradan düzenlenmesi mümkün değil.
- **[Planlı özellik, henüz uygulanmadı]** Google ile giriş/kayıt (OAuth) — sitede hâlâ hiçbir dış hesap servisi yok, bu yüzden `features/auth/sign-in/components/user-auth-form.tsx` ve `features/auth/sign-up/components/sign-up-form.tsx`'teki dekoratif GitHub/Facebook butonları kaldırılmıştı (7. tur). İleride Google eklenince aynı yere ("Veya devam et" bölümü) tek bir "Google ile devam et" butonu eklenmesi öneriliyor; `client/`'ta da sıfırdan eklenmesi gerekecek (orada hiç sosyal giriş butonu hiç olmadı).
- ✅ (CHANGELOG.md'den, hâlâ geçerli) Token birikmesi hatası (eski token'lar temizlenmeden isteklere binmesi) geçmişte düzeltilmiş — token yönetimi alanı hassas, ileride dokunulursa dikkatli olunmalı.
- 📝 (CHANGELOG.md'den, hâlâ geçerli) **CHANGELOG.md açıkça planlıyor**: Zustand'dan Redux'a geçiş, "ekip ve state karmaşıklığı büyüdüğünde" yapılacak — mevcut Zustand kullanımı ekip tarafından geçici/ilk-aşama görülüyor.

**Not**: `CHANGELOG.md` silinmedi, duruyor — bu bir geçmişe dönük sürüm notu, "yapılacaklar" listesi değil, farklı bir işlevi var; güncel tutulmaya devam edilmesi öneriliyor.

## ⚠️ Gerçek Eksikler (doğrulanmış)

1. **`handle-server-error.ts` yanlış anahtar okuyor** (`title` yerine `detail`/`error` olmalı) → hâlâ doğru bir bug ama **[2026-08-17'de önceliği düşürüldü]**: bu fonksiyon şu an hiçbir yerde tetiklenmiyor (proje genelinde `useMutation`/`useQuery` kullanılmıyor). Profil formu gibi gerçek özellikler kendi yerel hata yönetimini kullanıyor. Kolay düzeltilebilir ama şu an aktif kullanıcı etkisi yok — birisi bir `useMutation` eklerse öncelik yükselir.
2. **[DÜZELTİLDİ — 2026-08-17]** ~~Token refresh yok~~ — backend'e `POST /accounts/token/refresh/` eklendi, `api-setup.ts`'teki interceptor artık 401'de bunu otomatik deniyor. Sistemin yeni en kritik sorunu artık CSRF koruması eksikliği — bkz. kök [claude.md](../claude.md).
3. **İki katmanlı hata yönetimi mimarisi tanımlı ama pratikte tek katman aktif** (axios interceptor çalışıyor; React Query onError katmanı ölü kod, yukarıya bakın) — birleştirme/temizlik hâlâ düşünülebilir, ama "tutarsızlık riski" iddiası abartılıydı çünkü ikinci katman zaten hiç çalışmıyor.
4. **README.md proje ile alakasız** (şablon README'si).
5. **i18n yok**, tüm metinler hardcoded Türkçe — gerçek, kontrol edildi (i18n kütüphanesi `package.json`'da yok).
6. **[DÜZELTİLDİ — 2026-08-19, 7. tur]** ~~Kullanılmayan/belirsiz `@clerk/clerk-react` bağımlılığı~~ — hiç kullanılmadığı kesinleşti, `routes/clerk/` + `assets/clerk-*.tsx` + paket bağımlılığıyla birlikte tamamen kaldırıldı.
7. **[DÜZELTİLDİ/GÜNCEL DEĞİLMİŞ — 2026-08-19'da doğrulandı]** ~~Bilinen backend entegrasyon bug'ı (randevu reddetme 403) ve hardcoded localhost (`dashboard/api.ts`)~~ — ikisi de artık geçersiz, `ToDo.md`'nin kendisi güncellenmemiş kalmıştı. Detay ve doğrulama için yukarıdaki "🗒️ Ekip Notları" bölümüne bakın.
8. **[7. turda bulundu]** `public/images/favicon*.{png,svg}` hâlâ şablonun jenerik varsayılanı, gerçek bir Lunova ikonu değil — elimizdeki logo asset'leri (yatay/dikey lockup) favicon için uygun değil, ayrı bir icon-only asset gerekiyor.
9. **[7. turda eklendi, içeriksiz]** `features/legal/legal-page.tsx` + `routes/{terms,privacy}.tsx` sadece altyapı — gerçek Hizmet Şartları/Gizlilik Politikası metni kullanıcı tarafından eklenecek.
10. **[2026-08-17'de bulundu, düzeltildi]** `features/profile/maps.ts`'teki hardcoded taxonomy eşlemesi (`APPROACH_METHODS`) gerçek DB ID'leriyle uyuşmuyordu — sessizce yanlış approach_method kaydediyordu. Detay için yukarıdaki changelog'a bakın. Bu tür hardcoded eşlemelerin kalıcı çözümü backend'de gerçek bir taxonomy list endpoint'i (`GET /accounts/services/`, `/universities/` vb.) eklemek olurdu — şu an böyle bir endpoint yok, bir sonraki oturum bunu değerlendirebilir.
11. **[8. turda bulundu]** `use-appointments.ts`'teki `clients` listesi (randevu oluşturma dropdown'ı) sadece geçmiş randevulardan türetiliyor, `GET /accounts/clients/`'a bağlı değil — hiç randevusu olmamış danışanlar seçilemiyor. Detay için yukarıdaki "🗒️ Ekip Notları" bölümüne bakın; gerçek çözüm backend'de bir "danışan atama" akışı gerektiriyor.

---
**Son Güncelleme**: 2026-08-19, 9. tur (`ToDo.md` içeriği doğrulanıp "🗒️ Ekip Notları" bölümüne taşındı ve dosya silindi — 3 madde stale çıktı (drift), gerçek durumla güncellendi; sadece dokümantasyon, kod değişikliği yok)
