# Client Frontend (Danışan) - Claude Developer Guide

> Bu dosya `client/src` kaynak kodu ve `package.json` doğrudan okunarak doğrulanmıştır. Önceki taslak; Redux thunk isimlerini, paket versiyonlarını ve `.env` dosyalarının varlığını yanlış tahmin etmişti — burada düzeltildi. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `client/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-19, 8. tur) — Ana Sayfa Scroll Bug'ı, Zoom 15dk Kısıtı, Takvim Rengi Lejantı
> Kullanıcının bildirdiği somut bir bug + bir yeni özellik. Tam detay için kök [claude.md](../claude.md)'nin 8. tur girdisine bakın.
> - **`components/common/GlobalSpinner.tsx`**: ilk login sonrası ana sayfada scroll çalışmıyordu. Kök neden: `document.body.style.overflow = 'hidden'` mount-only bir effect'te set ediliyor, sadece unmount cleanup'ında resetleniyordu — ama bu component `App.tsx`'te kalıcı mount'lu (hiç unmount olmuyor). Effect artık `[loading]`'e bağımlı; loading `false` olur olmaz overflow anında `'unset'`e dönüyor.
> - **Yeni `utils/zoomAccess.ts`** → `getZoomJoinBlockMessage(date, time)`: randevu saatinden 15 dk'dan erken çağrılırsa uyarı metni, aksi halde `null` döner. `components/tables/Appointments/AppointmentsTable.tsx` (yeni `onZoomBlocked` prop) ve `components/dashboard/UpcomingAppointmentsCard.tsx` (kendi toast instance'ı) Zoom butonlarının `onClick`'ine bu kontrolü ekledi — erken tıklamada `window.open` hiç çağrılmıyor.
> - **`components/dashboard/MiniCalendarCard.tsx`**: küçük bir renk lejantı eklendi (zaten `cancelled` hariç her durumu renkli gösteriyordu, sadece hangi rengin ne anlama geldiği belli değildi).
> - **[Bu sohbette ayrıca yanıtlandı, kod değişmedi]** "Zoom linkine tıklayınca 404" sorusu — kök neden backend'de (`appointments/views.py`, dev modda mock `"mock url"` string'i), detay kök claude.md'de.
> - **Doğrulama**: `npx tsc --noEmit` + `npx vite build` temiz. Gerçek tarayıcıda tıklanarak test edilmedi (araç yok) — özellikle "login sonrası ana sayfa scroll" ve "Zoom butonuna erken tıklayınca toast çıkıp link açılmıyor, 15 dk kala normal açılıyor" akışlarının manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-19, 7. tur) — Mobil Bug'lar, Şablon Temizliği, Ana Sayfa Yeniden Yapıldı
> Geniş bir UI turu — tam detay için kök [claude.md](../claude.md)'nin 7. tur girdisine bakın. Burada sadece `client`'a özgü teknik özet.
> - **Mobil header logosu taşıyordu** (`layout/AppHeader.tsx:86-97`): `lg:hidden` bloğundaki `<img>`'lerde hiç boyut kısıtı yoktu → 1500×500px'lik logo mobilde ham boyutuyla basılıp ekranın ~4 katı genişlikte taşıyordu. `width`/`height={120×32}` + `h-8 w-auto` eklendi. Ayrıca `src="./images/..."` (relative, `/appointments/request` gibi 2+ segmentli route'larda URL çözümleme kurallarına göre kırılıyordu) → `/images/...` (absolute, `AppSidebar.tsx` zaten böyle kullanıyordu) düzeltildi.
> - **Mobil sidebar bir linke tıklayınca kapanmıyordu** (`layout/AppSidebar.tsx`): nav `Link`lerinde `onClick` yoktu. `closeMobileSidebar` helper'ı eklenip iki `Link`e de (`nav.path` ve `subItem.path`) bağlandı (`isMobileOpen` ise `toggleMobileSidebar()`, masaüstünde etkisiz).
> - `context/SidebarContext.tsx`: `isMobile` eşiği `768px`→`1024px` (Header/Sidebar'ın kendi `lg` kullanımıyla tutarlı hale getirildi — önceden 768-1024 arası tutarsız davranıyordu).
> - **`pages/Dashboard/Home.tsx` tamamen yeniden yazıldı**: eski TailAdmin e-ticaret dashboard'u (sahte metrikler, "ürün" olarak giydirilmiş randevu tablosu, dünya haritası demografi widget'ı) kaldırıldı. Yeni `components/dashboard/{WelcomeCard,UpcomingAppointmentsCard,MiniCalendarCard}.tsx` — `GET /api/v1/appointments/`'tan tek bir fetch (`AppointmentsList.tsx` ile aynı parametreler), karşılama+hızlı linkler, en yakın 3 randevu (durum rozeti + Zoom butonu), ve zaten bağımlılıklarda hazır olan FullCalendar (`@fullcalendar/react`+`daygrid`, TR locale) ile kompakt aylık takvim. Eski `components/ecommerce/*` (6 dosya) öksüz kaldığı için silindi.
> - **Şablon/marka temizliği**: `layout/SidebarWidget.tsx`'teki canlı "tailadmin.com/pricing" upsell kutusu kaldırıldı (basit "© Lunova" notu kondu); `index.html` favicon mime type düzeltildi (`image/svg+xml`→`image/png`, dosya zaten `.png`'ydi) + eksik `<title>` eklendi; `pages/OtherPage/NotFound.tsx` ve 4 auth sayfasının `PageMeta` başlıkları "TailAdmin" → Lunova/Türkçe; `alt="Logo"` → `alt="Lunova"` (AppSidebar, AuthPageLayout). `package.json` `name`: `tailadmin-react` → `lunova-client`.
> - **Silindi (doğrulanmış, kullanılmayan)**: `components/header/Header.tsx` (hiçbir yerden import edilmiyordu, içinde `formbold.com`'a giden bir form + gömülü YouTube videoları vardı); `public/images/logo/{logo.svg,logo-dark.svg,auth-logo.svg}` (TailAdmin'in kendi jenerik placeholder logosu, kod tarafından hiç kullanılmıyordu — gerçek Lunova logosu `logo-black-red.png`/`logo.png`'ye dokunulmadı); `App.tsx`'te zaten yorum satırıyla devre dışı olan `pages/{Blank,Calendar}.tsx` + `pages/{Charts,Forms,Tables,UiElements}/` ve SADECE onlara özel bileşenler (`components/charts/{bar,line}/`, `components/ui/{videos,images}/`, `components/form/form-elements/`, `components/tables/BasicTables/`) — artık sadece gizli değil, dosyalar da yok. `App.tsx`/`AppSidebar.tsx`'teki bu dosyalara işaret eden ölü yorum satırları temizlendi.
> - **`/terms` ve `/privacy` altyapısı eklendi (İÇERİKSİZ)**: `pages/Legal/{TermsOfService,PrivacyPolicy}.tsx` (yeni) + `App.tsx`'te auth durumundan bağımsız, herkese açık route'lar. `SignUpForm.tsx`'teki düz/tıklanamaz "Kullanım Şartları"/"Gizlilik Politikası" metni artık bu route'lara giden gerçek `<Link target="_blank">`.
> - **Doğrulama**: `npx tsc --noEmit` temiz, `npx vite build` başarılı (dist temizlendi). **Gerçek tarayıcıda tıklanarak hiçbiri test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok) — bir sonraki oturumda mobil genişlikte sidebar/header ve yeni ana sayfa widget'larının manuel kontrolü öneriliyor.
> - **Fark edilen, ele alınmayan follow-up**: sidebar daraltılmış hâldeki ikon (`public/images/logo/logo-icon.svg`) hâlâ TailAdmin'in jenerik ikonu — elimizde uygun bir icon-only Lunova asset'i yok, otomatik kırpma denenmedi (kötü sonuç riski). `README.md` bu turun kapsamı dışında bırakıldı.

> ## 🔧 Son Değişiklikler (2026-08-19, 6. tur) — Profil Kartlarında Gizli Toast Bug'ı
> Kullanıcı şikayeti: profil kartlarından (Kimlik/İletişim/Süreç) birini düzenleyip kaydedince hiçbir bildirim çıkmıyor, düzenleme modalı da kapanmıyordu. Kapsam: sadece `src/components/common/ToastContainer.tsx` (tek satır değişiklik).
> - **Kök neden**: `src/components/ui/modal/index.tsx` → `Modal`, tam ekranı kaplayan bulanık backdrop'la `z-99999` kullanıyor. `ToastContainer.tsx` ise `z-50` ile render ediliyordu. `UserMetaCard.tsx`/`UserContactCard.tsx`/`UserSupportCard.tsx`'teki `handleSave()` hata aldığında (örn. bir CSRF/ağ/validasyon hatası) `closeModal()`'a hiç uğramıyor (bu doğru davranış — sadece BAŞARIDA modal kapanıyor), ama `showToast(message, "error")` gerçekten çağrılıyor olsa da toast, hâlâ açık duran modalın backdrop'ının arkasında kalıp görünmüyordu. Kullanıcı gözünden "hiçbir şey olmadı" — aslında bir hata oluşuyordu, sadece bildirim gizliydi.
> - **Düzeltme**: `ToastContainer.tsx`'teki `z-50` → `z-999999` (`index.css`'te zaten tanımlı en üst custom z-index tonu, Modal'ın `z-99999`'undan yüksek). `ToastContainer` tek/paylaşılan bir bileşen olduğu için bu düzeltme, onu kullanan diğer yerlerde de (`pages/Appointments/AppointmentsList.tsx`, `AppointmentForm.tsx`, `Request.tsx`) aynı gizli-toast riskini kapatıyor.
> - **Doğrulama**: `npx tsc --noEmit` temiz. Ayrıca bu vesileyle backend'in CSRF zinciri (kök [claude.md](../claude.md)'nin 6. tur girdisine bakın) gerçekçi bir `curl` senaryosuyla (login → `csrftoken` cookie → üç kartın gerçek payload şekilleriyle `PATCH /accounts/profile/` → `200`; header'sız aynı istek → temiz `403`) yeniden ve daha sıkı doğrulandı — sonuç: backend tarafı sağlam, bu turun asıl bulgusu (toast z-index'i) CSRF'ten bağımsız, saf bir frontend CSS/stacking-context hatasıydı. **Toast'ın düzeltmeden sonra gerçek bir tarayıcıda modalın önünde göründüğü tıklanarak doğrulanmadı** (ortamda tarayıcı otomasyon aracı yok) — statik bir z-index karşılaştırması olduğu için yüksek güvenle doğru kabul ediliyor, ama bir sonraki oturumda/tarayıcıda gözle teyit önerilir.
> - **Fark edilen, kritik olmayan bir isimlendirme notu**: `UserSupportCard.tsx` dosyasının içindeki bileşen adı aslında `UserTreatmentCard`; `UserContactCard.tsx` ise `pages/UserProfiles.tsx`'te `UserInfoCard` diye import ediliyor. Üçü de doğru render ediliyor, fonksiyonel bug yok — sadece dosya adı/bileşen adı/import alias'ı tutarsızlığı, düşük öncelik.

> ## 🔧 Son Değişiklikler (2026-08-17, 5. tur) — CSRF Token Desteği
> Backend artık POST/PATCH/DELETE'lerde gerçek CSRF token doğrulaması yapıyor (kök [claude.md](../claude.md)'deki 5. tur changelog'una bakın). Kapsam: sadece `src/lib/api.ts`.
> - **`src/lib/api.ts`**: axios instance'ına `xsrfCookieName:'csrftoken'`, `xsrfHeaderName:'X-CSRFToken'`, `withXSRFToken:true` eklendi. İlk ikisi axios'un varsayılan (Angular konvansiyonu `XSRF-TOKEN`/`X-XSRF-TOKEN`) isimlerini Django'nunkiyle eşleştiriyor; `withXSRFToken:true` ZORUNLU — axios kaynak kodu (`node_modules/axios/dist/node/axios.cjs`) okunarak doğrulandı: bu olmadan axios, XSRF header'ını sadece same-origin isteklerde otomatik ekliyor, backend burada her zaman farklı bir portta/subdomain'de olduğu için header hiç gönderilmezdi.
> - **Doğrulama**: `npx tsc --noEmit` temiz. Backend tarafı `curl` ile (gerçek `Origin: http://localhost:5174` header'ı simüle edilerek) sıkı doğrulandı, ama axios'un bu config'le gerçek bir tarayıcıda `csrftoken` cookie'sini okuyup `X-CSRFToken` header'ına doğru şekilde koyduğu **tıklanarak test edilmedi** (ortamda tarayıcı otomasyon aracı yok). Bir sonraki oturumda login olup bir POST/PATCH (örn. profil kaydetme, randevu talebi) deneyip başarılı olduğunu gözlemlemek önerilir — 403 CSRF hatası alınırsa DevTools → Network'te `X-CSRFToken` header'ının gerçekten gittiğine bakılmalı.

> ## 🔧 Son Değişiklikler (2026-08-17, 4. tur) — ExpertAvailability Randevu Formu Yönlendirme Düzeltmesi
> Bir önceki turda "sıradaki iş" adayı olarak not edilen madde bu turda kapatıldı (kök [claude.md](../claude.md)'deki 4. tur changelog'una bakın, orada backend tarafındaki eşdeğer kalıp — `AvailabilityExceptionView.delete()` — de düzeltildi). Kapsam: sadece `src/pages/Appointments/ExpertAvailability.tsx`.
> - **`src/pages/Appointments/ExpertAvailability.tsx`**: `AppointmentForm`'a geçilen `navigate={() => {}}` no-op kaldırıldı. Bileşene `useNavigate()` (`react-router`) eklendi — bu, projede zaten `AppointmentsList.tsx` ve auth formlarında kullanılan established pattern. Randevu talebi başarıyla gönderildiğinde artık `AppointmentForm.tsx`'in `setTimeout(() => navigate("/appointments"), 2000)` çağrısı gerçekten çalışıyor.
> - **Doğrulama**: `npx tsc --noEmit` temiz; Router bağlamının (`App.tsx`'te `BrowserRouter`) ve `/appointments` route'unun mevcut olduğu, aynı `useNavigate` deseninin `AppointmentsList.tsx`'te zaten çalıştığı kod okunarak teyit edildi. **Bu ortamda bir tarayıcı otomasyon aracı olmadığı için gerçek tarayıcıda tıklanarak uçtan uca test edilmedi** — bir sonraki oturumda bu akışın (kategori/tarih seç → uzman aç → slot seç → randevu talebi gönder → `/appointments`'a yönlendiğini gözlemle) manuel doğrulanması önerilir.

> ## 🔧 Son Değişiklikler (2026-08-17, 3. tur) — Access Token Refresh
> **`src/lib/api.ts`**: Projede daha önce **hiç axios interceptor'ı yoktu** (aşağıdaki "🔌 API Client" bölümündeki eski iddianın aksine, bu artık geçerli değil). Artık bir response interceptor'ı var: 401 alan istekler önce sessizce `POST /api/v1/accounts/token/refresh/` ile oturumu yenilemeyi dener (httpOnly `refresh_token` cookie'siyle), başarılıysa orijinal isteği bir kez daha yapar; refresh de başarısız olursa (oturum gerçekten 1 saatten uzun süredir hareketsiz kalmış) kullanıcıyı `/signin`'e yönlendirir. Eşzamanlı 401'ler tek bir refresh çağrısını paylaşır (single-flight `refreshPromise`). Detay ve tasarım gerekçesi (neden 1 saat, Zoom seansları) için kök [claude.md](../claude.md)'ye bakın.

> ## 🔧 Son Değişiklikler (2026-08-17, devam) — Profil Düzenleme + Yerel Ortam
> Kullanıcının bildirdiği "profil kaydından sonra sayfa beyaz kalıyor" şikâyeti araştırıldı. Tam detay için kök [claude.md](../claude.md)'deki changelog'a bakın; özet:
> - **`src/mappers/profileMapper.ts`**: `mapProfileToUpdatePayload()` içinde `profile.substances_used.map(...)` null-check'siz çağrılıyordu. `?? []` eklendi.
> - **`src/components/common/ErrorBoundary.tsx`** (yeni) + `src/main.tsx`: Projede hiç React ErrorBoundary yoktu (kök nedenlerden biri — herhangi bir render hatası tüm SPA'yı unmount edip gerçek "beyaz sayfa" üretiyordu). Artık `App` bu boundary ile sarmalı. **Tek, en üst seviye bir boundary — sayfa bazlı değil**, bir sonraki oturumda kritik sayfalar (Appointments, Profile) için ayrı, daha küçük kapsamlı boundary'ler eklenmesi değerlendirilebilir.
> - **`src/components/UserProfile/UserMetaCard.tsx`, `UserContactCard.tsx`, `UserSupportCard.tsx`**: `handleSave` önceden başarı/hata durumunda hiçbir görsel geri bildirim vermiyordu (`console.error`'a düşüyordu). `useToast`/`ToastContainer` (zaten `pages/Appointments/*` içinde kullanılan established pattern) ile eklendi. `dispatch(fetchProfile())` artık `await` ediliyor.
> - **`backend/accounts/serializers/profile_update_serializers.py`**: `timezone` alanı `BaseUserUpdateSerializer`'a eklendi — `UserContactCard.tsx` bu alanı zaten gönderiyordu ama backend sessizce yok sayıyordu, hiç kalıcı olmuyordu.
>
> **Bu turda TESPİT EDİLİP kod DEĞİŞTİRİLMEDEN bırakılan sorunlar** (aynı denetimde bulundu, "sıradaki iş" adayları — öncelik sırası kök claude.md'de):
> - ✅ **[4. TURDA DÜZELTİLDİ]** ~~`src/pages/Appointments/ExpertAvailability.tsx:296` → `AppointmentForm`'a `navigate={() => {}}` (no-op) geçiyor~~ — bkz. yukarıdaki "4. tur" changelog girişi.
> - `src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub (`console.log("Henüz silme desteklenmiyor…")`), silme butonu kullanıcıya hiçbir geri bildirim vermeden çalışmıyormuş gibi davranıyor. Aynı dosyada `handleDownload` hatası da sessiz — bu dosyada, kardeş kartlardan farklı olarak `useToast` hiç kullanılmıyor.
> - `src/store/authSlice.ts` → `fetchProfile.rejected` sadece `state.error`'ı set ediyor, `userProfile`/`isAuthenticated`'a dokunmuyor — 15 dk'lık access token süresi dolduğunda (backend'de hâlâ düzeltilmemiş bir sorun) eski profil verisi sessizce ekranda kalmaya devam ediyor, küçük bir kırmızı banner dışında kullanıcıyı uyaran yok.
> - `src/pages/Appointments/AppointmentsList.tsx:50` ve `Request.tsx:50` → API response'u şekil kontrolü yapmadan doğrudan `.map()`'e veriliyor (`substances_used` bug'ıyla aynı aile) — artık yeni ErrorBoundary bunu yakalıyor ama kök neden düzeltilmedi.
> - `components/UserProfile/UploadDocumentModal.tsx` (doğrulandı, hâlâ mevcut) → fotoğraf yükleme sonrası 2 sn gecikmeyle `dispatch(fetchMe())` çağırıyor; `App.tsx`'teki `RequireAuth`, `auth.loading===true` iken TÜM `AppLayout`'u (overlay değil, tam replace) `GlobalSpinner` ile değiştiriyor — rutin bir fotoğraf yüklemesi kısa süreliğine tüm korumalı uygulamayı kayboluyor gösteriyor. Kullanıcı talimatı gereği bucket/upload akışına bu turda dokunulmadı.
>
> **Yerel ortam**: `client/node_modules` bu turda kuruldu, `npx tsc --noEmit` temiz. `.env` artık diskte var (gitignore'da, `client/claude.md`'nin altındaki ".env yok" notu — bkz. aşağı — artık kısmen eski).

> ## 🔧 Son Değişiklikler (2026-08-17) — Randevu Zinciri
> - **`types/appointment.ts`**: `Appointment.expert`/`.client` tipi düzeltildi — artık gerçek backend şekliyle uyumlu: düz `number` (User id) + ayrı `expert_name`/`client_name` string alanları. Önceki tip (`PersonRef` nesnesi) yanlıştı; `AppointmentsTable.tsx` içinde bunu telafi eden `as any` hackleri kaldırıldı.
> - **`components/tables/Appointments/AppointmentsTable.tsx`** ve **`pages/Appointments/AppointmentsList.tsx`**: Randevu listesinde daha önce **hiçbir iptal/geri çekme aksiyonu yoktu** (sadece "Zoom'a Katıl" butonu vardı) — eklendi:
>   - `confirmed` durumundaki randevu için "İptal Talebi Gönder" → `PATCH /appointments/{id}/status/ {status: 'cancel_requested'}`
>   - `waiting_approval` durumundaki (henüz uzman onayı almamış) kendi talebi için "Talebi Geri Çek" → `PATCH .../status/ {status: 'cancelled'}` (bu geçiş için backend'de yeni izin kuralı eklendi, bkz. [backend/claude.md](../backend/claude.md))
>   - Yeni `onStatusChange` prop'u opsiyonel — geriye dönük uyumlu.
> - Değişmedi/dokunulmadı: randevu OLUŞTURMA akışı (`Request.tsx`/`ExpertAvailability.tsx`/`AppointmentForm.tsx`) zaten `expert_user_id` (doğru, global User id) kullanıyordu — incelendi, hatasız bulundu, dokunulmadı.
> - Test edilemedi: bu ortamda `node_modules` kurulu ama `typescript` paketi eksikti (`tsc` binary'si yok) — değişiklikler dikkatli manuel inceleme ile doğrulandı, `npm run build`/canlı tarayıcı testi henüz yapılmadı.

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
├── pages/        → Appointments, AuthPages, Dashboard, Legal, OtherPage, UserProfiles
│                   ("Blank"/"Calendar"/"Charts"/"Forms"/"Tables"/"UiElements" YOK —
│                    7. turda TailAdmin şablon leftover'ı olarak silindi; "Legal" yeni,
│                    içeriksiz /terms+/privacy altyapısı)
├── store/        → authReducer.ts (KULLANILMIYOR — bkz. aşağı), authSlice.ts, hooks.ts, index.ts
└── types/        → appointment.ts, auth.ts, profile.payload.ts, profile.types.ts
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
**Son Güncelleme**: 2026-08-19, 8. tur (ana sayfa scroll bug'ı `GlobalSpinner.tsx`'te düzeltildi, Zoom butonlarına 15dk ön koşul eklendi, mini takvime renk lejantı eklendi — `tsc`/`vite build` temiz, gerçek tarayıcı testi bekliyor)
