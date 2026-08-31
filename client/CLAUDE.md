# Client Frontend (Danışan) - Claude Developer Guide

> Bu dosya `client/src` kaynak kodu ve `package.json` doğrudan okunarak doğrulanmıştır. Önceki taslak; Redux thunk isimlerini, paket versiyonlarını ve `.env` dosyalarının varlığını yanlış tahmin etmişti — burada düzeltildi. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `client/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-28, 26. tur) — Seans Tipi Kataloğu & Fiyatlandırma Motoru: Grup Seansları + İndirim Kodu + Paketler
>
> Kök `claude.md`'nin 32. tur işi (backend detayı `backend/claude.md` 27. tur'da) - 25. turda backend'in SADECE 2 küçük yeri client'a yansımıştı, bu turda kalan her şey (grup seansı akışı, indirim kodu, paketler) client'a bağlandı. Kullanıcı üç somut istek belirtti: ödeme ekranına indirim kodu girişi, katıldığı grup seanslarını/grup arkadaşlarını gösteren bir sayfa, mesajlaşmanın kesinlikle uzman-danışan 1:1 kalması (doğrulandı - `pages/Messages/Messages.tsx` zaten grup kavramı taşımıyor, hiç dokunulmadı).
> - **`pages/Payments/Payments.tsx` GENELLEŞTİRİLDİ**: artık sadece bireysel randevu ödemelerini değil, onaylanmış-ama-ödenmemiş grup seansı katılımlarını da (`GET /api/v1/appointments/group-sessions/mine/`'dan) TEK bir "Bekleyen Ödemeler" listesinde gösteriyor (`kind: 'appointment'|'group'` ayırıcı alanlı bir zarf tipi) - grup satırları "Grup" rozetiyle işaretli. Onay modalına `discount_code` inputu eklendi (SADECE ücretsiz ilk seans DIŞINDaki akışlarda) - hem bireysel hem grup checkout body'sine gidiyor.
> - **Yeni `pages/GroupSessions/GroupSessions.tsx`** (sidebar: "Grup Seansları"): tek sayfa, iki sekme. "Keşfet" - uygun grup seanslarını listeler (kapasiteye göre yeşil/sarı/kırmızı rozet), "Talep Gönder"/"Bekleme Listesine Katıl" butonu, kendi talep durumu varsa onun yerine rozet gösterir. "Grup Seanslarım" - Taleplerim (pending_approval) / Aktif Gruplarım (approved - **grup arkadaşları listesi** + ödendiyse Zoom linki, ödenmediyse "Ödemeyi Tamamla" linkinin `/payments`'a gittiği) / Bekleme Listesi / Geçmiş (rejected). **Plan dokümanının Request.tsx'e bir Bireysel/Grup toggle'ı ekleme önerisinden BİLİNÇLİ SAPMA**: var olan, çalışan bireysel booking akışına (kategori→tarih→uzman→slot state yönetimi) dokunmadan ayrı bir sayfa açmak, riski var olan akışa hiç bulaşmadan izole ediyor.
> - **Yeni `pages/Packages/Packages.tsx`** (düşük öncelik, sidebar: "Paketler") - `GET /payments/packages/` listesi + `POST .../checkout/` (indirim kodu dahil, `Payments.tsx`'in onay modalı deseninin küçük bir kopyası) + `GET .../mine/` ("Paketlerim", kalan hak rozetiyle).
> - **Diğer**: `UserSupportCard.tsx`'e `recovery_status==='in_recovery'` iken "Ex-User Doğrulandı ✓" rozeti eklendi. `UploadDocumentModal.tsx`'e `recovery_proof` seçiliyken kısa bir açıklama metni eklendi (belge tipinin NEDEN var olduğu önceden hiç anlatılmıyordu). `NotificationDropdown.tsx`'e 3 yeni grup bildirimi türü yönlendirmesi eklendi (`group_payment_required`→`/payments`, `group_join_rejected`/`group_waitlist_spot_available`→`/group-sessions`) - katılımcı-spesifik highlight YOK (`Notification.group_session` FK'si katılımcı id'si taşımıyor, sayfa-genel yönlendirme yeterli görüldü). `types/appointment.ts`'e `session_type`/`session_offering` eklendi, yeni `types/groupSession.ts`/`types/package.ts`.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (durum makinesi, kapasite/waitlist mantığı, indirim kodu hesaplaması, paket satın alma) gerçek dev DB'ye karşı 79 kontrolle sıkı doğrulandı (bkz. backend/claude.md 27. tur). **Hiçbiri gerçek bir tarayıcıda açılmadı** - bir sonraki oturumda özellikle grup seansı talep→onay→ödeme zincirinin ve indirim kodu girişinin (geçerli/geçersiz/tekrar kullanım) manuel doğrulanması öneriliyor.

> ## 📜 23. tur — arşivlendi (özet)
>
> Yeni "Ödemeler" sayfası (`pages/Payments/Payments.tsx` + `PaymentResult.tsx`) - iyzico ödeme akışının client tarafı, bekleyen/geçmiş listesi + mock/gerçek mod ayrımı. 26. turda bu sayfa grup seansı ödemelerini de kapsayacak şekilde genelleştirildi (bkz. yukarısı). Net sonuç yukarıdaki "⚠️ Gerçek Eksikler" listesinde duruyor, tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-28, 25. tur) — Seans Tipi Kataloğu & Fiyatlandırma Motoru: Faz 0 (Fiyat Rozeti) + Faz 4 (Belge Tipi)
> Backend'e 26. turda eklenen "Seans Tipi Kataloğu & Fiyatlandırma Motoru"nun (bkz. backend/claude.md, kök claude.md) Faz 0-8'i büyük ölçüde backend-only bir mimari çalışmaydı - client tarafında SADECE planın açıkça istediği iki küçük yer değişti (grup seansı/paket/indirim kodu gibi henüz tasarlanmamış UI'lar bilinçli olarak bu turun kapsamı dışında bırakıldı).
> - **`pages/Appointments/Request.tsx` (Faz 0)**: uzman kartına, backend'in artık `payments.services.get_effective_price()` üzerinden (PricingRule varsa onu, yoksa `ExpertProfile.session_price`'a düşerek) döndürdüğü `session_price`/`session_currency`/`appointment_duration` alanlarını gösteren bir fiyat rozeti eklendi (`{fiyat} {para birimi} / {süre} dk`).
> - **`types/profile.types.ts` (Faz 4)**: `DocumentTypes` union'ına ve `DOCUMENT_TYPE_LABELS`'a `recovery_proof: 'İyileşme Durumu Belgesi'` eklendi - var olan `UploadDocumentModal.tsx`'teki belge tipi dropdown'ı (`DOCUMENT_TYPE_LABELS`'ı otomatik döngüleyen) bu seçeneği KENDİLİĞİNDEN gösteriyor, ayrı bir kod değişikliği gerekmedi. Bu belge admin tarafından onaylanınca backend'de danışanın `recovery_status`'u otomatik "ex-user doğrulandı" olarak işaretleniyor (grup terapisi ex-user-only varyantlarına katılım uygunluğu için, bkz. backend/claude.md Faz 4).
> - **Doğrulama**: `npx tsc -b` temiz. Backend tarafı (fiyat çözümleme katmanı, belge onayının recovery_status'u set etmesi) gerçek dev DB'ye karşı 125 kontrolle sıkı doğrulandı (bkz. backend/claude.md 26. tur). **Bu iki küçük değişiklik de hiç gerçek bir tarayıcıda açılmadı** - sadece `tsc -b` ile doğrulandı.

> ## 📜 22. tur — arşivlendi (özet)
> Belge indirme kaldırılıp yerine expert'teki "Görüntüle" (yeni sekmede aç) deseni getirildi - CORS/blob-fetch karmaşıklığının bir daha hiç gerekmeyeceği bir çözüm. Net sonuç yukarıdaki "⚠️ Gerçek Eksikler" listesinde duruyor, tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-26, 23. tur) — Yeni "Ödemeler" Sayfası: iyzico Ödeme Akışı Entegrasyonu
> Backend'e 22-23. turda eklenen `payments/` app'inin (bkz. backend/claude.md) client tarafı. Kullanıcı: uzman bir seansı onayladığında danışan mail alsın + panelde "ödeme gerekiyor" bildirimi görsün, bildirime tıklayınca ya da yeni bir sidebar sayfasından ilgili seansı seçip ödeme ekranına gidebilsin, ödeme başarılı olunca bir bildirim daha alsın.
> - **Yeni sayfa `pages/Payments/Payments.tsx`**: sidebar'a "Ödemeler" linki eklendi (`DollarLineIcon` - `icons/` barrel'ında zaten vardı, hiç kullanılmıyordu). `GET /api/v1/appointments/` (AppointmentsList.tsx ile AYNI -1ay/+4ay aralığı) çekilip `payment_status` alanına göre "Bekleyen Ödemeler" (`unpaid`, fiyat + "Öde" butonu) ve "Ödeme Geçmişi" (`paid`) olarak ikiye ayrılıyor. `?appointmentId=` (bildirimden gelince) ilgili satırı vurguluyor (`useSearchParams`, `ResetPasswordForm.tsx`'teki AYNI desen). "Öde" butonu `UserDocumentsCard.tsx`'teki delete-confirm modalıyla BİREBİR aynı `useModal`/`Modal` deseninde bir onay modalı açıyor - `POST /api/v1/payments/appointments/{id}/checkout/` yanıtına göre dallanıyor: `mock:true` ise anında başarı toast'ı + liste tazeleme, `payment_page_url` doluysa `window.location.href` ile gerçek iyzico sayfasına yönlendirme.
> - **Yeni sayfa `pages/Payments/PaymentResult.tsx`**: backend'in `checkout_callback`'inin GERÇEK modda (mock'ta hiç ziyaret edilmez, mock akış senkron tamamlanıyor) yönlendirdiği `/payments/result?status=&appointment_id=` sonuç sayfası.
> - **`types/appointment.ts`**: `PaymentStatus` (`not_applicable`/`unpaid`/`paid`) + `Appointment.payment_status`/`session_price`/`session_currency` eklendi. **`types/notification.types.ts`**: `NotificationType`'a `payment_required`/`payment_succeeded` eklendi. **`components/header/NotificationDropdown.tsx`**: `payment_required` için yeni bir dal (`/payments?appointmentId=`) eklendi - `payment_succeeded` var olan genel `appointment_id` fallback'ine (`/appointments/{id}`) düşüyor, ayrı dal gerekmedi.
> - **`App.tsx`**: `/payments` ve `/payments/result` route'ları `RequireAuth`+`AppLayout` altına eklendi.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (payment_status hesaplaması, mail/bildirim dallanması) gerçek dev DB'ye karşı `APIRequestFactory` ile ayrıca doğrulandı (bkz. backend/claude.md). **Bu sayfa hiç gerçek bir tarayıcıda açılmadı** - bir sonraki oturumda özellikle mock ödeme akışının (Öde → onay modalı → anında başarı toast'ı → satırın "Ödeme Geçmişi"ne taşınması) ve bildirim deep-link'inin manuel test edilmesi öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-27, 24. tur) — Ücretsiz İlk Seans: "Devam Et" Onayı + Promosyon Banner'ı
> Kök `claude.md`'nin 30. tur işi (backend detayı orada) - 23. turdaki "Ödemeler" sayfası ücretsiz ilk seansı da bir ödeme gibi anında "Ödendi" olarak gösteriyordu, danışan hiçbir onay adımından geçmiyordu. Kullanıcı bunu ücretli akışla simetrik hale getirmek istedi: danışan Ödemeler sayfasında "Devam Et"e basarak seansı onaylamalı, ayrıca danışan bu hakkı henüz kullanmadıysa ana sayfa/randevu alma akışında bir promosyon banner'ı görmeli.
> - **Yeni `components/common/FreeTrialBanner.tsx`**: kendi başına `GET /api/v1/payments/free-trial-eligibility/` çeker (backend'in bu ucu ayrı tutmasının nedeni: eligibility danışanın TÜM Payment geçmişine bakıyor, `Home.tsx`/`Request.tsx`'in elindeki randevu listesi backend'in zorunlu tuttuğu tarih aralığıyla sınırlı, bu bilgi mevcut veriden türetilemez), `eligible:true` ise "🎁 İlk 15 dakikalık seansınız ücretsiz!" kartı gösterir - `pages/Dashboard/Home.tsx`'te (WelcomeCard ile widget grid'i arası) ve `pages/Appointments/Request.tsx`'te (breadcrumb'dan hemen sonra, seçim akışı boyunca kalıcı) kullanılıyor.
> - **`pages/Payments/Payments.tsx`**: bekleyen satırında `appointment.is_free_trial` ise fiyat yerine "Ücretsiz İlk Seans" `Badge` + buton "Devam Et"; geçmiş satırındaki hand-rolled yeşil `<span>` "Ödendi" pill'i paylaşılan `Badge` bileşenine çevrildi (bu turda ayrıca küçük bir tutarlılık düzeltmesi) ve `is_free_trial` ise "Ücretsiz İlk Seans" (solid) gösteriyor. Onay modalı `is_free_trial` iken farklı metin ("kart bilgisi girmenize gerek yok") + `handleConfirm()` (eski `handlePay()`) `is_free_trial` dalında `POST /api/v1/payments/appointments/{id}/confirm-free-trial/` çağırıyor - 400 dönerse (yarış durumu: hak bu arada başka bir randevuda tüketilmiş) hata toast'ı + `fetchAppointments()` ile otomatik yeniden çekme, satır kendiliğinden "Öde"ye geri dönüyor.
> - **`NotificationDropdown.tsx`**: yeni `free_trial_ready` bildirim türü, var olan `payment_required` dalına eklendi (ikisi de `/payments?appointmentId=`'e gidiyor). **`types/appointment.ts`**: `Appointment.is_free_trial` eklendi. **`types/notification.types.ts`**: `NotificationType`'a `free_trial_ready` eklendi.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (bayrak set edilmesi, `confirm_free_trial()`'ın yarış durumu koruması, bildirim/mail dallanması) gerçek dev DB'ye karşı `APIRequestFactory`/`force_authenticate` ile 28/28 kontrolle sıkı doğrulandı (bkz. backend/claude.md). **Hiçbiri gerçek bir tarayıcıda açılmadı** - bir sonraki oturumda özellikle banner'ların doğru koşulda göründüğünün, "Devam Et" akışının (Payment oluşuyor mu, satır geçmişe taşınıyor mu) ve yarış-durumu hata mesajının manuel doğrulanması öneriliyor.

> ## 📜 21. tur — arşivlendi (özet)
> Sil butonunun onaylanmış bir belgede gri/tıklanamaz durmasına neden olan `doc.status === 'approved'` kısıtlaması `UserDocumentsCard.tsx`'ten kaldırıldı ("silme" geri alınabilir bir deactivate olduğu için geçersiz bir kısıtlamaydı), `is_primary` engeli korundu. Net sonuç `git log -p -- client/CLAUDE.md` ile geri getirilebilir.

> ## 📜 20. tur — arşivlendi (özet)
> Belge indirme CORS hatası (`handleDownload()`'ın Supabase imzalı URL'sini credentialed `api` instance'ıyla çekmesi wildcard-ACAO+credentials çakışmasına yol açıyordu) credential'sız düz `fetch()`'e çevrilerek düzeltildi - bu fonksiyonun kendisi zaten 22. turda tamamen kaldırıldı (indirme yerine görüntüleme deseni). Net sonuç yukarıdaki "⚠️ Gerçek Eksikler" listesinde duruyor, tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-22, 20. tur) — 🐛 Belge İndirme Kırıktı: CORS + Credentialed Cross-Origin İstek Çakışması
> Kullanıcı, danışan panelinde bir belgeyi indirmeye çalışırken gerçek bir tarayıcıda `Access-Control-Allow-Origin: '*' ile kimlik bilgisi desteklenmez` CORS hatası aldığını bildirdi (19. turdaki silme özelliğinin ilk gerçek tarayıcı testi sırasında ortaya çıktı - bu turdan önce indirme hiç gerçek tarayıcıda denenmemişti).
> - **Kök neden**: `UserDocumentsCard.tsx::handleDownload()`, `doc.access_url`'i (backend'in KENDİ API'si DEĞİL, Supabase'in ürettiği tam bir dış imzalı URL - `https://*.supabase.co/storage/v1/object/sign/...?token=...`) paylaşılan `api` axios instance'ı (`lib/api.ts` - `withCredentials:true` + `X-Frontend-Type`/CSRF header'ları) ile çekiyordu. Bu, tarayıcının isteği "credentialed" bir cross-origin istek saymasına yol açıyordu; Supabase Storage ise CORS yanıtında `Access-Control-Allow-Origin: '*'` dönüyor - Fetch/CORS spesifikasyonu gereği bu, credentialed isteklerle birlikte KULLANILAMAZ (spec'e göre wildcard ACAO + credentials kombinasyonu her zaman reddedilir), tarayıcı isteği CORS hatasıyla engelliyordu.
> - **Düzeltme**: `api.get()` yerine düz bir `fetch(url)` kullanıldı - `fetch`'in varsayılan davranışı zaten cross-origin isteklerde cookie GÖNDERMEMEK (`credentials: 'same-origin'` varsayılanı), token zaten URL'nin kendisinde taşındığı için cookie'ye hiç ihtiyaç yok. Ayrıca önceden sadece `console.error` ile sessizce başarısız olan hata durumu artık `useToast` ile kullanıcıya görünür bir hata mesajı da gösteriyor (önceki tur bu dosyaya zaten `useToast`'ı eklemişti, kullanıldı).
> - **Not**: `UserMetaCard.tsx`'teki profil fotoğrafı gösterimi (`<img src={access_url}>`) ve expert'teki "Görüntüle" linki (`<a href={access_url} target='_blank'>`) aynı sorunu YAŞAMIYOR - ikisi de düz tarayıcı navigasyonu/img yüklemesi, XHR/fetch üzerinden `api` instance'ını hiç kullanmıyorlar. Sorun SADECE bu dosyadaki blob-indirme deseniyle sınırlıydı.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz (dist temizlendi). **Gerçek bir tarayıcıda gerçek bir Supabase belgesiyle henüz test edilmedi** - kullanıcının deploy sonrası indirme butonunu tekrar denemesi öneriliyor.

> ## 📜 Daha Eski Turlar (2026-08-22, 19. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor (belge silme [= aktif/pasif deactivate] özelliği eklendi [19. tur], belge onay/red durumu 3 duruma çevrildi + form versiyon numarası gösterimi + `filename` bug'ı düzeltmesi [18. tur], 🔴 kritik danışan belge/profil fotoğrafı yükleme akışı düzeltmesi + `default-avatar.png` sonsuz döngü bug'ı + kullanıcının 7 maddelik UX listesi + testte bulunan 3 ek bug [17. tur], Notlar sistemi seans-bazlı mesaj kotasına + dinamik göstergeye çevrildi [16. tur], "Notlar" uzman-danışan not/mesaj sistemi eklendi [15. tur], global bildirim sistemi eklendi [14. tur], Formlar'daki `yes_no` seçenek kaybı bug'ının gerçek kök nedeni bulunup düzeltildi [13. tur], Formlar: çoklu seçim bug'ı + breadcrumb + gönderim onay/doğrulama modalleri [12. tur], "Formlar" sekmesi eklendi [11. tur], ana sayfa scroll bug'ı + Zoom 15dk kısıtı + takvim rengi lejantı [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + `/terms`+`/privacy` altyapısı [7. tur], toast z-index bug'ı [6. tur], CSRF token desteği [5. tur], ExpertAvailability navigate no-op [4. tur], access token refresh [3. tur], profil düzenleme + ErrorBoundary [devam turu], randevu tip düzeltmesi + iptal aksiyonları [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- client/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-22, 19. tur — Belge Silme (= Aktif/Pasif) Özelliği Eklendi
> - 2026-08-22, 18. tur — Belge Onay/Red Durumu (3 Durumlu) + Form Versiyon Numarası Gösterimi + Bulunan `filename` Bug'ı Düzeltmesi
> - 2026-08-22, 17. tur — 🔴 Kritik: Danışan Belge/Fotoğraf Yükleme Tamamen Bozuktu + Kapsamlı UX Düzeltme Turu
> - 2026-08-20, 16. tur — Notlar: Seans-Bazlı Mesaj Kotası + Dinamik Gösterge
> - 2026-08-20, 15. tur — Yeni Özellik: Notlar (Uzman-Danışan Not/Mesaj Sistemi)
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
│                   ("charts"/"ecommerce" KLASÖRLERİ YOK — 7. turda silindi, aşağıya bakın;
│                    common/FreeTrialBanner.tsx 24. tur, YENİ - Home.tsx VE Request.tsx'in
│                    ikisinde de kullanıldığı için dashboard/ değil common/ altında)
├── context/      → SidebarContext.tsx, ThemeContext.tsx
├── hooks/        → useGoBack.ts, useModal.ts, useToast.ts
├── icons/
├── layout/       → AppHeader, AppLayout, AppSidebar, Backdrop, SidebarWidget
├── lib/          → api.ts (TEK dosya)
├── mappers/      → profileMapper.ts
├── pages/        → Appointments, AuthPages, Dashboard, Forms, GroupSessions (26. tur, YENİ),
│                   Legal, Messages (15. tur, YENİ), OtherPage, Packages (26. tur, YENİ),
│                   Payments (23. tur, YENİ; 26. turda grup ödemelerini de kapsayacak şekilde
│                   genelleştirildi), UserProfiles
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
7. ✅ **[DÜZELTİLDİ — 2026-08-22, 19. tur]** ~~`components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub (`console.log`), silme butonu görünüşte çalışıyor ama hiçbir şey yapmıyor; `useToast` bu dosyada hiç kullanılmıyor (kardeş kartlardan farklı)~~ — artık gerçekten `DELETE /accounts/documents/{uid}/` çağırıyor (backend'de gerçek bir silme değil, `is_current` aktif/pasif anahtarı - bkz. backend/claude.md 18. tur), bir onay modalı + `useToast` eklendi. **[18. turda AYRICA bulunan, ilgisiz bir bug 18. turda düzeltildi]** ~~aynı dosyadaki `doc.filename` alanı backend'in gerçek alanıyla (`original_filename`) hiç eşleşmiyordu~~ — düzeltildi.
8. ✅ **[DÜZELTİLDİ — 2026-08-17, 4. tur]** ~~`pages/Appointments/ExpertAvailability.tsx:296` → `AppointmentForm`'a `navigate={() => {}}` (no-op) geçiyor~~ — artık gerçek `useNavigate()` geçiliyor. Detay için yukarıdaki "4. tur" changelog girişine bakın. **Not**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı, sadece `tsc` + kod-yolu incelemesiyle.
9. **[2026-08-17'de bulundu, düşük öncelik]** `pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response'u şekil kontrolsüz `.map()`'e veriliyor (yeni eklenen `ErrorBoundary` bunu artık yakalıyor, ama kök neden düzeltilmedi).
10. ✅ **[DÜZELTİLDİ — 2026-08-22, 17. tur]** ~~`components/UserProfile/UploadDocumentModal.tsx`, fotoğraf yükleme sonrası `dispatch(fetchMe())` → `App.tsx`'teki `RequireAuth` tüm `AppLayout`'u (overlay değil, tam replace) `GlobalSpinner` ile değiştiriyor.~~ — `fetchMe()` artık sadece `documentType === 'profile_photo'` iken tetikleniyor, diğer belge tiplerinde bu tam ekran flaş'ı hiç oluşmuyor. Detay için yukarıdaki "17. tur" changelog girişine bakın.
11. **[7. turda bulundu]** Sidebar daraltılmış hâlde gösterilen `public/images/logo/logo-icon.svg` gerçek bir Lunova ikonu değil, TailAdmin'in jenerik placeholder'ı — elimizdeki iki PNG (yatay/dikey lockup) bu kullanım için uygun değil, ayrı bir icon-only asset gerekiyor.
12. **[7. turda bilinçli olarak kapsam dışı bırakıldı]** `README.md` hâlâ orijinal TailAdmin şablon README'si (yukarıda detaylı) — bu tur "canlı UI" turuydu, dokümantasyon turu değil.
13. **[7. turda eklendi, içeriksiz]** `pages/Legal/{TermsOfService,PrivacyPolicy}.tsx` sadece altyapı — gerçek Kullanım Şartları/Gizlilik Politikası metni kullanıcı tarafından eklenecek.
14. **[15. turda eklendi, 16. turda genişledi]** `pages/Messages/Messages.tsx` hiç tarayıcıda açılmadı — mesaj balonlarının, kalan hak sayacının/info modalının, hak tükenince kırmızı border+disable durumunun, 200 karakter limitinin, "yeni not" bildiriminden `/messages`'a yönlendirmenin ve sayfa yenilendiğinde localStorage taslağının geri geldiğinin manuel doğrulanması öneriliyor.
15. **[18. turda eklendi]** Belge onay/red rozeti (3 durumlu) + form versiyon numarası köşe yazıları + `document_status` bildirim yönlendirmesi hiç tarayıcıda açılmadı — sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (durum senkronu, bildirim üretimi) gerçek bir DB kopyasında ve gerçek bir admin HTTP isteğiyle sıkı doğrulandı (bkz. backend/claude.md), bir sonraki oturumda admin panelinden bir belgenin reddedilip client'ta kırmızı rozetin doğru göründüğünün manuel teyidi öneriliyor.
16. **[19. turda eklendi]** Belge silme (onay modalı, disabled+tooltip mantığı, başarılı silme sonrası liste tazelemesi) hiç tarayıcıda açılmadı — sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (deactivate mantığı, hata response şekli) gerçek bir DB kopyasında `APIRequestFactory` ile doğrulandı (bkz. backend/claude.md).
17. ✅ **[20. turda düzeltilen bug, 22. turda SÜPERSEDE edildi]** ~~Belge indirme (`handleDownload`) CORS hatası düzeltmesi~~ — bu fonksiyonun kendisi 22. turda tamamen kaldırıldı, indirme yerine görüntüleme (yeni sekmede aç) desenine geçildi, bkz. madde 19. Artık test edilecek bir "indirme" akışı yok.
18. **[21. turda eklendi]** Onaylanmış bir belgenin artık silinebildiği (disabled durumdan çıkan buton) gerçek bir tarayıcıda henüz test edilmedi - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı gerçek bir DB kopyasında `APIRequestFactory` ile doğrulandı (bkz. backend/claude.md).
19. **[22. turda eklendi]** Belge "Görüntüle" linkinin (eski indirme butonunun yerine geçen) gerçekten yeni sekmede açıp PNG/JPG/PDF'i doğru gösterdiği gerçek bir tarayıcıda henüz test edilmedi - sadece `tsc -b`/`vite build` ile doğrulandı.
20. **[23. turda eklendi]** Yeni "Ödemeler" sayfası (bekleyen/geçmiş listesi, onay modalı, mock-başarı toast'ı, `payment_page_url`'e redirect, `/payments/result` sayfası, bildirim deep-link'i) hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (payment_status hesaplaması, mail/bildirim dallanması) gerçek dev DB'ye karşı `APIRequestFactory` ile sıkı doğrulandı (bkz. backend/claude.md). Gerçek iyzico sandbox key'i henüz yok - `payment_page_url`'e gerçek yönlendirme hiç denenmedi, sadece mock mod (anında başarı).
21. **[24. turda eklendi]** Ücretsiz ilk seans "Devam Et" onay akışı (Payments.tsx'teki rozet/buton dallanması, onay modalının farklı metni, `confirm-free-trial` çağrısı, yarış-durumu hata toast'ı + otomatik yeniden-çekme) ve iki yeni `FreeTrialBanner.tsx` yerleşimi (Home.tsx, Request.tsx) hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (bayrak set edilmesi, `confirm_free_trial()`'ın yarış durumu koruması) gerçek dev DB'ye karşı `APIRequestFactory` ile 28/28 kontrolle sıkı doğrulandı (bkz. backend/claude.md).
22. **[25. turda eklendi]** Randevu alma ekranındaki yeni fiyat rozeti (`Request.tsx`) ve belge yükleme dropdown'ındaki yeni "İyileşme Durumu Belgesi" seçeneği hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b` ile doğrulandı. Backend tarafı (fiyat çözümleme katmanı, PricingRule/recovery_status) gerçek dev DB'ye karşı 125 kontrolle sıkı doğrulandı (bkz. backend/claude.md 26. tur).
23. **[26. turda eklendi]** Genelleşen "Ödemeler" sayfası (indirim kodu inputu, grup+bireysel birleşik liste), yeni "Grup Seansları" sayfası (Keşfet/Grup Seanslarım sekmeleri, grup arkadaşları listesi) ve yeni "Paketler" sayfası hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (durum makinesi, kapasite/waitlist mantığı, indirim kodu hesaplaması) gerçek dev DB'ye karşı 79 kontrolle sıkı doğrulandı (bkz. backend/claude.md 27. tur).

---
**Son Güncelleme**: 2026-08-28, 26. tur (Backend'e eklenen "Seans Tipi Kataloğu & Fiyatlandırma Motoru"nun [Faz 0-8, bkz. backend/claude.md] geri kalanı client'a bağlandı: `Payments.tsx` genelleştirildi [bireysel+grup ödemeleri TEK listede, indirim kodu inputu], yeni `pages/GroupSessions/GroupSessions.tsx` [Keşfet+Grup Seanslarım, grup arkadaşları dahil] ve `pages/Packages/Packages.tsx` sidebar'a eklendi, ex-user rozeti + belge açıklama metni eklendi. `tsc -b`+`vite build` temiz, backend tarafı gerçek dev DB'ye karşı 79 kontrolle doğrulandı [bkz. backend/claude.md 27. tur], gerçek tarayıcıda henüz test edilmedi)
