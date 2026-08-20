# Client Frontend (Danışan) - Claude Developer Guide

> Bu dosya `client/src` kaynak kodu ve `package.json` doğrudan okunarak doğrulanmıştır. Önceki taslak; Redux thunk isimlerini, paket versiyonlarını ve `.env` dosyalarının varlığını yanlış tahmin etmişti — burada düzeltildi. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `client/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-20, 14. tur) — Yeni Özellik: Global Bildirim Sistemi
> Kullanıcı, aktif olarak görülebilecek, yaklaşan (2-3 gün içindeki) randevuları listeleyen, tıklanınca randevu detayına yönlendiren, okundu işaretlenen, 20 gün sonra otomatik temizlenen bir bildirim sistemi istedi. Backend'de sıfırdan bir `notifications/` app eklendi (detay: `backend/claude.md`'nin 12. tur girdisi) — bu turda `client/` tarafı o API'ye bağlandı.
> - **`components/header/NotificationDropdown.tsx` tamamen yeniden yazıldı**: önceden (11. tur değil, en baştan beri — TailAdmin şablonundan kalma) 100% hardcoded/sahte veriyle çalışıyordu (8 tane "Terry Franci" tarzı sahte isim, gerçek API çağrısı hiç yoktu, "okundu" state'i sadece bell ikonundaki tek bir global noktaydı, item bazlı değildi). Artık `GET /api/v1/notifications/`'ı mount'ta + 60sn'de bir polling ile çekiyor, okunmamış sayısını bell ikonundaki noktada gösteriyor, her item'a tıklayınca `PATCH /api/v1/notifications/:id/read/` (optimistic local update + arka planda gerçek çağrı) + `appointment_id` varsa `/appointments/:id`'ye `navigate()`.
> - **Yeni `pages/Appointments/AppointmentDetail.tsx` + `/appointments/:id` route'u**: client'ta randevu detay SAYFASI daha önce hiç yoktu (`AppointmentsList.tsx` düz bir liste, satırlar tıklanamıyordu) — bildirimlerin yönlendireceği bir yer olmadığı için sıfırdan eklendi. `GET /api/v1/appointments/:id/` ile tek randevuyu çekiyor, `AppointmentsTable.tsx`'teki durum renkleri/etiketleri + Zoom katılma + iptal talebi/geri çekme aksiyonlarını (aynı `getZoomJoinBlockMessage` kontrolüyle) tek randevu bazında tekrarlıyor. `PageBreadCrumb`'ın 12. turda eklenen `items` desteğiyle "Home → Randevularım → Randevu Detayı" gösteriyor.
> - **`types/notification.types.ts`** (yeni) — backend `NotificationSerializer` şekliyle birebir.
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz (dist temizlendi). Backend tarafı (sync/idempotency/20-gün-temizlik/HTTP endpoint'leri) Django shell + `APIRequestFactory` ile gerçekten çalıştırılarak doğrulandı (bkz. backend/claude.md). **`client`'ın kendisi gerçek bir tarayıcıda tıklanarak test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok) — bir sonraki oturumda gerçek bir yaklaşan randevu oluşturup bell'de göründüğünün, tıklanınca hem okundu işaretlendiğinin hem doğru randevuya yönlendirdiğinin manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 13. tur) — Formlar: Gerçek Kök Neden Bulundu (12. Turun Teşhisi Yanlıştı)
> Kullanıcı 12. turdaki düzeltmeyi test etti, bug hâlâ oradaydı — daha spesifik bir tekrar üretme adımı verdi: "Genel Sağlık Değerlendirme Formu"nda SON soruyu (`single_choice`, "Düzenli egzersiz yapıyor musunuz?") cevaplayınca ÖNCEKİ 4 sorunun (`yes_no`) hepsi görsel olarak "Hayır" seçiliymiş gibi görünüyor, gönderimde de bunlar "cevaplanmamış" sayılıyor. **12. turda bu bug `multiple_choice` (checkbox) sorularında sanılmıştı — YANLIŞ teşhisti.** Gerçek kök neden farklı bir soru tipinde (`yes_no`/`single_choice`, radio) ve kod değil, VERİ katmanındaydı:
> - **Kök neden**: `backend/forms/views.py` → `FormDetailView.get()`, bir `yes_no` sorusunun DB'de hiç gerçek `QuestionOption` kaydı yoksa `id`'siz bir fallback döner (`[{"value":1,"text":"Evet"},{"value":0,"text":"Hayır"}]`, bkz. satır 61-65). Gerçek DB (`backend/db.sqlite3`) sorgulanınca **form id=3'ün 4 `yes_no` sorusunun (id 16-19) gerçekten SIFIR `QuestionOption` kaydına sahip olduğu** doğrulandı (aynı formun `single_choice` sorusu ve form id=1'in TÜM `yes_no` soruları normal, 2'şer seçeneğe sahip — yani bu izole, form-3'e özgü bir veri bütünlüğü sorunuydu, muhtemelen daha önceki bir test/deneme oturumunda seçenekler silinmiş). `FormFill.tsx`'teki radio render kodu `opt.id!` (non-null assertion) kullanıyordu; `opt.id` fallback'te TÜM seçenekler için `undefined` olduğundan, dokunulmamış bir soruda `answers[q.id]?.selected_option_ids?.[0] === opt.id` karşılaştırması **"Evet" VE "Hayır" için AYNI ANDA `true`** hesaplanıyordu. React bunu DOM'a yazınca native `<input type="radio" name="...">` grup davranışı (aynı `name`'e sahip birden fazla input `checked=true` olamaz) sessizce SON render edilen seçeneği ("Hayır") görsel olarak kazandırıyordu — kullanıcı hiç dokunmadığı halde tüm `yes_no` sorular "Hayır" gösteriyordu. React state'i (`answers[16..19]`) ise gerçekten hiç set edilmemişti (`onChange` hiç tetiklenmedi) — bu yüzden gönderim doğrulaması bunları doğru şekilde "cevaplanmamış" olarak işaretliyordu; kullanıcının gördüğü ekranla gerçek state arasındaki bu uyumsuzluk raporun ikinci kısmıydı.
> - **Ek, kritik gözlem**: bu veri eksikliği sadece görsel değil, işlevsel olarak da formu KIRIYORDU — `backend/forms/serializers.py` → `AnswerSubmitSerializer.validate()`, gönderilen `selected_option_ids`'in `question.options` (gerçek DB FK ilişkisi) içinde var olmasını zorunlu kılıyor; `question.options` boşsa gönderilebilecek HİÇBİR geçerli id yok. Yani veri düzeltilmeden, frontend'de ne yapılırsa yapılsın bu 4 soru asla submit edilemezdi.
> - **Düzeltme (iki katman)**:
>   1. **Veri**: eksik `QuestionOption` kayıtları ("Evet" `score_value=1.0` / "Hayır" `score_value=0.0`, form id=1'deki established convention'la birebir) Django ORM ile ID 16-19 için yeniden oluşturuldu (idempotent script, önce `q.options.exists()` kontrolü yapıldı) — artık `FormDetailView` bu 4 soru için de gerçek, benzersiz id'ler döndürüyor.
>   2. **Kod (savunma katmanı)**: `FormFill.tsx`'teki `yes_no`/`single_choice` radio render bloğu artık `opt.id!` yerine `const optionKey = opt.id ?? opt.value ?? idx` kullanıyor — `id` yoksa `value`'ya (fallback şeklinin garantili alanı), o da yoksa index'e düşüyor, bu sayede aynı soru içindeki seçenekler HİÇBİR ZAMAN aynı karşılaştırma değerine çakışmıyor. Bu, veri bütünlüğü tekrar bozulsa bile (örn. ileride başka bir `yes_no` sorusunun seçenekleri silinirse) UI'ın sessizce yanlış seçenek göstermesini engelleyen ayrı bir katman — ama gönderim yine de backend'in `Invalid option id` hatasıyla düzgün başarısız olur (veri düzeltilmeden gerçek submit mümkün değil, bu backend tasarımının doğal sonucu).
>   3. 12. turdaki `multiple_choice`/breadcrumb/gönderim-modalleri değişiklikleri geri alınmadı (zararsızlar, hâlâ iyi pratikler) ama **12. turun "kök neden izole edilemedi" notu bu turda çözüldü — asıl bug orada değil, burada bulundu.**
> - **Doğrulama — gerçekten çalıştırılarak yapıldı**: Django ORM ile DB'de gerçek satır sayıları sorgulandı (form 1/2/3'ün tüm soruları için seçenek sayısı); `APIRequestFactory` ile gerçek `FormDetailView` çağrılıp id 16-19'un artık gerçek `id` döndürdüğü doğrulandı; ardından gerçek bir `FormSubmitView.post()` çağrısı yapılıp (5 soru, gerçek seçenek id'leriyle) `201` + doğru `total_score=3.0` alındığı doğrulandı, test amaçlı oluşturulan `FormResponse` sonra silindi. `tsc --noEmit` + `vite build` temiz. **Gerçek tarayıcıda tıklanarak hâlâ test edilmedi** — ama bu kez hem veri hem kod tarafı gerçek bir HTTP/ORM çağrısıyla doğrulandığı için önceki turdan çok daha yüksek güven var.

> ## 🔧 Son Değişiklikler (2026-08-20, 12. tur) — Formlar: Çoklu Seçim Bug'ı + Breadcrumb + Gönderim Onay/Doğrulama Modalleri
> Kullanıcı 11. turda eklenen "Formlar" sekmesini ilk kez gerçek tarayıcıda denedi ve 4 madde bildirdi. Kapsam sadece `client/`.
> - **Bildirilen bug: `pages/Forms/FormFill.tsx` çoklu seçim (checkbox) sorularında son seçeneği işaretleyince önceki seçimler kayboluyordu.** Kod satır satır incelendi — mevcut `checked ? selected.filter(...) : [...selected, opt.id!]` mantığı, backend'in `QuestionOptionSerializer`'ının her seçeneğe gerçekten benzersiz bir `id` verdiği de doğrulanarak (bkz. `backend/forms/views.py:38-90` `FormDetailView`) statik okumayla açıkça YANLIŞ bulunamadı — yani bu turda **kök neden kesin olarak izole edilemedi**. Yine de toggle mantığı, render sırasında yakalanmış (`selected` değişkeni gibi) olası bayat bir kapanışa (stale closure) bağımlı olmayacak şekilde, TAMAMEN fonksiyonel `setAnswers((prev) => ...)` güncellemesine taşındı (yeni `toggleOption()` helper'ı) — bu, bu semptom sınıfındaki (yeni seçim eskilerini eziyor) TÜM olası closure/sıralama kaynaklı hataları yapısal olarak eler. Ayrıca `id` (form) route param'ı değiştiğinde `answers` state'i artık açıkça `setAnswers({})` ile sıfırlanıyor — `FormFill` bileşeni yeniden mount olmadan (aynı route pattern, farklı `:id`) başka bir forma geçilirse önceki formun cevaplarının yeni forma sızmasını önleyen ayrı, gerçek bir savunma katmanı.
> - **"Checkbox'lar başlangıçta hiçbiri seçili olmamalı" gereksinimi**: kod okumasıyla zaten `answers` başlangıç state'i `{}` olduğu için tüm checkbox'lar ilk render'da `false` gösteriyordu; yukarıdaki `answers({})` reset'i bunu forma yeniden girişte de garanti altına alıyor.
> - **`components/common/PageBreadCrumb.tsx`**: opsiyonel `items?: {label, to}[]` prop'u eklendi — Home ile aktif sayfa arasına tıklanabilir ara basamaklar ekliyor, geriye dönük uyumlu (mevcut 4 kullanım yeri `items` vermeden değişmeden çalışıyor, `tsc` ile doğrulandı). `FormFill.tsx`/`FormResponseDetail.tsx` artık `items={[{label:"Formlar", to:"/forms"}]}` geçiyor → breadcrumb "Home → Formlar → [Form Adı]" gösteriyor, "Formlar" linkine tıklayınca `/forms`'a dönülüyor.
> - **Gönderim akışı yeniden tasarlandı**: "Formu Gönder" butonu artık DOĞRUDAN submit etmiyor. Önce formdaki **TÜM** soruların (sadece backend'in `is_required` işaretlediklerinin değil — kullanıcı talebiyle bilinçli bir client-side sıkılaştırma) yanıtlanıp yanıtlanmadığı kontrol ediliyor (`isAnswered()`); eksik varsa "Eksik sorular var" modalı açılıp hangi soruların eksik olduğu bir liste halinde gösteriliyor, API'ye hiç istek atılmıyor. Hepsi doluysa "Formunuzu göndereceksiniz, emin misiniz?" onay modalı açılıyor; "Evet, Gönder" gerçek `POST /api/v1/forms/submit/` çağrısını tetikliyor. Backend'in `FormSubmitSerializer.validate()`'i hâlâ sadece `is_required=True` soruları zorunlu tutuyor (bkz. `backend/claude.md`) — davranış farkı bilinçli, sadece client UX katmanında.
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz (dist temizlendi). **Gerçek tarayıcıda tıklanarak test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok) — bir sonraki oturumda özellikle çoklu seçim toggle'ının artık gerçekten doğru çalıştığının manuel doğrulanması öneriliyor, çünkü bu turun asıl motivasyonu olan orijinal bug statik analizle kesin olarak yeniden üretilip kök nedeni ispatlanamadı; uygulanan düzeltme "doğru React deseni + savunma katmanı" mantığıyla yapıldı.

> ## 📜 Daha Eski Turlar (2026-08-19, 11. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor ("Formlar" sekmesi eklendi [11. tur], ana sayfa scroll bug'ı + Zoom 15dk kısıtı + takvim rengi lejantı [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + `/terms`+`/privacy` altyapısı [7. tur], toast z-index bug'ı [6. tur], CSRF token desteği [5. tur], ExpertAvailability navigate no-op [4. tur], access token refresh [3. tur], profil düzenleme + ErrorBoundary [devam turu], randevu tip düzeltmesi + iptal aksiyonları [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-19, 11. tur — Yeni Özellik: Formlar Sekmesi
>
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
├── pages/        → Appointments, AuthPages, Dashboard, Forms, Legal, OtherPage, UserProfiles
│                   ("Blank"/"Calendar"/"Charts"/"Tables"/"UiElements" YOK —
│                    7. turda TailAdmin şablon leftover'ı olarak silindi; "Legal" 7. turda,
│                    içeriksiz /terms+/privacy altyapısı; "Forms" 11. turda YENİ EKLENDİ —
│                    DİKKAT: eski, silinmiş TailAdmin "Forms" şablon sayfasıyla (jenerik
│                    UI-kit demo'suydu) İSİM ÇAKIŞIYOR ama tamamen farklı/gerçek bir özellik,
│                    klinik form doldurma/görüntüleme - bkz. 11. tur changelog;
│                    Appointments/AppointmentDetail.tsx 14. turda YENİ - önceden randevu
│                    detay SAYFASI hiç yoktu, bildirim sisteminin yönlendirme hedefi olarak eklendi)
├── store/        → authReducer.ts (KULLANILMIYOR — bkz. aşağı), authSlice.ts, hooks.ts, index.ts
└── types/        → appointment.ts, auth.ts, forms.types.ts (11. tur, YENİ), notification.types.ts
                    (14. tur, YENİ), profile.payload.ts, profile.types.ts
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

---
**Son Güncelleme**: 2026-08-20, 14. tur (Yeni global bildirim sistemi — `NotificationDropdown.tsx` önceden 100% sahte TailAdmin şablon taslağıydı, artık `GET/PATCH /api/v1/notifications/`'a bağlı gerçek bir bell dropdown'ı; yeni `pages/Appointments/AppointmentDetail.tsx` + `/appointments/:id` route'u (önceden hiç yoktu) bildirimlerin yönlendirdiği hedef; backend Django shell/APIRequestFactory ile doğrulandı, `tsc`/`vite build` temiz, gerçek tarayıcı testi hâlâ bekliyor)
