# Lunova - Proje Overview ve Mimari Rehber

> **Not (2026-08-14)**: Bu dosya ve alt dizinlerdeki `claude.md` dosyaları, kod tabanı doğrudan okunarak (satır satır `models.py`, `views.py`, `settings.py`, `urls.py`, gerçek `package.json`'lar vb.) doğrulanmıştır. Önceki bir AI ajanının ürettiği ilk sürüm; token ömrü, endpoint listesi, model alanları, dizin ağacı ve bağımlılık versiyonları gibi birçok noktada **kod ile örtüşmeyen (uydurma/varsayılan) bilgiler** içeriyordu. Bu sürümdeki her teknik iddia kaynak koddan doğrulanmıştır. Sonraki agentic çalışmalarda bu dosyalara güvenebilirsin, ama kod değiştikçe bu dosyaların da güncellenmesi gerekir.

> ## 📌 Kalıcı Kural — Dokümantasyon Bakımı (2026-08-19, 8. tur'da revize edildi)
> Bu proje çok-turlu, çok-ajanlı bir şekilde geliştiriliyor; bir çalışmanın bulguları bir sonrakinin tek başlangıç noktası. Bu dosyanın (ve alt dizinlerdekilerin) doğruluğu bu yüzden kritik — **aşağıdaki 5 kural, "isteğe bağlı iyi pratik" değil, her çalışmanın sonunda uygulanması gereken zorunlu adımlardır.**
>
> **(a) Ne zaman güncellenir**: Kod değiştiren HER çalışma sonunda — küçük bir bug fix, bir özellik, bir refactor, fark etmez. Bunun ek token/zaman maliyeti **kabul edilmiş bir maliyettir**; "az değişti, dokümana değmez" diye atlanmaz. Kullanıcı açıkça "dokümantasyona dokunma" demediği sürece bu adım zorunludur — varsayılan davranış her zaman günceller.
>
> **(b) Nereler güncellenir**: **(1)** bu kök dosya — en azından "🔧 Son Değişiklikler" ve "📊 Sistem Durumu Özeti"; **(2)** değişikliğin gerçekleştiği alt dizin(ler)in kendi dosyası (`backend/claude.md`, `client/claude.md`, `expert/claude.md`). **Kritik teknik gerçek**: yeni oturumlar SADECE bu kök dosyayı otomatik olarak context'e alıyor — alt dizin dosyaları kendiliğinden görünmüyor, önce açıkça `Read` edilmesi gerekiyor. Bunun iki sonucu var: **(i)** bir alt dizinde çalıştıysan o dosyayı güncellemeden önce mutlaka önce okumalısın (üzerine kör yazma); **(ii)** kök dosyada iddia edilen HER teknik gerçek (paket adları, bağımlılıklar, dosya ağacı gibi) burada ayrıca elle tekrarlanmışsa, o kopya da güncellenmeli — aksi halde tam olarak aşağıdaki "🏗️ Sistem Mimarisi" bölümünde 7. turda yakalanan drift tekrarlanır (`package.json` adları ve Clerk bağımlılığı orada güncellenmemiş kalmıştı, "📊 Sistem Durumu Özeti"nde doğruyken). **Bir gerçeğin birden fazla yerde tekrarlandığını fark edersen, mümkünse tek bir yere indirip diğerinden ona link ver — iki kopyayı senkron tutmaya güvenme.**
>
> **(c) Nasıl yazılır**: ne değişti, neden, nasıl doğrulandı (gerçek test/curl/tarayıcı mı, yoksa sadece kod/tip kontrolü mü — açıkça belirt) ve önem derecesi. Yeni bulunan ama düzeltilmeyen her bulgu için önem derecesi **zorunlu**, şu ölçek kullanılmalı:
>   - 🔴 **Kritik** — güvenlik açığı, veri kaybı riski, üretimi/ana akışı tamamen kıran hata
>   - 🟠 **Yüksek** — kullanıcının ana akışını bozan, sık karşılaşılan hata
>   - 🟡 **Orta** — gerçek ama nadiren tetiklenen/dar kapsamlı sorun
>   - 🟢 **Düşük** — kozmetik, ölü kod, "olsa iyi olur" niteliğinde
>
> **(d) "🧭 Geliştirme Fikirleri" yaşam döngüsü**: statik bir liste değil. Bir fikir gerçekleştirildiğinde madde silinmez — üstü çizilip hangi turda kapatıldığı not düşülür (istenirse "Kapatılmış" listesine taşınır). Çalışma sırasında gerçek, somut bir geliştirme fırsatı fark edilirse (uydurma değil, koddan/kullanıcıdan gelen) bu bölüme yeni madde eklenmeli. **Liste sonsuza kadar aynı maddelerde donup kalmamalı.**
>
> **(e) Şişmeyi önleme (yeni, 8. turda eklendi)**: Bu dosya HER oturumda TAMAMEN yükleniyor — bu yüzden "🔧 Son Değişiklikler" (tur bazlı ayrıntılı changelog) sonsuza kadar büyümemeli. **Kural: en fazla son 3 tur ayrıntılı tutulur.** Yeni bir tur eklerken, artık 4. sıraya düşen turu sil — bilgi kaybı değildir, çünkü (i) o turun net sonucu zaten "📊 Sistem Durumu Özeti"nde bir cümleye indirgenmiş olmalı (değilse, silmeden önce oraya taşı), (ii) tam ayrıntısı `git log -p -- claude.md` ile her zaman geri getirilebilir (repo artık `git subtree` ile birleşmiş tek bir depo — bkz. aşağıdaki "⚠️ Repo Yapısı" notu, bu dosyanın kendisi de sürüm kontrolünde). Bu, projenin daha önce ayrı bir `SYSTEM_REPORT.md` dosyası tutup onu senkronize edemeyip terk ettiği hatanın (bkz. git geçmişi) tam tersi bir çözüm: içerik çoğaltmak yerine, GEÇMİŞİ git'e devret, bu dosyada sadece GÜNCEL DURUM + SON birkaç tur kalsın.

> ## 🔧 Son Değişiklikler (2026-08-19, 9. tur) — Doküman Sistemi İyileştirmesi + `expert/ToDo.md` Konsolidasyonu
> İki ayrı, dokümantasyon-odaklı istek. Kod değişikliği yok, sadece `.md` dosyaları.
> - **Doküman sistemi meta-iyileştirmesi**: Kullanıcı, sistem genelindeki dokümantasyon bakım mantığının gözden geçirilmesini istedi. "📌 Kalıcı Kural" yeniden yazıldı — artık şunları açıkça söylüyor: (a) her çalışmadan sonra günceller, token maliyeti bahane değil; (b) SADECE kök `claude.md` otomatik yükleniyor, alt dizin dosyaları (`backend/`, `client/`, `expert/`) açıkça `Read` edilmeden görünmüyor — bu turda kesinleşen bir gerçek; (c) yeni bir önem derecesi ölçeği (🔴/🟠/🟡/🟢) tüm "hâlâ açık" listelerine tutarlı uygulandı; (d) "Geliştirme Fikirleri"nin canlı bir liste olması gerektiği, statik kalmaması gerektiği netleştirildi; (e) changelog'un sonsuza kadar büyümemesi için "son 3 tur ayrıntılı tutulur" kuralı eklendi (bu kural bu turda da bizzat uygulandı — aşağıya bakın). `SYSTEM_REPORT.md` silindi (otomatik yüklenmeyen, içeriksiz bir stub'dı, kök dosya zaten aynı işi görüyor). Ayrıca kullanıcının isteğiyle kökte yeni bir `DOC_AUDIT.md` oluşturuldu — **bu dosya normal iş akışında hiç değerlendirilmiyor, sadece kullanıcı açıkça "bunu oku" dediğinde** tam bir doküman-kod tutarlılık denetimi çalıştırmak için bir runbook.
> - **`expert/ToDo.md` konsolidasyonu**: Kullanıcı, servis içi TODO dosyalarının artık gereksiz olduğunu belirtti (kök `claude.md`'nin kendi "sıradaki adımlar"/"hâlâ açık" mekanizması aynı işi zaten görüyor). `expert/ToDo.md`'nin 4 "Yapılacak" + 6 "Yapılmış" maddesi tek tek koda karşı yeniden doğrulandı — 3'ü zaten stale çıktı (dosyanın kendisi güncellenmemiş kalmış): "randevu reddetme 403" ve "`dashboard/api.ts` hardcoded localhost" ikisi de çoktan çözülmüştü (`dashboard/api.ts` artık repoda bile yok); "danışan seçimi manuel ID" iddiası da yanlıştı — `create-appointment-modal.tsx` zaten gerçek bir isim dropdown'ı, ama gerçek bir kısıtlama hâlâ duruyor (dropdown backend'in `/accounts/clients/` ucundan değil, sadece randevu geçmişinden besleniyor). Google OAuth planı (henüz uygulanmamış) ve "randevu detayına tıklayınca görüntüleme" (zaten var, sadece durum güncellemesiyle sınırlı) da doğrulanıp `expert/claude.md`'nin yeni "🗒️ Ekip Notları" bölümüne taşındı. `ToDo.md` silindi; `CHANGELOG.md`'ye dokunulmadı (farklı bir işlevi var, sürüm notu).
> - **Doğrulama**: Bu tamamen bir dokümantasyon turu — kod değişmedi, `tsc`/`build` çalıştırılmadı. Her taşınan iddia (dosya var/yok, dropdown'ın gerçek davranışı) `Glob`/`Grep`/`Read` ile koda karşı doğrulandı, körlemesine taşınmadı.

> ## 🔧 Son Değişiklikler (2026-08-19, 8. tur) — Ana Sayfa Scroll Bug'ı, Zoom 15dk Kısıtı, Expert Onay Çift-Modal Bug'ı, Takvimlerde Durum Renklendirmesi
> Kullanıcının bildirdiği 2 somut bug + 1 tanı isteği + 1 UX iyileştirmesi. Kapsam client+expert her ikisi; backend'e dokunulmadı. Detay için `client/claude.md` ve `expert/claude.md`'nin 8. tur girdilerine bakın.
> - **[BUG, ÇÖZÜLDÜ] Client'ta ilk girişten sonra ana sayfada scroll çalışmıyordu**: Kök neden `client/src/components/common/GlobalSpinner.tsx` — `document.body.style.overflow = 'hidden'` bir mount-only `useEffect`'te set ediliyor, sadece unmount cleanup'ında `'unset'`e dönüyordu. Ama `GlobalSpinner`, `App.tsx`'te router seviyesinde KALICI olarak mount'lu (loading'e göre `null` dönüyor, hiç unmount olmuyor) — yani ilk login sonrası loading true→false geçtiğinde body scroll'u kalıcı olarak kilitli kalıyordu. "Başka sayfaya gidip geri dönünce düzeliyordu" çünkü `/profile` gibi sayfalar `Modal` bileşeni mount ediyor (kapalı olsa bile) ve `Modal`'ın kendi `useEffect`'i `isOpen` değiştiğinde body overflow'u `'unset'`e resetliyor — bu tamamen tesadüfi bir yan etkiydi. Düzeltme: `overflow`'u set eden effect artık `[loading]`'e bağımlı, loading her `false` olduğunda anında resetleniyor.
> - **[BUG, ÇÖZÜLDÜ] Expert'te bekleyen bir randevuyu onaylayınca ayrıca bir detay modalı açılıp "zaten onaylanmış" hatası veriyordu**: Kök neden `expert/src/features/reservations/components/pending-appointments.tsx` — onay (✓)/red (✗) butonları, satırın tamamını saran ve `onClick={() => onAppointmentClick(...)}` (detay modalını açan) bir `<div>`'in İÇİNDE, `stopPropagation()` olmadan duruyordu. Butona tıklamak hem `handleApprove()`'u (gerçek PATCH, anında onaylıyor) HEM de event bubbling ile üstteki `div`'in `onClick`'ini (detay modalını açıyor) tetikliyordu — modal içindeki "Onayla" butonuna tekrar basınca backend zaten `confirmed` olan randevuyu tekrar onaylamaya çalışıp hata veriyordu. `expert/src/features/reservations/components/appointments-table.tsx`'te AYNI kalıp zaten doğru şekilde `onClick={(e) => e.stopPropagation()}` ile korunuyordu — `pending-appointments.tsx`'e de aynı satır eklendi.
> - **[SADECE TANI, DÜZELTİLMEDİ — kullanıcı talebi üzerine]** "Onaylanmış randevularda Zoom linkine tıklayınca 404" sorusu yanıtlandı (bu sohbette): `backend/appointments/views.py:273-279`, `ENVIRONMENT != 'Production'` iken (yani her lokal/dev ortamda) gerçek Zoom API'si hiç çağrılmıyor, `zoom_join_url` alanına bilinçli olarak literal `"mock url"` string'i yazılıyor. Client `window.open(appointment.zoom_join_url, "_blank")` bunu doğrudan açmaya çalışınca, `"mock url"` geçerli bir absolute URL olmadığı için tarayıcı bunu mevcut origin'e göre relative path sanıyor (`/mock%20url` gibi), React Router'da eşleşen route olmadığı için `path="*"` → `NotFound.tsx` (404 sayfası) render oluyor. Bilinçli bir dev/mock davranışı, ama frontend bu durumu hiç ele almıyor.
> - **[YENİ ÖZELLİK] Zoom'a katılma 15 dakika ön koşulu (client)**: Yeni `client/src/utils/zoomAccess.ts` → `getZoomJoinBlockMessage(date, time)`, randevu saatinden 15 dk'dan daha erken çağrılırsa bir uyarı mesajı döner, aksi halde `null`. Hem `components/tables/Appointments/AppointmentsTable.tsx` (yeni `onZoomBlocked` prop, `AppointmentsList.tsx`'ten `showToast`'a bağlanıyor) hem `components/dashboard/UpcomingAppointmentsCard.tsx` (kendi `useToast`/`ToastContainer` instance'ı) bu kontrolü Zoom butonunun `onClick`'ine ekledi — erken tıklanırsa `window.open` hiç çağrılmıyor, "Zoom görüşmesine randevu saatinize 15 dakika kala katılabilirsiniz." toast'ı gösteriliyor. **Bilinçli kapsam kararı**: expert'in "Toplantıyı Başlat" (host/`zoom_start_url`) butonlarına AYNI kısıt uygulanmadı — host'un görüşmeyi erkenden hazırlık için başlatması meşru bir senaryo, kullanıcı bunu istemedi.
> - **[UX] Takvimlerde artık sadece "confirmed" değil, iptal edilmemiş TÜM durumlar (bekleyen/onay bekleyen/iptal talepli/tamamlanmış) durum bazlı renkle gösteriliyor, kullanıcı önizleyebiliyor**:
>   - Client `components/dashboard/MiniCalendarCard.tsx`: zaten `cancelled` hariç her şeyi renkli gösteriyordu (önceki turdan) — bu turda sadece küçük bir renk lejantı eklendi (üstte 4 nokta + etiket).
>   - Expert `features/reservations/components/expert-daily-schedule.tsx` ("Program" widget'ı, Rezervasyonlar sayfasının ana takvimi — hem günlük timeline hem haftalık grid görünümü): önceden HER YERDE (`appointmentsByDate` yoğunluk hesabı, günlük timeline filtresi, haftalık grid filtresi) sadece `status === 'confirmed'` gösteriyordu — bekleyen/onay bekleyen randevular takvimde tamamen görünmezdi (sadece ayrı "Bekleyen Randevular" panelinde listeleniyordu). Üç filtre de `status !== 'cancelled'`e genişletildi, yeni bir `STATUS_STYLES` map'i (yeşil=onaylandı, amber=bekliyor/onay bekliyor, turuncu=iptal talebi, gri=tamamlandı) hem günlük timeline bloklarına hem haftalık grid hücrelerine uygulandı (önceden hepsi sabit `bg-primary/10` renkteydi), ve client'takiyle tutarlı bir renk lejantı eklendi.
> - **Doğrulama**: `client` → `npx tsc --noEmit` + `npx vite build` temiz. `expert` → `npx tsc -b` + `npx vite build` temiz. **Gerçek tarayıcıda tıklanarak hiçbiri test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok — bu artık projenin her turunda tekrarlanan aynı sınırlama). Özellikle şu akışların bir sonraki oturumda/gerçek cihazda doğrulanması öneriliyor: (1) client'ta login → ana sayfada scroll'un ilk andan itibaren çalıştığı, (2) expert'te bekleyen bir randevuyu onaylayınca artık ekstra bir modal AÇILMADIĞI, (3) client'ta bir randevunun Zoom butonuna 15 dk'dan erken tıklayınca uyarı toast'ının çıktığı ve linkin açılmadığı, geç tıklayınca normal açıldığı, (4) expert'in Rezervasyonlar sayfasındaki "Program" takviminde artık bekleyen randevuların da (amber renkte) göründüğü.

> ## 🔧 Son Değişiklikler (2026-08-19, 7. tur) — Mobil Düzeltmeler, Marka/UI Temizliği, Client Ana Sayfası, Hukuki Sayfa Altyapısı
> Geniş kapsamlı bir UI/UX turu: client'ta 2 somut mobil bug, iki uygulamada da şablon kimliğinin (TailAdmin/shadcn-admin) kalıntılarının temizlenmesi, gerçek Lunova logosunun expert'e taşınması, client ana sayfasının gerçek bileşenlerle donatılması, üçüncü parti (GitHub/Facebook) giriş butonlarının kaldırılması ve Clerk'in tamamen sökülmesi, ve iki uygulamada da `/terms`+`/privacy` altyapısının (içeriksiz) kurulması. Kapsam çok geniş olduğu için burada özet, dosya bazlı detaylar `client/claude.md` ve `expert/claude.md`'de.
>
> **Client — mobil bug'lar (kullanıcı bildirdi)**:
> - `layout/AppHeader.tsx`: mobil-only logo (`lg:hidden` bloğu) hiç boyut kısıtı olmadan 1500×500px'lik `logo-black-red.png`'yi ham boyutuyla basıyordu — mobilde ekranın ~4 katı genişlikte taşıp işlem yapılamaz hale getiriyordu. `width`/`height` + `h-8 w-auto` eklendi. Ayrıca `src="./images/..."` (relative) → `src="/images/..."` (absolute) düzeltildi — relative hâli `/appointments/request` gibi 2+ segmentli bir route'tayken tarayıcının URL çözümleme kurallarına göre kırılıyordu (`/appointments/images/...` gibi yanlış bir path'e çözülüyordu), `AppSidebar.tsx` zaten absolute path kullanıyordu, tutarlı hale getirildi.
> - `layout/AppSidebar.tsx`: mobilde bir nav linkine tıklandığında sidebar hiç kapanmıyordu (`Link`lerde `onClick` yoktu, sadece backdrop'a tıklamak veya hamburger'e tekrar basmak kapatıyordu). İki `Link`e de `onClick={closeMobileSidebar}` eklendi (`isMobileOpen` true ise `toggleMobileSidebar()` çağırıyor, masaüstünde etkisiz).
> - `context/SidebarContext.tsx`: `isMobile` hesaplaması `768px`(`md`) kullanıyordu ama Header/Sidebar'ın kendi mobil/masaüstü ayrımı `1024px`(`lg`) — 768-1024 arası bir "no-man's-land" vardı (header mobil davranıp `toggleMobileSidebar` çağırırken context hâlâ masaüstü sanıyordu). `1024`'e çekildi.
>
> **Client — marka/UI temizliği**:
> - `layout/SidebarWidget.tsx`: TailAdmin'in "#1 Tailwind CSS Dashboard / Purchase Plan → tailadmin.com/pricing" upsell kutusu (her zaman render oluyordu, gerçek bir dış link) kaldırıldı, yerine minimal bir "© {yıl} Lunova" notu kondu.
> - `index.html`: favicon `<link>`'i `type="image/svg+xml"` derken dosya aslında `.png` idi (mime type uyuşmazlığı) → `image/png` düzeltildi; hiç `<title>` yoktu → `<title>Lunova</title>` eklendi.
> - `pages/OtherPage/NotFound.tsx`, `pages/AuthPages/{SignIn,SignUp,ResetPassword,ResetPasswordSent}.tsx`: `PageMeta` başlıkları hâlâ "React.js ... Dashboard | TailAdmin - ..." idi → Lunova/Türkçe metinlere çevrildi. NotFound'un görünür "&copy; TailAdmin" footer'ı ve İngilizce metinleri de Lunova/Türkçe'ye çevrildi.
> - **Silindi (doğrulanmış, kullanılmayan)**: `components/header/Header.tsx` (App'in gerçekte kullandığı `AppHeader.tsx`'in aksine hiçbir yerden import edilmiyordu; içinde `formbold.com`'a POST eden bir form ve `youtube.com/embed/dQw4w9WgXcQ` gömülü videolar vardı); `public/images/logo/{logo.svg,logo-dark.svg,auth-logo.svg}` (TailAdmin'in kendi jenerik mavi placeholder logosu, hiçbir kod tarafından referans edilmiyordu — gerçek Lunova logosu `logo-black-red.png`/`logo.png`, onlara dokunulmadı).
> - **Silindi (App.tsx'te zaten yorum satırıyla devre dışıydı, artık dosyalar da yok)**: `pages/{Blank.tsx,Calendar.tsx,Charts/,Forms/,Tables/,UiElements/}` ve SADECE bu sayfalara özel bileşenler (`components/charts/{bar,line}/`, `components/ui/{videos,images}/`, `components/form/form-elements/`, `components/tables/BasicTables/`). `App.tsx` ve `AppSidebar.tsx`'teki bu sayfalara referans veren ölü yorum satırları da temizlendi (artık var olmayan dosyalara işaret ediyorlardı).
> - `AppSidebar.tsx`: "Dashboard" nav öğesi gereksiz yere tek elemanlı bir alt-menü olarak tanımlıydı (`subItems: [{name:"Ana Panel", path:"/"}]`) → diğer öğelerle tutarlı, doğrudan bir link'e ("Ana Panel") çevrildi. Tüm `alt="Logo"` → `alt="Lunova"`.
> - `package.json`: `name` `tailadmin-react` → `lunova-client`, `version` `2.0.2` → `0.1.0`.
>
> **Client — Ana Sayfa (`pages/Dashboard/Home.tsx`) tamamen yeniden yapıldı**: Önceden hâlâ ham TailAdmin e-ticaret dashboard'uydu (sahte "3,782 Danışan" metrikleri, "Finansal Danışmanlık 2.399₺" gibi ürün satırlarına çevrilmiş bir "RecentOrders" tablosu, bir dünya haritası "demografi" widget'ı — hiçbiri gerçek veriye bağlı değildi). Kaldırılıp yerine 3 yeni, gerçek veriye bağlı bileşen kondu (`components/dashboard/`):
> - `WelcomeCard.tsx` — `state.auth.user`'dan (app açılışında zaten `fetchMe()` ile dolduruluyor) isimle karşılama + "Randevu Talep Et"/"Profili Düzenle" hızlı linkleri.
> - `UpcomingAppointmentsCard.tsx` — `GET /api/v1/appointments/` (AppointmentsList.tsx ile aynı endpoint/parametreler) sonucundan iptal/tamamlanmış olmayan, tarihi geçmemiş en yakın 3 randevuyu gösterir; durum rozeti + varsa Zoom butonu + boş durumda "Randevu Talep Et" CTA'sı.
> - `MiniCalendarCard.tsx` — zaten bağımlılıklarda hazır bulunan FullCalendar (`@fullcalendar/react`+`daygrid`, Türkçe locale `@fullcalendar/core/locales/tr`) ile kompakt bir aylık takvim; randevular event olarak basılır (durum bazlı renk), bir event'e tıklamak `/appointments`'a yönlendirir.
> Tek bir `useEffect` içinde `Home.tsx` seviyesinde tek bir randevu fetch'i yapılıp her iki karta prop olarak geçiliyor (gereksiz çift istek yok). Eski `components/ecommerce/*` (6 dosya, tek tüketicisi eski Home.tsx'ti) artık öksüz kaldığı için silindi.
>
> **Client — hukuki sayfa altyapısı (İÇERİKSİZ — kullanıcı talebi üzerine)**: `pages/Legal/{TermsOfService,PrivacyPolicy}.tsx` (yeni) + `App.tsx`'te `/terms`/`/privacy` route'ları (auth durumundan bağımsız, herkese açık — `AuthGuard`/`RequireAuth` sarmalayıcısı yok). İkisi de sadece başlık + "İçerik yakında eklenecektir." placeholder'ı + ana sayfaya dön linki içeriyor, gerçek metin bilinçli olarak eklenmedi. `SignUpForm.tsx`'teki "Kullanım Şartları"/"Gizlilik Politikasını kabul ediyorum" ibaresi önceden düz, tıklanamaz `<span>` idi → artık bu yeni route'lara giden gerçek `<Link target="_blank">`'ler.
>
> **Expert — Lunova logosu eklendi (önceden hiç yoktu)**: `client/public/images/logo/{logo-black-red.png,logo.png}` (gerçek Lunova logosu) `expert/public/images/logo/`'ya kopyalandı. `features/auth/auth-layout.tsx` (sign-in/sign-up/forgot-password/otp'nin hepsinin sarmalayıcısı — tek noktadan düzeltme) → jenerik bir SVG ikon + sabit "Shadcn Admin" yazısı vardı, yerine gerçek Lunova logosu kondu. `components/layout/authenticated-layout.tsx` → sidebar'ın en üstünde hiçbir zaman hiçbir şey render olmuyordu (`TeamSwitcher`, `sidebarData.teams` hep `[]` olduğu için hiç görünmüyordu) → statik bir Lunova logo bloğu eklendi (`SidebarHeader`, `group-data-[collapsible=icon]:hidden` ile daraltılmış modda gizleniyor). Tek-marka bir ürün için anlamsız olan "Teams" dropdown'ı (`team-switcher.tsx`, "Add team" seçeneğiyle) tamamen kaldırıldı — `SidebarData`/`types.ts`'ten `teams`/`Team` alanları da silindi.
> - `components/layout/nav-user.tsx`: sidebar altındaki kullanıcı kutusu hep şablon yazarının kendi bilgilerini gösteriyordu (`name: 'satnaing', email: 'satnaingdev@gmail.com'`, `sidebar-data.ts`'te hardcoded) — **gerçek bir bug**, gerçek giriş yapmış uzmanın adı/e-postası hiç görünmüyordu. Artık `useAuthStore()`'daki gerçek oturum verisini kullanıyor (`useAuthGuard` zaten `setAuthUser` ile bu store'u dolduruyordu, sadece `NavUser` bunu okumuyordu). Var olmayan `/avatars/shadcn.jpg`'ye işaret eden kırık `AvatarImage` de kaldırıldı, yerine gerçek isimden hesaplanan baş harfler (`AvatarFallback`) kondu. Dead "Upgrade to Pro" yorum bloğu silindi, "Sign out" → "Çıkış Yap".
>
> **Expert — üçüncü parti giriş butonları kaldırıldı**: `features/auth/sign-in/components/user-auth-form.tsx` ve `features/auth/sign-up/components/sign-up-form.tsx`'teki dekoratif (hiçbir `onClick`'i olmayan, tamamen işlevsiz) GitHub/Facebook butonları + "Veya devam et" ayracı kaldırıldı — sitede hiçbir dış hesap/OAuth servisi olmadığı için sadece e-posta/şifre girişi kaldı. Her iki dosyaya da **Google ile giriş TODO yorumu** eklendi; ayrıca `expert/ToDo.md`'nin "Yapılacaklar" listesine de (client tarafını da kapsayacak şekilde) eklendi.
>
> **Expert — Clerk tamamen söküldü**: `.env`'de `VITE_CLERK_PUBLISHABLE_KEY` hiç tanımlı olmadığı, `main.tsx`'te `ClerkProvider` hiç kurulmadığı ve gerçek nav'da `/clerk/*`'e giden tek link zaten yorum satırında olduğu doğrulanmıştı (önceki turlarda not edilmişti) — bu turda kod da fiilen silindi: `routes/clerk/` (6 dosya), `assets/{clerk-logo,clerk-full-logo}.tsx`, `package.json`'dan `@clerk/clerk-react` (+ `npm install` ile lockfile senkronize edildi, 8 paket kaldırıldı).
>
> **Expert — diğer kullanılmayan şablon sayfaları silindi** (hepsi `sidebar-data.ts`'te zaten yorum satırında/bağlı değildi — "gereksiz sayfaları inaktif yapabilirsin" kapsamında artık fiilen kaldırıldı, sadece gizlenmiyor): `routes/_authenticated/{apps,chats,tasks,users,help-center}/` + `features/{apps,chats,tasks,users}/` + `components/coming-soon.tsx`; `routes/(auth)/sign-in-2.tsx` + `features/auth/sign-in/sign-in-2.tsx` (sahte Vite logosu + sahte "John Doe" testimonial'ı olan, hiçbir yerden linklenmeyen alternatif 2 kolonlu giriş varyantı); `routes/_authenticated/settings/{index,account,notifications,display}.tsx` + `features/settings/{account,notifications,display,profile}/` (sadece `/settings/appearance` gerçek ve sidebar'dan linkliydi — `features/settings/index.tsx`'teki `sidebarNavItems` tek gerçek girdiye indirilip Türkçe'ye çevrildi). `sidebar-data.ts`'teki tüm ölü yorum bloğu (Clerk import, Apps/Chats/Users/Pages/Errors nav taslakları) temizlendi. **Route dosyaları silindikten sonra `npx vite build` çalıştırılıp `@tanstack/router-plugin`'in `routeTree.gen.ts`'i yeniden ürettiği doğrulandı** (build çıktısında artık clerk/apps/chats/tasks/users chunk'ları yok).
> - `index.html`: `og:url`/`twitter:url` **gerçekten `https://shadcn-admin.netlify.app`'e işaret ediyordu**, `og:image`/`twitter:image` de şablonun kendi ekran görüntüsüne (`shadcn-admin.png`) — canlı, dış siteye giden meta veriler kaldırıldı (yanlış bir Lunova URL'si uydurmak yerine tamamen silindi). `<title>`/`meta name="title"` "Shadcn Admin" → "Lunova | Uzman Paneli".
> - `package.json`: `name` `shadcn-admin` → `lunova-expert`, `private` `false` → `true`, `version` `2.1.0` → `0.1.0`.
>
> **Expert — hukuki sayfa altyapısı (İÇERİKSİZ)**: `features/legal/legal-page.tsx` (paylaşılan şablon) + `routes/{terms,privacy}.tsx`. Sign-in/sign-up'ta zaten `href="/terms"`/`href="/privacy"` yazan ama hiçbir route'un karşılamadığı (404'e düşen) linkler vardı — artık gerçek sayfalara gidiyor, ayrıca ham `<a href>`'den TanStack `<Link to>`'a çevrildi (SPA navigasyonu için).
>
> **Doğrulama durumu**: `client` → `npx tsc --noEmit` temiz, `npx vite build` başarılı (dist temizlendi). `expert` → `npx vite build` başarılı (route tree yeniden üretildi, doğrulandı), `npx tsc -b` bir `unused import` hatası dışında temizdi (düzeltildi, tekrar çalıştırılıp temiz olduğu teyit edildi), `npm install` başarılı (8 paket kaldırıldı). **Hiçbir değişiklik gerçek bir tarayıcıda tıklanarak test edilmedi** (bu ortamda hâlâ bir tarayıcı otomasyon aracı yok — projenin önceki her turunda da aynı sınırlama not düşülmüş). Özellikle şu akışların bir sonraki oturumda/gerçek cihazda manuel doğrulanması öneriliyor: (1) mobil genişlikte sidebar açıp bir linke tıklayınca otomatik kapandığını, (2) mobil header logosunun artık taşmadığını, (3) client ana sayfasındaki 3 yeni widget'ın gerçek veriyle doğru göründüğünü, (4) expert giriş/kayıt ekranlarında Lunova logosunun göründüğünü ve GitHub/Facebook butonlarının kalmadığını, (5) expert sidebar'ında gerçek kullanıcı adının ("satnaing" değil) göründüğünü.
>
> **Bu turda fark edilen, ele alınmayan follow-up'lar**:
> 1. 🟢 Ne client'ta (sidebar daraltılmış hâli) ne expert'te (favicon) gerçek bir kare/icon-only Lunova mark'ı yok — ikisi de hâlâ TailAdmin/shadcn-admin'in jenerik ikonlarını kullanıyor (`client/public/images/logo/logo-icon.svg` doğrulanmış şekilde Lunova değil; `expert/public/images/favicon*.{png,svg}` de şablonun kendi varsayılanı). Elimizdeki iki PNG (yatay lockup + 1024×1024 dikey lockup) bu kullanım için uygun değil (kırpma/otomatik görsel işleme bu ortamda yapılmadı, kötü sonuç riski). Kullanıcıdan/tasarımcıdan ayrı bir icon-only asset istenmesi öneriliyor.
> 2. 🟢 `client/README.md` ve `expert/README.md` hâlâ orijinal şablon README'leri — bu tur bunlara dokunmadı (bilinçli kapsam dışı bırakma, bu bir "canlı UI" turu, dokümantasyon turu değildi). Aynı gerekçeyle `expert/public/images/shadcn-admin.png` (sadece bu README'den referans edilen, artık her yerde başka hiçbir yerden kullanılmayan ölü bir pazarlama ekran görüntüsü) de dokunulmadan bırakıldı.
> 3. Google OAuth: sadece not düşüldü (`expert/ToDo.md` + kod TODO yorumları), backend'de hiçbir OAuth desteği olmadığı için implement edilmedi — doğru sıralama.

> ## 📜 Daha Eski Turlar (2026-08-19, 6. tur ve öncesi) — arşivlendi
> Kural (e) gereği ("📌 Kalıcı Kural" → Şişmeyi önleme) 6. tur ve öncesinin ayrıntılı prose'u bu dosyadan çıkarıldı — net sonuçları zaten yukarıdaki **"📊 Sistem Durumu Özeti → ✅ Kapatılmış kritik/yüksek öncelikli maddeler"** listesinde tek satırlık özetler olarak duruyor (toast z-index bug'ı [6. tur], CSRF koruması [5. tur], access token refresh [3. tur], profil "beyaz sayfa" zinciri [devam turu], randevu 3-ID karışıklığı + login/me `id`/`role` eksikliği [Randevu Zinciri turu], `AvailabilityExceptionView`/`ExpertAvailability` navigate no-op [4. tur]). Tam ayrıntı (kod örnekleri, curl doğrulama adımları) kayıp değil — `git log -p -- CLAUDE.md` ile bu dosyanın o zamanki hâli her zaman geri getirilebilir (repo artık `git subtree` ile birleşmiş tek bir depo, bkz. aşağıdaki "⚠️ Repo Yapısı" notu).
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-19, 6. tur — Profil Kaydetme "Sessiz Başarısızlık" Bulgusu
> - 2026-08-17, 5. tur — CSRF Koruması Kapatıldı
> - 2026-08-17, 4. tur — Öncelikli Liste Madde 2 ve 3 + Dokümantasyon Konsolidasyonu
> - 2026-08-17, 3. tur — Access Token Refresh Mekanizması
> - 2026-08-17, devam — Profil Düzenleme Zinciri + Yerel Geliştirme Ortamı
> - 2026-08-17 — Randevu Zinciri Düzeltmeleri
>
> </details>

## 📋 Proje Tanımı

**Lunova**, psikologlar (Uzmanlar) ve danışanları bir araya getiren, video görüşme odaklı bir telepsikiyatri/teledanışmanlık platformudur.

- **Amaç**: Uzmanlar ile danışanları randevu sistemi üzerinden bağlayarak online terapi seansları sağlamak
- **Teknoloji Stack**: Django 5.2.4 Backend + 2 ayrı React 19 Frontend + Zoom entegrasyonu + Supabase dosya depolama
- **Veritabanı**: PostgreSQL (Production) / SQLite (Development)
- **Kimlik Doğrulama**: JWT (httpOnly cookie, `djangorestframework_simplejwt`)

## 📊 Sistem Durumu Özeti & Yol Haritası

> Bu bölüm eskiden ayrı bir dosya olan `SYSTEM_REPORT.md`'nin yerine geçiyor (2026-08-17, 4. tur'da buraya taşındı — gerekçe için dosyanın en üstündeki "Kalıcı Kural"a bakın). Ekip için hızlı bir durum özeti + kısa/orta vadeli plan sunar; teknik detay ve kanıt için her zaman ilgili `claude.md` bölümüne/dosyasına bakın. **Bu bölümü güncel tutmak, yeni bir dosya açmaktan daha önemli — her değişiklik turu bunu da gözden geçirmeli.**

```
Backend (Django)         🟢 Sağlam temel; appointments/forms iyi; oturum yönetimi + CSRF koruması artık tamamlandı, curl ile sıkı doğrulandı (6. tur)
Client (danışan, Redux)  🟢 401/refresh otomatik, CSRF token otomatik ekleniyor; profil/randevu form hataları + mobil header/sidebar bug'ları kapatıldı; ana sayfa gerçek widget'larla donatıldı, TailAdmin kalıntıları temizlendi (7. tur)
Expert (uzman, Zustand)  🟢 Randevu/profil zinciri düzeltildi, CSRF token otomatik ekleniyor; Lunova logosu eklendi, Clerk + şablon demo sayfaları tamamen söküldü, üçüncü parti giriş butonları kaldırıldı (7. tur); hata mesajı gösterimi (.title bug) hâlâ yanlış ama React Query hiç kullanılmadığı için şu an pasif risk
Entegrasyon (backend↔fe) 🟢 CSRF koruması aktif ve gerçekçi bir curl zinciriyle sıkı doğrulandı; tek eksik gerçek tarayıcıda tıklanarak test — 7. turdaki UI değişiklikleri de aynı nedenle henüz tarayıcıda tıklanarak doğrulanmadı (bkz. 🟠 aşağıda)
```

### ✅ Kapatılmış kritik/yüksek öncelikli maddeler (2026-08-17 → 2026-08-19 turları)

- Access token refresh mekanizması yoktu → `POST /accounts/token/refresh/` + iki frontend'de otomatik retry (3. tur).
- CSRF koruması hiç aktif değildi → `SameSite=Lax` + gerçek CSRF token doğrulaması (`enforce_csrf`) + iki frontend'de otomatik `X-CSRFToken` header'ı (5. tur, bkz. yukarıdaki changelog — **artık bir sonraki oturumun ilk işi bu değil**).
- Login/`/me/` `role`/`id` döndürmüyordu → ikisi de artık dönüyor (Randevu Zinciri turu).
- Profil kaydı sonrası "beyaz sayfa" / yönlendirmeme zinciri (ProfileView write-serializer bug'ı, `substances_used` null-check, ErrorBoundary yokluğu, expert profil formunda `alert()`+yönlendirmeme, yanlış taxonomy ID eşlemesi) → tamamı düzeltildi (devam turu).
- Randevu talebi/onay/iptal zincirindeki 3-ID karışıklığı ve client'ta iptal aksiyonu eksikliği → düzeltildi (Randevu Zinciri turu).
- `AvailabilityExceptionView.delete()` ve `ExpertAvailability.tsx` navigate no-op → düzeltildi (4. tur).
- Client profil kartlarında (Kimlik/İletişim/Süreç) kaydetme sonrası hiçbir bildirim görünmüyordu, modal kapanmıyordu → kök neden `ToastContainer`'ın `z-50` ile Modal'ın `z-99999` backdrop'ının ARKASINDA render olması → `z-999999`'a çekildi (6. tur, bkz. yukarıdaki changelog).
- Client mobil header logosu ekranı kaplıyordu + mobilde sidebar bir sayfaya geçince kapanmıyordu → ikisi de düzeltildi (7. tur).
- Expert'te hiç Lunova logosu yoktu (giriş ekranları, sidebar) → gerçek logo eklendi; sidebar kullanıcı kutusu hep şablon yazarının bilgilerini ("satnaing") gösteriyordu → gerçek oturum verisine bağlandı (7. tur).
- Her iki frontend'de de kullanılmayan/dekoratif üçüncü parti giriş butonları (expert: GitHub/Facebook) ve Clerk entegrasyonu (hiç aktif değildi) tamamen kaldırıldı; sadece e-posta/şifre girişi kaldı, Google OAuth ileriye dönük TODO olarak not edildi (7. tur).
- Client ana sayfası hâlâ ham TailAdmin e-ticaret dashboard'uydu (sahte metrikler/sipariş tablosu) → gerçek randevu verisiyle çalışan widget'larla (karşılama, yaklaşan randevular, mini takvim) değiştirildi (7. tur).
- İki frontend'de de "gereksiz sayfalar" artık sadece route'tan gizlenmiyor, fiilen silindi (client: Calendar/Blank/Forms/Tables/UiElements/Charts; expert: apps/chats/tasks/users/help-center/sign-in-2/settings alt sayfaları) + iki uygulamada da `/terms`+`/privacy` altyapısı (içeriksiz) kuruldu (7. tur).
- Client'ta ilk girişten sonra ana sayfada scroll çalışmıyordu → kök neden `GlobalSpinner.tsx`'in kalıcı mount'lu olup body overflow'unu hiç resetlememesiydi → `[loading]`'e bağımlı hale getirildi (8. tur).
- Expert'te bekleyen bir randevuyu onaylayınca ayrıca bir detay modalı açılıp "zaten onaylanmış" hatası veriyordu → kök neden event bubbling (buton tıklaması hem onaylıyor hem üstteki satırın `onClick`'ini tetikliyordu) → `stopPropagation()` eklendi (8. tur).
- Client'ta Zoom bağlantısına randevu saatinden çok erken tıklanabiliyordu → 15 dakikalık bir ön koşul eklendi, erken tıklamada uyarı gösteriliyor (8. tur).
- Expert'in "Program" takvimi sadece `confirmed` randevuları gösteriyordu, bekleyen/onay bekleyen randevular takvimde hiç görünmüyordu → tüm iptal-edilmemiş durumlar durum bazlı renkle gösterilecek şekilde genişletildi, client'ın ana sayfa takvimine de bir renk lejantı eklendi (8. tur).
- `expert/ToDo.md`'deki "randevu reddetme 403" ve "`dashboard/api.ts` hardcoded localhost" maddeleri aslında çoktan çözülmüştü, dosyanın kendisi güncellenmemiş kalmıştı (drift) → doğrulanıp `expert/claude.md`'ye taşındı, `ToDo.md` silindi (8. tur, bkz. `expert/claude.md`'nin "🗒️ Ekip Notları" bölümü).

### 🟠 En öncelikli açık madde

**Bu ortamda hâlâ bir tarayıcı otomasyon aracı yok — bu yüzden birikmiş, sadece kod/tsc/build ile doğrulanmış ama hiç tıklanarak test edilmemiş bir dizi değişiklik var.** İki ayrı kategori:
1. **CSRF** — axios'un `withXSRFToken` mekanizması kaynak kodu okunarak, backend tarafı ise gerçekçi bir `curl` zinciriyle (login → `csrftoken` cookie → doğru header'la `200`, header'sız `403`, `CORS_ALLOW_HEADERS`'ta `x-csrftoken` mevcudiyeti) sıkı doğrulandı (6. tur). Client/expert'te login olup bir POST/PATCH/DELETE işlemi deneyip başarılı olduğunu gözlemlemek yeterli; 403 alınırsa DevTools → Network'te `X-CSRFToken` header'ının gerçekten gittiğine bakılmalı.
2. **7. turdaki UI değişiklikleri** — mobil sidebar'ın bir linke tıklayınca otomatik kapanması, mobil header logosunun artık taşmaması, client ana sayfasındaki 3 yeni widget'ın (karşılama/yaklaşan randevular/mini takvim) doğru render olması, expert giriş ekranlarında Lunova logosunun göründüğü ve GitHub/Facebook butonlarının kalktığı, expert sidebar'ında gerçek kullanıcı adının (satnaing değil) göründüğü — hepsi `tsc`/`vite build` ile "derlenir" doğrulandı ama tarayıcıda gözle hiç teyit edilmedi.

Kalan risk her ikisi için de düşük (CSS/JS mantığı statik ve doğrudan; CSRF backend ucu çok sağlam doğrulanmış) ama sıfır değil — bir sonraki oturumda/gerçek bir cihazda kısa bir manuel geçiş (yukarıdaki maddeler + bir POST/PATCH akışı) öneriliyor.

### 🟡 Doğrulanmış, hâlâ açık — önem derecesine göre sıralı

> Önem derecesi ölçeği için "📌 Kalıcı Kural" madde (c)'ye bakın. Aşağıdaki liste 🟠'dan 🟢'ye sıralı.

1. 🟠 **[8. turda teşhis edildi, DÜZELTİLMEDİ — kullanıcı sadece tanı istedi]** `backend/appointments/views.py:273-279` — Development ortamında (`ENVIRONMENT != 'Production'`, yani şu an kullanılan HER ortam) bir randevu onaylandığında gerçek Zoom API'si hiç çağrılmıyor, `zoom_join_url`/`zoom_start_url` alanlarına literal `"mock url"` string'i yazılıyor. Client bunu doğrudan `window.open()` ile açmaya çalıştığında geçersiz bir relative path'e çözümlenip React Router'ın 404 sayfasına düşüyor — yani şu an test edilen HER ortamda "Zoom'a Katıl" akışı %100 kırık. Prod'da gerçek Zoom API'si çağrılacağı için orada sorun yok, ama dev'de ana akışı tamamen engelliyor. Olası düzeltme yönleri (kullanıcı henüz karar vermedi): (a) backend'de mock modda gerçek görünümlü bir placeholder URL kullan (örn. `https://zoom.us/j/000000000`), (b) frontend'de `zoom_join_url`'in `https://` ile başlayıp başlamadığını kontrol edip başlamıyorsa "Zoom bağlantısı henüz hazır değil (dev/mock ortam)" gibi bir uyarı göster, `window.open` hiç çağırma.
2. 🟡 `client/src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub, silme butonu kullanıcıya hiçbir geri bildirim vermeden hiçbir şey yapmıyor.
3. 🟡 `client/src/pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response şekil kontrolsüz `.map()`'e veriliyor (ErrorBoundary artık yakalıyor, kök neden düzeltilmedi).
4. 🟡 `LogoutView`, `access_token`'ı blacklist'e almıyor (sadece `refresh_token`'ı) — logout sonrası eski access token kendi 15 dk'lık ömrü boyunca teorik olarak hâlâ geçerli kalabiliyor. CSRF'le ilgisiz, önceden beri var olan bir tasarım tercihi. **[5. turda bulundu]**
5. 🟡 Rate limiting yok, DRF pagination global tanımlı değil (`available-experts/` gibi sınırsız listelerde risk; `appointments/` zaten tarih aralığıyla sınırlı).
6. 🟡 CI/otomatik test yok (`appointments` hariç hiçbir app'te; frontend'lerde hiç test dosyası yok).
7. 🟢 `expert/lib/handle-server-error.ts`'in `.title`-okuma bug'ı — backend hemen hiç `title` döndürmüyor (`detail`/`error` kullanıyor). **Pasif risk** (React Query'nin `useMutation`/`useQuery`'si projede kullanılmıyor), ama biri ileride bir mutation'ı React Query'ye taşırsa aktifleşir. Düzeltmesi tek satırlık bir `.detail || .error` fallback'i. **Not (6. tur)**: expert'te `client`'takiyle aynı `ToastContainer`/`Modal` z-index kalıbı kullanılıyorsa aynı "toast modalın arkasında gizleniyor" riski orada da olabilir — expert'in kendi Modal/Toast bileşenleri (muhtemelen shadcn/ui tabanlı, farklı implementasyon) hiç incelenmedi.
8. 🟢 `client/src/store/authSlice.ts` → `fetchProfile.rejected`, `userProfile`/`isAuthenticated`'ı temizlemiyor (refresh'in kendisi başarısız olursa eski veri ekranda kalır — pratikte interceptor yönlendirdiği için fark edilmiyor ama düzeltilmedi).
9. 🟢 `client/src/components/UserProfile/UploadDocumentModal.tsx` sonrası `RequireAuth`'un tüm `AppLayout`'u tam ekran spinner'a çevirmesi (rutin foto yüklemesi tüm uygulamayı kısa süreliğine kaybettiriyor).
10. 🟢 **[7. turda büyük ölçüde kapatıldı]** ~~İki frontend de açık kaynak şablon kimliğiyle duruyor~~ — `package.json` `name` alanları (`lunova-client`/`lunova-expert`) ve `@clerk/clerk-react` bağımlılığı düzeltildi/kaldırıldı. **Hâlâ açık kalan tek parça**: `client/README.md` ve `expert/README.md` bilinçli olarak kapsam dışı bırakıldı, hâlâ orijinal şablon README'leri.
11. 🟢 **[7. turda bulundu]** Ne client'ta (sidebar daraltılmış hâli) ne expert'te (favicon) gerçek bir kare/icon-only Lunova logosu yok — ikisi de hâlâ TailAdmin/shadcn-admin'in jenerik varsayılan ikonlarını kullanıyor. Elimizdeki iki PNG asset (yatay lockup + 1024×1024 dikey lockup) doğrudan bu kullanım için uygun değil; kullanıcıdan/tasarımcıdan ayrı bir icon-only asset istenmesi öneriliyor.
12. 🟢 **[7. turda eklendi, içeriksiz — bilinçli]** `/terms` ve `/privacy` sayfaları iki frontend'de de altyapı olarak var ama gerçek Kullanım Şartları/Gizlilik Politikası metni yok — kullanıcı içeriği kendisi ekleyecek.
13. 🟢 `client/store/authReducer.ts` ölü kod (store'a bağlı değil).
14. 🟢 `backend/requirements.txt`'te kullanılmayan/şüpheli `rest-framework-simplejwt==0.0.2` satırı duruyor.
15. 🟢 `FRONTEND_URLS`'teki zorunlu `admin` anahtarının ne için kullanıldığı netleştirilmedi.
16. 🟢 `SIMPLE_JWT` içindeki `AUTH_COOKIE*` anahtarları ölü konfigürasyon (hiçbir yerde okunmuyor, gerçek cookie parametreleri `set_auth_cookies()`'te ayrı) — temizlenebilir. **[5. turda bulundu]**
17. 🟢 `client/src/components/UserProfile/UserSupportCard.tsx` dosyasının içindeki bileşen adı aslında `UserTreatmentCard`; `UserContactCard.tsx` ise `UserProfiles.tsx`'te `UserInfoCard` diye import ediliyor. Üçü de doğru render ediliyor, fonksiyonel bug yok — sadece dosya/bileşen/import-alias adları arasındaki tutarsızlık ileride kod arayan birini yanıltabilir. **[6. turda bulundu]**

### 🚀 Önerilen sıradaki adımlar (öncelik sırasıyla)

1. **CSRF fix'inin VE 7-8. turdaki UI değişikliklerinin gerçek bir tarayıcıda doğrulanması** (yukarıda, 🟠).
2. Zoom mock `zoom_join_url` → 404 sorunu (yukarıdaki "hâlâ açık" listesi, 🟠 madde 1) — kullanıcının hangi düzeltme yönünü seçtiğine karar vermesi bekleniyor.
3. `handle-server-error.ts` `.detail || .error` fallback'i (ucuz, birisi React Query'ye geçerse aktifleşecek riski önler).
4. Yukarıdaki "hâlâ açık" listesindeki 🟡 maddeler: documents delete stub, response şekil kontrolü, logout'ta access token blacklist, rate limiting/pagination, CI/test altyapısı.
5. Kalan şablon temizliği: `client/README.md`/`expert/README.md`'nin Lunova'ya özgü içerikle yeniden yazılması, `client/store/authReducer.ts` ölü kodunun kaldırılması/kararlaştırılması, icon-only bir Lunova logosu sağlanması — yayına çıkmadan önce.
6. `/terms`+`/privacy` sayfalarına gerçek Kullanım Şartları/Gizlilik Politikası içeriğinin eklenmesi (kullanıcı tarafından).
7. Google OAuth ile giriş (client + expert, detay `expert/claude.md`'nin "🗒️ Ekip Notları" bölümünde).
8. Orta vadeli: `available-experts`/takvim uçlarının performansı, hata response formatının backend genelinde tutarlı hale getirilmesi (`detail` standardı).

## ⚠️ Repo Yapısı Hakkında Önemli Not

> **[7. turda düzeltildi — ÖNEMLİ, önceki bilgi artık YANLIŞ]** Bu bölüm önceden "3 ayrı bağımsız git deposu, root git deposu değil" diyordu. Bu turda (2026-08-19) `git status`/`git rev-parse` ile doğrulandı: **artık doğru değil**. Commit geçmişi incelendiğinde (`git log --oneline`), bu oturumdan ÖNCE zaten şu commit'ler atılmış: `e5bbe79 Merge backend repo history via git subtree`, `d834ff7 Merge client repo history via git subtree`, `4abc75f Merge expert repo history via git subtree`, `a0074a4 Root dokümantasyon ve orkestrasyon dosyalarını ekle`. Yani üç alt proje `git subtree` ile kök depoya birleştirilmiş — `backend/.git`, `client/.git`, `expert/.git` artık **hiçbiri yok** (doğrulandı: `[ -e backend/.git ]` vb. hepsi "does not exist" döndü), sadece **tek bir kök `Lunova/.git`** var.

```
Lunova/                 ← GERÇEK, TEK git deposu (kök .git burada)
├── backend/            ← sıradan bir alt klasör (kendi .git'i YOK)
├── client/              ← sıradan bir alt klasör (kendi .git'i YOK)
└── expert/              ← sıradan bir alt klasör (kendi .git'i YOK)
```

Artık `git log`, `git status`, `git diff` gibi komutlar **kökte (`Lunova/`) çalıştırılmalı** — tüm üç projenin değişikliklerini TEK bir çıktıda gösterir (örn. `expert/` içinden `git status` çalıştırmak bile kökteki repoyu bulup `../client/...`, `../backend/...` gibi göreli yollarla TÜM projedeki değişiklikleri listeler, çünkü artık hepsi aynı reponun parçası). Alt klasörlerde ayrı ayrı çalıştırmaya gerek yok/anlamlı değil. Sürüm/branch senkronizasyonu artık otomatik olarak tek bir commit geçmişiyle takip ediliyor (üç proje aynı commit'te birlikte değişebiliyor) — önceki "manuel takip ediliyor, otomatik bağ yok" notu da bu yüzden geçersiz.

## 🏗️ Sistem Mimarisi

```
┌──────────────────────────┐   ┌──────────────────────────┐
│   CLIENT (danışan)       │   │   EXPERT (uzman)         │
│   React 19 + Redux TK    │   │   React 19 + Zustand     │
│   Axios, TailAdmin UI    │   │   TanStack Router/Query  │
│   pkg: "lunova-client"   │   │   shadcn/ui               │
│   (TailAdmin şablonu     │   │   pkg: "lunova-expert"    │
│   üzerine, UI/dosya      │   │   (shadcn-admin şablonu   │
│   yapısı hâlâ şablondan) │   │   üzerine, aynı durum)    │
│   dev port: 5174         │   │   dev port: 5173         │
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

İki frontend de **açık kaynak admin şablonlarının üzerine** kurulmuş. `package.json` `name` alanları (2026-08-19, 7. tur'da `lunova-client`/`lunova-expert`'e çevrildi) ve Clerk bağımlılığı (7. tur'da tamamen kaldırıldı, hiç kullanılmıyordu) artık temiz — **ama şablonların UI/dosya-yapısı kimliği** (bileşen mimarisi, çoğu sayfa iskeleti) hâlâ olduğu gibi duruyor:

- `client/` → [TailAdmin React](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard) şablonu üzerine kurulu
- `expert/` → [shadcn-admin](https://github.com/satnaing/shadcn-admin) şablonu üzerine kurulu

Kalan tek gerçek "kimlik" kalıntısı `client/README.md`/`expert/README.md` — hâlâ orijinal şablon README'leri (bkz. "📊 Sistem Durumu Özeti"ndeki açık maddeler).

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

8. **[DÜZELTİLDİ]** ~~`backend/requirements.txt` UTF-16 kodlamayla kaydedilmiş~~ — Docker altyapısı eklenirken (bkz. "🐳 Docker" bölümü) UTF-8'e çevrildi. Listede gerçek `djangorestframework_simplejwt==5.5.1` yanında anlamsız/muhtemelen yanlışlıkla eklenmiş bir `rest-framework-simplejwt==0.0.2` paketi hâlâ duruyor — bu ayrı, hâlâ açık bir kalem (bkz. "📊 Sistem Durumu Özeti" madde 14).

9. **[DÜZELTİLDİ — 2026-08-19, bu turda `expert/ToDo.md` silinmeden önce doğrulandı]** ~~Randevu reddetme (reject) işlemi expert arayüzünden backend'de 403 Forbidden ile başarısız oluyor; `dashboard/api.ts` hâlâ hardcoded localhost kullanıyor~~ — `expert/ToDo.md`'de "bilinen bug" diye not edilmişti ama ikisi de artık geçersiz (backend'de reject akışı çoktan düzeltilmiş, `dashboard/api.ts` dosyası artık repoda yok) — dosyanın kendisi güncellenmemiş kalmıştı. Detay için `expert/claude.md`'nin "🗒️ Ekip Notları" bölümüne bakın.

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

## 🧭 Geliştirme Fikirleri (canlı liste — bkz. yaşam döngüsü kuralı)

Bu bölüm hata/bug listesi değil, henüz değerlendirilmemiş basit fikir notlarıdır — **ama statik değil**. Yaşam döngüsü ("📌 Kalıcı Kural" madde d'nin özeti): bir fikir gerçekleştirildiğinde madde buradan silinmez, üstü çizilip hangi turda hayata geçtiği not düşülür; bir çalışma sırasında koddan/kullanıcıdan gerçek bir yeni fikir fırsatı fark edilirse (uydurulmuş değil) buraya yeni madde olarak eklenir. **Bu listenin sonsuza kadar aynı 2 maddede donup kalması, bu kuralın uygulanmadığının işaretidir.**

1. **Randevu hatırlatma e-postası.** `backend`'de e-posta gönderme altyapısı zaten çalışıyor (`send_mail`, şifre sıfırlama akışında kullanılıyor — `EMAIL_BACKEND`/`EMAIL_HOST_*` zaten env'de tanımlı). Randevudan belirli bir süre önce (örn. 24 saat ve/veya 1 saat kala) hem danışana hem uzmana otomatik bir hatırlatma e-postası gönderen basit bir zamanlanmış görev (örn. `manage.py` komutu + cron, ya da Celery gibi bir kuyruk) eklenebilir. Var olan altyapı üzerine kurulduğu için görece düşük efor.
2. **Seans sonrası basit değerlendirme (puan + kısa yorum).** `ExpertProfile` modelinde zaten `rating_average`/`rating_count` alanları var (`backend/accounts/models.py`) ama kod taramasında bu alanları dolduran/güncelleyen bir "danışan uzmanı değerlendirir" akışı görülmedi — alanlar şu an sadece salt-okunur görüntüleniyor gibi duruyor, gerçek veri girişi yok. Randevu `completed` (veya benzeri bir durum) olduğunda danışana "bu seansı değerlendir" diye basit bir 1-5 yıldız + opsiyonel kısa yorum formu sunup `rating_average`/`rating_count`'ı güncelleyen bir akış, zaten var olan ama boş duran bir veri modelini tamamlar.

## 📖 Diğer Dosyalar

> **Not**: Bu dosyaların hiçbiri oturum başlangıcında otomatik yüklenmiyor (bkz. "📌 Kalıcı Kural" madde b) — ilgili alana dokunan bir çalışmada önce açıkça `Read` edilmeli.

- [backend/claude.md](backend/claude.md) — Django app detayları, gerçek modeller, README doğrulaması
- [client/claude.md](client/claude.md) — Redux/Axios mimarisi, gerçek dosya ağacı
- [expert/claude.md](expert/claude.md) — Zustand/TanStack mimarisi; `ToDo.md` 8. turda silindi (içeriği "🗒️ Ekip Notları" bölümüne taşındı), `CHANGELOG.md` hâlâ ayrı duruyor

`SYSTEM_REPORT.md` **8. turda kaldırıldı** — içeriği zaten 4. turda yukarıdaki "📊 Sistem Durumu Özeti"ne taşınmıştı, geride sadece yönlendiren bir stub kalmıştı; kök `claude.md` (bu dosya) zaten otomatik yükleniyorken, otomatik yüklenmeyen ayrı bir stub dosyasının hiçbir agentic avantajı yoktu — sadece bir senkronizasyon riski (bkz. "📌 Kalıcı Kural"ın anlattığı orijinal drift hikayesi).

---

**Son Güncelleme**: 2026-08-19, 9. tur (Doküman bakım sistemi revize edildi — önem derecesi ölçeği, son-3-tur kuralı, kök dosyanın tek otomatik yüklenen dosya olduğu netleştirildi, `SYSTEM_REPORT.md` silindi, opt-in `DOC_AUDIT.md` eklendi; `expert/ToDo.md` içeriği doğrulanıp `expert/claude.md`'ye taşındı ve silindi — sadece dokümantasyon, kod değişikliği yok)
**Durum**: Aktif Geliştirme
