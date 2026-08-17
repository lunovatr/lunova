# Expert Frontend (Uzman) - Claude Developer Guide

> Bu dosya `expert/src` kaynak kodu, `package.json`, ve projenin **kendi** `ToDo.md`/`CHANGELOG.md` dosyaları okunarak doğrulanmıştır. Önceki taslak dizin ağacının önemli bir kısmını (`pages/`, `types/`, `components/shared/` gibi klasörleri) icat etmişti — burada gerçek ağaç var. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın.

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

`package.json`'daki gerçek isim `"shadcn-admin"` v2.1.0 — proje [shadcn-admin](https://github.com/satnaing/shadcn-admin) açık kaynak şablonu üzerine kurulu. `expert/README.md` hâlâ şablonun orijinal README'si (satnaing'in kendi bio'su, sponsorluk linkleri, `pnpm install` talimatları) — Lunova'dan, uzman/danışan domain'inden, gerçek auth mimarisinden bahsetmiyor. `client/`'daki TailAdmin README sorunuyla birebir aynı durum.

Ayrıca `package.json`'da **`@clerk/clerk-react`** bağımlılığı ve `src/routes/clerk/` klasörü var — Clerk, şablonun demo/örnek auth sağlayıcısı. Projenin gerçek auth'u kendi JWT/cookie sistemi (`CHANGELOG.md`: "backend auth entegrasyonu" yeni eklenen bir özellik olarak not düşülmüş) — Clerk'in hâlâ kullanılıp kullanılmadığı, yoksa şablondan kalma ölü kod mu olduğu netleştirilmeli.

## 🏗️ Gerçek Dosya Yapısı (`src/` altı, doğrulanmış — önceki taslaktan önemli farklarla)

```
expert/src/
├── main.tsx, routeTree.gen.ts (auto-generated), vite-env.d.ts
├── assets/
├── components/    → SADECE ui/, layout/, data-table/  ("components/shared" YOK)
├── config/        → SADECE fonts.ts  ("constants.ts"/"navigation.ts" YOK)
├── context/       → direction-provider, font-provider, layout-provider, search-provider, theme-provider (5 dosya)
├── features/      → apps, auth, availability, chats, dashboard, errors, profile,
│                    reservations, settings, tasks, users
│                    ("appointments" ve "clients" klasörleri YOK — randevu/danışan
│                     mantığı "reservations" ve "dashboard" altında yaşıyor)
│                    API çağrıları burada, her feature'ın kendi api.ts'inde
│                    (örn. features/reservations/api.ts, features/profile/api.ts)
├── hooks/         → use-auth-guard.ts, use-dialog-state.tsx, use-mobile.tsx, use-table-url-state.ts
├── lib/           → api.ts, api-setup.ts, handle-server-error.ts, utils.ts
├── routes/        → (auth)/, (errors)/, _authenticated/, clerk/, __root.tsx  (TanStack Router file-based)
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
Dokümante edilmemiş ama gerçekte kullanılan önemli paketler: `@clerk/clerk-react`, `@schedule-x/*` (takvim), `@tanstack/react-table`, `recharts`, `date-fns`, `temporal-polyfill`.

## 🧪 Testing

Test dosyası yok, `vitest`/`jest`/`testing-library` bağımlılıklarda yok.

## 🗒️ Gerçek Ekip Notları — `ToDo.md` ve `CHANGELOG.md` (AI tahmini değil, ekibin kendi notları)

Bu iki dosya, herhangi bir AI raporundan daha güvenilir çünkü doğrudan geliştiricinin kendi güncel notları. Öne çıkanlar:

- 🐞 **Bilinen gerçek bug**: Randevu **reddetme (reject)** işlemi backend'den **403 Forbidden** dönüyor — frontend tarafı çalışır durumda not edilmiş, sorun backend permission/serializer tarafında aranmalı.
- 🐞 **Bilinen gerçek eksik**: `features/dashboard/api.ts` hâlâ hardcoded `localhost` kullanıyor — production build'e bu haliyle çıkarsa kırılır.
- 📝 Randevu oluşturma ekranında danışan seçimi şu an **manuel ID girişi** ile yapılıyor (isimle arama yok), backend'de isimle arama desteklendiğinde değiştirilecek.
- 📝 **CHANGELOG.md açıkça planlıyor**: Zustand'dan Redux'a geçiş, "ekip ve state karmaşıklığı büyüdüğünde" yapılacak — yani mevcut Zustand kullanımı ekip tarafından geçici/ilk-aşama olarak görülüyor, gelecekteki bir agentic çalışmada bu migrasyon gündeme gelebilir.
- ✅ Daha önce bir token-birikmesi hatası (eski token'lar temizlenmeden isteklere binmesi) düzeltilmiş — geçmişte token yönetiminde gerçek sorunlar yaşanmış, bu alan hassas.

**Öneri**: Bu iki dosyayı (`ToDo.md`, `CHANGELOG.md`) güncel tutmaya devam edin — bir sonraki agentic çalışmada gerçek zemin bilgisini AI tahmininden çok daha güvenilir şekilde sağlıyorlar.

## ⚠️ Gerçek Eksikler (doğrulanmış)

1. **`handle-server-error.ts` yanlış anahtar okuyor** (`title` yerine `detail`/`error` olmalı) → hâlâ doğru bir bug ama **[2026-08-17'de önceliği düşürüldü]**: bu fonksiyon şu an hiçbir yerde tetiklenmiyor (proje genelinde `useMutation`/`useQuery` kullanılmıyor). Profil formu gibi gerçek özellikler kendi yerel hata yönetimini kullanıyor. Kolay düzeltilebilir ama şu an aktif kullanıcı etkisi yok — birisi bir `useMutation` eklerse öncelik yükselir.
2. **[DÜZELTİLDİ — 2026-08-17]** ~~Token refresh yok~~ — backend'e `POST /accounts/token/refresh/` eklendi, `api-setup.ts`'teki interceptor artık 401'de bunu otomatik deniyor. Sistemin yeni en kritik sorunu artık CSRF koruması eksikliği — bkz. kök [claude.md](../claude.md).
3. **İki katmanlı hata yönetimi mimarisi tanımlı ama pratikte tek katman aktif** (axios interceptor çalışıyor; React Query onError katmanı ölü kod, yukarıya bakın) — birleştirme/temizlik hâlâ düşünülebilir, ama "tutarsızlık riski" iddiası abartılıydı çünkü ikinci katman zaten hiç çalışmıyor.
4. **README.md proje ile alakasız** (şablon README'si).
5. **i18n yok**, tüm metinler hardcoded Türkçe — gerçek, kontrol edildi (i18n kütüphanesi `package.json`'da yok).
6. **Kullanılmayan/belirsiz `@clerk/clerk-react` bağımlılığı** — kaldırılmalı ya da amacı netleştirilmeli.
7. **Bilinen backend entegrasyon bug'ı** (randevu reddetme 403) ve **hardcoded localhost** (`dashboard/api.ts`) — bunlar tahmin değil, ekibin kendi ToDo.md'sinde yazan gerçek, doğrulanmış sorunlar.
8. **[2026-08-17'de bulundu, düzeltildi]** `features/profile/maps.ts`'teki hardcoded taxonomy eşlemesi (`APPROACH_METHODS`) gerçek DB ID'leriyle uyuşmuyordu — sessizce yanlış approach_method kaydediyordu. Detay için yukarıdaki changelog'a bakın. Bu tür hardcoded eşlemelerin kalıcı çözümü backend'de gerçek bir taxonomy list endpoint'i (`GET /accounts/services/`, `/universities/` vb.) eklemek olurdu — şu an böyle bir endpoint yok, bir sonraki oturum bunu değerlendirebilir.

---
**Son Güncelleme**: 2026-08-17, 5. tur (`lib/api.ts`'e CSRF token desteği eklendi; `tsc` temiz, backend curl ile doğrulandı, tarayıcı testi bekliyor)
