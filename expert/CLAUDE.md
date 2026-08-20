# Expert Frontend (Uzman) - Claude Developer Guide

> Bu dosya `expert/src` kaynak kodu, `package.json`, ve projenin **kendi** `ToDo.md`/`CHANGELOG.md` dosyaları okunarak doğrulanmıştır. Önceki taslak dizin ağacının önemli bir kısmını (`pages/`, `types/`, `components/shared/` gibi klasörleri) icat etmişti — burada gerçek ağaç var. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `expert/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-20, 15. tur) — Notlar: Danışan Kotasının Roster'da/Panelde Gösterilmesi
> Kullanıcı, 14. turdaki saatlik mesaj sınırını (backend'de seans-bazlı kotaya çevrildi, bkz. `backend/claude.md` 15. tur) uzman tarafında danışanın kalan hakkı olarak göstermemizi istedi — "uzmanın herhangi bir mesaj sınırı yoktur", sadece bilgilendirme.
> - **API yanıt şekli değişti (breaking)**: backend artık GET'te düz bir mesaj listesi yerine `{"messages": [...], "client_quota": {...}}`, roster'da (`GET /conversations/`) her satıra `client_quota` ekliyor (bkz. `backend/claude.md` 15. tur) — `features/messages/types.ts`'e `ClientQuota`/`MessagesResponse` eklendi, `ConversationSummary.client_quota` alanı eklendi; `api.ts` → `getMessages()`'in dönüş tipi `MessagesResponse` oldu, `sendMessage()`'ın dönüş tipi `MessageItem & { client_quota: ClientQuota }` oldu (POST yanıtı da kotayı taşıyor).
> - **`features/messages/index.tsx`**: roster tablosundaki her danışan adının yanına `(kalan/limit)` parantezi eklendi (`text-destructive` ile 0 iken kırmızı — bu proje genelinde zaten kullanılan bir shadcn utility class'ı). Seçili danışanın not paneli başlığının altına da aynı bilgi tam cümle olarak tekrarlanıyor: "...Danışanın kalan not hakkı: X/5. Sizin bir mesaj sınırınız yoktur." Uzmanın kendi `Textarea`/gönder butonunda HİÇBİR disable/kırmızı-border mantığı yok (kullanıcı talebi gereği bilinçli olarak eklenmedi — bu sadece client tarafına özgü, bkz. `client/claude.md` 16. tur).
> - **localStorage taslak koruması**: `lunova_message_draft_expert_${clientId}` anahtarıyla, seçili danışan değiştiğinde otomatik kaydedilip/geri yükleniyor — bir danışana yazılmış ama gönderilmemiş not, başka bir danışana geçilse veya sayfa kapatılsa da kaybolmuyor (client tarafındaki aynı mantığın uzman tarafındaki karşılığı, farklı olarak burada tek bir anahtar değil danışan başına ayrı anahtar kullanılıyor çünkü uzmanın birden çok konuşması var).
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz (dist temizlendi). Backend tarafı (kota hesaplama, roster'ın doğru `client_quota` döndürmesi) `APIRequestFactory` ile doğrulandı (bkz. backend/claude.md). **`expert`'in kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda roster'daki parantez sayısının bir danışan mesaj gönderdikçe azaldığının, panel değiştirince taslağın korunduğunun manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 14. tur) — Yeni Özellik: Notlar (Uzman-Danışan Not/Mesaj Sistemi)
> Kullanıcı, eşleşen her uzman-danışan çifti için klasik canlı chat DEĞİL, kompakt bir not bırakma sistemi istedi (backend detayı: `backend/claude.md`'nin 14. tur girdisi). Kod taraması `expert/`'te mesajlaşmayla ilgili hiçbir kalıntı (gerçek ya da şablon) olmadığını doğruladı — sıfırdan inşa edildi, `features/client-forms/` (danışan seçici + detay paneli) ve `components/notification-dropdown.tsx` (polling deseni) en yakın referanslar oldu.
> - **Yeni `features/messages/` klasörü**: `types.ts` (`ConversationSummary`, `MessageItem`), `api.ts` (`getConversations()`, `getMessages(clientUserId)`, `sendMessage(clientUserId, body)`), `index.tsx` → `Messages` bileşeni — sol tarafta danışan roster tablosu (`GET /api/v1/messaging/conversations/`'tan; danışan adı + son not önizlemesi + okunmamış rozeti), sağda seçilen danışanla olan not akışı (mesaj balonları + `Textarea` + karakter sayacı + gönder butonu). `client-forms`'un aksine detay bir Dialog DEĞİL, satır içi bir panel — yazma etkileşimi modal'a göre daha uzun ömürlü olduğu için bilinçli tercih.
> - **Yeni route `routes/_authenticated/messages.tsx`**: `reservations.tsx`'teki `appointmentId` deep-link deseniyle birebir, `validateSearch({ clientId: z.coerce.number().optional() })` — bildirim dropdown'ından bir 'message' bildirimine tıklanınca ilgili danışanla olan not akışının otomatik açılabilmesi için.
> - **`components/layout/data/sidebar-data.ts`**: "Genel" grubuna "Notlar" (`MessageSquareText`, `/messages`) eklendi — `client-forms`'un zaten kullandığı `ClipboardList`'ten görsel olarak ayrışsın diye farklı ikon seçildi.
> - **Bildirim entegrasyonu (kullanıcı onayıyla)**: `features/notifications/api.ts`'teki `NotificationType`'a `'message'` + `NotificationItem`'a `related_user_id` eklendi (backend'in yeni alanıyla birebir). `components/notification-dropdown.tsx`'in click handler'ı artık `notification_type === 'message'` ise `navigate({ to: '/messages', search: { clientId: notification.related_user_id } })` yapıyor — yukarıdaki `clientId` search param'ı burada devreye giriyor.
> - **Doğrulama**: `npx vite build` (route dosyasının `routeTree.gen.ts`'e doğru eklendiği, `messages-*.js` chunk'ının oluştuğu görüldü) + `npx tsc -b` temiz (dist temizlendi). Backend tarafı (permission/throttle/karakter limiti/bildirim üretimi) `APIRequestFactory` ile gerçek verilerle doğrulandı (bkz. backend/claude.md). **`expert`'in kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda uzman olarak giriş yapıp bir danışana not gönderme, roster'da son not/okunmamış rozetinin doğru göründüğü ve bir bildirime tıklayınca doğru danışanla olan akışın açıldığının manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 13. tur) — Danışan Formları: Dropdown Yerine Matris Görünümü + 🔴 Kritik Backend Bug Düzeltmesi
> Kullanıcı, "Danışan Formları" ekranındaki dropdown-ile-seç akışını, satırların danışan, sütunların form olduğu, dolu/boş hücrelerin ✓/✗ ile işaretlendiği bir matris tabloya çevirmeyi istedi — satıra tıklayınca o danışanın (var olan) form cevapları tablosu, ordan da (var olan) risk/skor detay dialog'u açılmaya devam ediyor.
> - **`features/client-forms/api.ts`**: yeni `getForms()` (`GET /api/v1/forms/` — expert de dahil her authenticated kullanıcı çağırabiliyor, `is_staff` olmayanlar için `is_active=True` filtreli döner) — matrisin sütun başlıkları için.
> - **`features/client-forms/index.tsx` yeniden tasarlandı**: `<Select>` dropdown'ı kaldırıldı, yerine mount'ta `getMyClients()` + `getForms()` + HER danışan için paralel `getClientFormResponses()` (`Promise.allSettled`) çekilip `Map<clientUserId, FormResponseSummary[]>` olarak tutuluyor — bu TEK veri kümesi hem matrisin ✓/✗ hücrelerini hem (bir satıra tıklanınca) var olan "Form Cevapları" tablosunu besliyor, satıra tıklayınca İKİNCİ bir istek atılmıyor. Form başlıkları uzun olabildiği için sütun başlıkları `max-w-[140px] truncate` + native `title` tooltip'i ile "kısa" gösteriliyor (backend'de bir "kısa ad" alanı olmadığı için içerik kırpma yaklaşımı tercih edildi, veri uydurulmadı).
> - **🔴 Bu turda kritik, önceden fark edilmemiş bir backend bug'ı bulundu ve düzeltildi**: matris gerçek veriyle doğrulanırken, gerçekten atanmış bir danışan için beklenmedik bir `403` alındı — `forms/views.py`'deki `client_id` çözümleme mantığı `ClientProfile.id` ile `User.id`'yi karıştırıp yanlış danışan profiline eşleşiyordu (tam detay: `backend/claude.md`'nin 13. tur girdisi). En kötü ihtimalde bu, bir danışanın klinik verisinin BAŞKA bir danışan adı altında gösterilmesine yol açabilirdi. Düzeltme backend'de yapıldı, expert tarafında kod değişikliği gerekmedi — ama bu matris özelliği N (danışan sayısı) kadar çağrı yaptığı için bug'ı ilk defa gözle görülür kılan da bu oldu (önceki dropdown akışı sadece TEK danışan için çağırdığı için çakışma ihtimali çok daha düşüktü).
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz (dist temizlendi). Backend düzeltmesi Django shell + `APIRequestFactory` ile gerçek verilerle doğrulandı (7 gerçek danışan için matris verisi başarıyla çekildi, hepsi 200). **`expert`'in kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda matrisin gerçekten doğru render olduğunun, bir satıra tıklayınca form cevapları tablosunun ve oradan detay dialog'unun açıldığının manuel doğrulanması öneriliyor.

> ## 📜 Daha Eski Turlar (2026-08-20, 12. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor (global bildirim sistemi eklendi [12. tur], yeni "Danışan Formları" özelliği [11. tur], randevu onaylama çift-modal bug'ı + program takviminde durum renklendirmesi [8. tur], Lunova logosu + şablon/Clerk temizliği + üçüncü parti giriş kaldırıldı [7. tur], CSRF token desteği [5. tur], access token refresh [3. tur], profil düzenleme + taxonomy ID düzeltmesi [devam turu], `useAuthStore().user.id` eksikliği + randevu zinciri [initial turu]). **Not (11. turda yeniden doğrulandı, eski iddia YANLIŞ çıktı)**: "devam"/"Randevu Zinciri" turlarındaki "`ClientProfile.expert` hiçbir yerde otomatik set edilmiyor, `GET /accounts/clients/` boş döner" notu Django shell'de gerçek DB sorgulanarak yeniden kontrol edildi — **artık (belki hiç) doğru değil**: 80 danışandan 62'sinin gerçekten atanmış bir uzmanı var. Tam ayrıntı `git log -p -- expert/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 12. tur — Yeni Özellik: Global Bildirim Sistemi
> - 2026-08-19, 11. tur — Yeni Özellik: Danışan Formları
> - 2026-08-19, 8. tur — Randevu Onaylama Çift-Modal Bug'ı, Program Takviminde Durum Renklendirmesi
> - 2026-08-19, 7. tur — Lunova Logosu, Şablon/Clerk Temizliği, Üçüncü Parti Giriş Kaldırıldı
> - 2026-08-17, 5. tur — CSRF Token Desteği
> - 2026-08-17, 3. tur — Access Token Refresh
> - 2026-08-17, devam — Profil Düzenleme + Yerel Ortam
> - 2026-08-17 — Randevu Zinciri
>
> </details>

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
├── components/    → ui/, layout/, data-table/ + kök seviyede tekil dosyalar
│                    (profile-dropdown.tsx, search.tsx, theme-switch.tsx, sign-out-dialog.tsx,
│                     notification-dropdown.tsx [12. tur, YENİ] — hepsi header'larda tekrar
│                     kullanılan tekil bileşenler, alt klasörlere ayrılmamış)
├── config/        → SADECE fonts.ts  ("constants.ts"/"navigation.ts" YOK)
├── context/       → direction-provider, font-provider, layout-provider, search-provider, theme-provider (5 dosya)
├── features/      → auth, availability, client-forms, dashboard, errors, legal, messages
│                    (14. tur, YENİ - not/mesaj sistemi, klasik chat DEĞİL), notifications
│                    (12. tur, YENİ - sadece api.ts, UI'sı components/notification-dropdown.tsx'te),
│                    profile, reservations, settings
│                    ("appointments" ve "clients" klasörleri YOK — randevu mantığı
│                     "reservations"/"dashboard" altında yaşıyor, danışan-form mantığı
│                     11. turda YENİ eklenen "client-forms" altında; "apps"/"chats"/
│                     "tasks"/"users" YOK — 7. turda silindi, hiç linklenmeyen şablon
│                     demo sayfalarıydı (DİKKAT: "chats" burada şablon demo'ydu, 14. turdaki
│                     yeni "messages" feature'ıyla İSİM/KAPSAM olarak ilgisiz); "settings" artık
│                     sadece "appearance"+"components" içeriyor; "legal" 7. turda, içeriksiz /terms+/privacy)
│                    API çağrıları burada, her feature'ın kendi api.ts'inde
│                    (örn. features/reservations/api.ts, features/client-forms/api.ts)
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
12. ✅ **[DÜZELTİLDİ — 2026-08-20, 13. tur, 🔴 KRİTİK ama backend'de]** ~~`features/client-forms/` sayfası bir danışan seçildiğinde bazen yanlışlıkla "Bu danışana erişim yetkiniz yok" hatası alıyordu~~ — kök neden expert kodunda değil, backend'in `client_id` çözümleme mantığındaydı (`ClientProfile.id`/`User.id` karışıklığı, bkz. `backend/claude.md` 13. tur) — expert tarafında kod değişikliği gerekmedi, backend düzeltildi.
13. **[14. turda eklendi, 15. turda genişledi]** `features/messages/` sayfası hiç tarayıcıda açılmadı — roster'ın (son not/okunmamış rozeti + danışanın kalan not hakkı parantezi), mesaj balonlarının, panel başlığındaki kota cümlesinin ve danışan değiştirince taslağın korunduğunun manuel doğrulanması öneriliyor.

---
**Son Güncelleme**: 2026-08-20, 15. tur ("Notlar"da danışanın seans-bazlı mesaj kotası uzman tarafında gösterilir hale getirildi — roster'daki her danışan adının yanına `(kalan/limit)` parantezi + seçili danışanın panel başlığında tam cümle, backend'in `client_quota` alanı taşıyan yeni yanıt şekline uyum (breaking API değişikliği), `lunova_message_draft_expert_${clientId}` ile danışan-bazlı localStorage taslak koruması. Uzmanın kendi gönderiminde hiçbir sınır/disable yok (bilinçli, sadece bilgilendirme). `tsc -b`/`vite build` temiz, backend tarafı `APIRequestFactory` ile ayrıca doğrulandı (bkz. backend/claude.md); gerçek tarayıcı testi bekliyor)
