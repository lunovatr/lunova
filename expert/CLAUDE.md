# Expert Frontend (Uzman) - Claude Developer Guide

> Bu dosya `expert/src` kaynak kodu, `package.json`, ve projenin **kendi** `ToDo.md`/`CHANGELOG.md` dosyaları okunarak doğrulanmıştır. Önceki taslak dizin ağacının önemli bir kısmını (`pages/`, `types/`, `components/shared/` gibi klasörleri) icat etmişti — burada gerçek ağaç var. Genel sistem bilgisi için kök [claude.md](../claude.md)'ye bakın (dokümantasyon bakım kuralları da orada — kısaca: `expert/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-28, 23. tur) — Yeni "Grup Seansları" Paneli + Randevu Tablosuna Seans Tipi/Net Kazanç Gösterimi
>
> Kök `claude.md`'nin 32. tur işi (backend detayı `backend/claude.md` 27. tur'da) - kullanıcı "uzman panelindeki ilgili seans tiplerini, onay/red mekanizmalarını ve grup içerisindeki danışanları, tarihleri vs. uygun biçimde görüntüle" istedi. Backend'de 27. turda kurulan "müsaitlik→talep→onay→ödeme" durum makinesinin (`GroupSessionParticipant.status`) uzman tarafı.
> - **Yeni `features/groups/`** (`reservations/`'ın dosya yapısı BİREBİR taklit edildi - `api.ts`, `index.tsx`, `components/`) + `/groups` route (`routes/_authenticated/groups.tsx`, `reservations.tsx`'teki `appointmentId` arama şeması deseni - `groupSessionId` ile) + sidebar linki ("Grup Seansları", `Users` ikonu, Müsaitlik'in altında).
> - **`create-group-modal.tsx`**: grup seansı oluşturma formu - `create-appointment-modal.tsx`'in aksine react-hook-form/zod KULLANMADI (alanlar basit select/input'lar, ağırlığa gerek yoktu) - session_offering (`GET /catalog/session-offerings/?group=true`'dan, sadece requires_multi_participant=True olanlar), varyant (seçilen offering'e göre dinamik, opsiyonel), session_type (`GET /accounts/session-types/`'dan, opsiyonel), tarih/saat/süre/kapasite. **Plan dokümanının `maps.ts::SESSION_TYPES` hardcoded map'ini yeniden kullanma önerisinden BİLİNÇLİ SAPMA**: gerçek bir `accounts/session-types/` ucu backend'de bu turda açıldığı için GERÇEK veri kullanıldı - hardcoded ID eşlemesi projede daha önce (`APPROACH_METHODS`, bkz. aşağıdaki "🗒️ Ekip Notları"/"⚠️ Gerçek Eksikler" madde 10) DB ID drift'i yüzünden sessizce yanlış veri kaydına yol açmıştı, aynı riski burada tekrarlamamak için tercih edildi.
> - **`groups-table.tsx`**: grup listesi - seans tipi/varyant, tarih/saat, doluluk rozeti (approved/capacity, renk: yeşil→sarı→kırmızı), bekleyen talep sayısı rozeti, durum. **`group-detail-dialog.tsx`**: grup detayı + 3 bölüm - Bekleyen Talepler (her biri için `appointments-table.tsx`'teki AYNI ikili Onayla/Reddet buton deseni, `client_recovery_status==='in_recovery'` iken "Ex-User Doğrulandı" rozeti - ex-user-only bir grubu inceleyen uzman danışanın uygunluğunu görebiliyor), Onaylanmış Katılımcılar (isim + ödeme durumu rozeti), Reddedilenler + grubu iptal etme butonu (`PATCH .../<id>/` ile `status=cancelled`).
> - **`features/reservations/api.ts::Appointment`**: `session_type`/`session_type_name`/`session_offering`/`session_offering_name`/`expert_earning` eklendi (backend'in `AppointmentSerializer`'ına 27. turda eklenen alanlar). **`appointments-table.tsx`/`appointment-detail-dialog.tsx`**: durum rozetinin yanına seans tipi/teslimat şekli rozeti eklendi; detay dialog'undaki "Ödeme:" satırına, `payment_status==='paid'` VE `expert_earning` doluysa "(net kazancınız: X TRY)" eki eklendi (danışan tarafında böyle bir bilgi gösterilmiyor - backend'de gated).
> - **`features/notifications/api.ts`**: `NotificationType`'a `group_join_requested` eklendi (`group_session_id` taşıyor). **`notification-dropdown.tsx`**: bu türü `/groups?groupSessionId=...`'e yönlendiriyor (`reservations`'ın `appointmentId` deseninin aynısı).
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz (yeni `/groups` route'u nedeniyle TanStack Router'ın `routeTree.gen.ts`'inin güncel kalması için ÖNCE `vite build` çalıştırılıp route tree yeniden üretildi, SONRA `tsc -b` çalıştırıldı - sıralama önemli, tersi stale route tree tip hatası verir). Backend tarafı (durum makinesi, kapasite/onay/red mantığı, `expert_earning` gating) gerçek dev DB'ye karşı 60 yeni kontrolle sıkı doğrulandı (bkz. backend/claude.md 27. tur). **Hiçbiri gerçek bir tarayıcıda açılmadı** - bir sonraki oturumda özellikle grup oluşturma formunun, Onayla/Reddet butonlarının ve doluluk rozetinin doğru renklerde göründüğünün manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-28, 22. tur) — "Seans Türleri" Profil Alanı Kaldırıldı (Mimari Düzeltme)
> Backend'e eklenen "Seans Tipi Kataloğu & Fiyatlandırma Motoru"nun (Faz 0-8, bkz. backend/claude.md 26. tur) Faz 1'i, kullanıcı geri bildirimiyle bir mimari düzeltme içeriyordu: teslimat şekli (Online/Yüz Yüze/Karma) uzmanın SABİT bir profil niteliği değil, HER SEANSIN kendi özelliği - bu yüzden `ExpertProfile.session_types` (backend M2M alanı) tamamen kaldırılıp `Appointment.session_type`'a taşındı. Expert tarafında bu alanı gösteren/düzenleyen TEK yer profil formuydu.
> - **`features/profile/profile-form.tsx`**: "Seans Tipleri" checkbox grubu (`FormField name='session_types'`, `SESSION_TYPES` sabitini döngüleyen) TAMAMEN kaldırıldı - zod şemasından, `defaultValues`'tan, backend'den gelen veriyi forma eşleyen `useEffect`'ten ve submit handler'ın backend'e giden payload'ı oluşturan mapping'inden. Artık kullanılmayan `SESSION_TYPES` import'u da temizlendi.
> - **`features/profile/profile-view.tsx`**: profil görüntüleme kartındaki "Seans Tipleri" `Badge` listesi bölümü kaldırıldı.
> - **`features/profile/types.ts`**: `ExpertProfile.session_types`/`ExpertProfileUpdatePayload.session_types` alanları kaldırıldı.
> - **`features/profile/maps.ts`**: `SESSION_TYPES`/`getSessionTypeNames` BİLİNÇLİ OLARAK dokunulmadı - `accounts.SessionType` modeli (Online/Yüz Yüze/Karma listesi) hâlâ var, artık `Appointment`'tan referans alınıyor; bu taksonomi ileride randevu detayında gösterilmek istenirse hazır bekliyor (şu an hiçbir yerden kullanılmıyor, ama zararsız - gerçek bir model karşılığı var).
> - **Doğrulama**: `npx tsc -b` temiz. Backend tarafı (M2M alanının kaldırılması, `ExpertProfileUpdateSerializer`'ın artık `session_types` gönderilirse 400 döndürmesi) gerçek dev DB'ye karşı 13 kontrolle doğrulandı (bkz. backend/claude.md 26. tur, Faz 0+1). **Profil formunun/görüntüleme sayfasının güncellenmiş hâli hiç gerçek bir tarayıcıda açılmadı** - sadece `tsc -b` ile doğrulandı.

> ## 📜 21. tur — arşivlendi (özet)
> Randevu tablosu/detay dialog'undaki ödeme rozeti artık `is_free_trial`'a göre "Ücretsiz İlk Seans"/"Ücretsiz Seans Onayı Bekleniyor" metnini ayırt ediyor (`paymentBadgeLabel()` yardımcı fonksiyonu, `PAYMENT_STATUS_LABELS`'ın yerine). Net sonuç `git log -p -- expert/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-27, 21. tur) — Ödeme Rozeti Artık Ücretsiz İlk Seansı Ayırt Ediyor
> Kök `claude.md`'nin 30. tur işi (backend detayı orada) - 20. turda eklenen "Ödeme" rozeti `payment_status` (paid/unpaid) dışında bir bilgi taşımıyordu, uzman ücretli bir seansla danışanın ücretsiz ilk seans hakkını kullandığı bir seansı ayırt edemiyordu. Backend'e eklenen `Appointment.is_free_trial` alanı bunu çözüyor.
> - **`features/reservations/api.ts::Appointment`**: `is_free_trial?: boolean` eklendi.
> - **`appointments-table.tsx`** ve **`appointment-detail-dialog.tsx`**: sabit `PAYMENT_STATUS_LABELS` lookup'ı yerine `is_free_trial`'a bakan bir `paymentBadgeLabel()` yardımcı fonksiyonu (renk/`paymentStatusVariant()` değişmedi, sadece metin) - proje konvansiyonu gereği iki dosyada da kopyalı (bkz. aşağıdaki "🗒️ Ekip Notları"ndaki genel mimari not). "paid"+free_trial → "Ücretsiz İlk Seans", "unpaid"+free_trial → "Ücretsiz Seans Onayı Bekleniyor" (uzman, danışanın ödeme değil onay beklediğini anlıyor). Detail dialog'daki fiyat parantezi artık `is_free_trial` iken gösterilmiyor (yanıltıcı olurdu - ücretsiz seansın "fiyatı" göstermenin bir anlamı yok).
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (`is_free_trial` set edilmesi, `AppointmentSerializer`'da read-only olması) gerçek dev DB'ye karşı `APIRequestFactory` ile 28/28 kontrolle sıkı doğrulandı (bkz. backend/claude.md). **Rozetin yeni metin varyantları hiç gerçek bir tarayıcıda açılmadı** - sadece `tsc -b`/`vite build` ile doğrulandı.

> ## 📜 18. tur — arşivlendi (özet)
> Danışan panelinin yanı sıra uzman panelinde de belge silme özelliği eklendi (gerçek DELETE değil, aktif/pasif) - önceden var ama hiçbir UI'ya bağlı olmayan `deleteDocument()` fonksiyonu kullanılır hale getirildi, `handleApiError`'daki bir dizi-hatası bug'ı ayrıca düzeltildi. Net sonuç yukarıdaki "⚠️ Gerçek Eksikler" listesinde duruyor, tam ayrıntı `git log -p -- expert/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-26, 20. tur) — Randevu Tablosuna/Detay Dialog'una Ödeme Durumu Rozeti
> Backend'e eklenen `payments/` app'inin (bkz. backend/claude.md 22-23. tur) uzman tarafı - kullanıcı "uzman panelinde ilgili seans için ödeme yapıldı yapılmadı bilgisi de gözüksün" istedi.
> - **`features/reservations/api.ts::Appointment`**: `payment_status` (`not_applicable`/`unpaid`/`paid`) + `session_price`/`session_currency` eklendi - backend'in `AppointmentSerializer`'ına aynı turda eklenen 3 alan.
> - **`features/reservations/components/appointments-table.tsx`** (yeni "Ödeme" kolonu) ve **`appointment-detail-dialog.tsx`** (yeni "Ödeme:" satırı, tutar bilgisiyle): ikisinde de zaten var olan `STATUS_LABELS`/`statusVariant()` deseni BİREBİR taklit edilerek bir `PAYMENT_STATUS_LABELS`/`paymentStatusVariant()` çifti eklendi - projenin bu iki dosya arasında zaten tolere ettiği duplikasyon deseniyle tutarlı (bkz. aşağıdaki "⚠️ Gerçek Eksikler" madde 3'teki genel mimari not), yeni bir paylaşılan modül icat edilmedi. `PendingAppointments`'a (üçüncü randevu-gösterme yüzeyi) BİLİNÇLİ OLARAK dokunulmadı - orada sadece `pending`/`waiting_approval` durumundaki randevular gösteriliyor, `payment_status` bunlar için her zaman `not_applicable` olacağından gösterilecek bir şey yok.
> - **`features/notifications/api.ts`**: `NotificationType`'a `payment_succeeded` eklendi - `notification-dropdown.tsx`'in navigasyon mantığına DOKUNULMADI, zaten var olan genel `appointment_id` fallback dalı (`/reservations?appointmentId=...`) bu türü de doğru şekilde karşılıyor.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (payment_status hesaplaması) gerçek dev DB'ye karşı `APIRequestFactory` ile ayrıca doğrulandı (bkz. backend/claude.md). **Rozet hiç gerçek bir tarayıcıda açılmadı** - bir sonraki oturumda hem tabloda hem detay dialog'unda doğru rengin/metnin göründüğünün manuel teyidi öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-22, 19. tur) — Onaylanmış Belgeler Artık Silinebiliyor (Deactivate)
> Kullanıcı, danışan panelinde sil butonunun onaylanmış bir belgede gri/tıklanamaz durduğunu fark edip bunun mantıklı olup olmadığını sordu (bkz. `client/claude.md` 21. tur). Netleştirme sonrası: silme artık geri alınabilir bir deactivate olduğu için (dosya storage'da kalıyor, admin görebiliyor/geri aktifleştirebiliyor), onaylanmış belge için de kısıtlama kaldırıldı - uzman tarafı için de aynı değişiklik uygulandı.
> - **`profile-view.tsx`**: `deleteBlockedReason` hesaplamasından `doc.status === 'approved'` dalı çıkarıldı - artık sadece `is_primary` kontrolü kalıyor. Backend tarafı: `backend/claude.md` 19. tur.
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz. Backend tarafı (`status==APPROVED` engelinin kaldırılması, `is_primary` engelinin korunduğu) gerçek bir DB kopyasında `APIRequestFactory` ile doğrulandı. **Bu turdaki expert değişikliği gerçek bir tarayıcıda tıklanarak henüz test edilmedi.**

> ## 📜 17. tur — arşivlendi (özet)
> Belge onay/red durumu 3 duruma çevrildi (`DOCUMENT_STATUS_LABEL` + renkli `Badge`) + form versiyon numarası gösterimi + bildirimlere `document_status` türü eklendi. Net sonuç yukarıdaki "⚠️ Gerçek Eksikler" listesinde duruyor, tam ayrıntı `git log -p -- expert/CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-22, 17. tur) — Belge Onay/Red Durumu (3 Durumlu) + Form Versiyon Numarası Gösterimi
> Kök `claude.md`'nin 20. tur'unda backend'e eklenen belge onay/red akışının (bkz. `backend/claude.md` 17. tur) ve form versiyon görünürlüğünün expert tarafı. Backend artık `Document.status` (`pending`/`approved`/`rejected`) döndürüyor - önceden expert de sadece `verified` boolean'ını okuyordu, "reddedildi" diye bir kavram YOKTU. Uzmanlar kendi belgelerini (diploma/CV/onam formu) yüklediği için bu akışın hem alıcısı hem `client-forms` üzerinden danışan verisini görüntüleyen tarafı.
> - **`features/profile/maps.ts`**: yeni `DocumentReviewStatus` tipi + `DOCUMENT_STATUS_LABEL` sabiti (client'taki `DOCUMENT_STATUS_LABELS` ile aynı 3 değer). **`features/profile/types.ts`**: `ProfileDocument`'a `status` eklendi (`original_filename` burada zaten doğruydu - client'taki `filename` yanlış-adlandırma bug'ı expert'te hiç yoktu).
> - **`features/profile/profile-view.tsx`**: "Belgeler" kartındaki her satıra artık dosya adının yanında bir `Badge` (approved→`default`/yeşilimsi, rejected→`destructive`/kırmızı, pending→`secondary`/gri) ekleniyor; önceki düz metin (`✓ Doğrulandı`/`Doğrulanmadı`) tamamen kaldırıldı.
> - **Form versiyon numarası**: `features/client-forms/types.ts`'teki `FormResponseSummary.form`/`FormResponseDetail.form` tiplerine `version: number` eklendi (backend `FormMinimalSerializer`/`FormListSerializer`'a bu turda eklendi, bkz. `backend/claude.md`). `features/client-forms/components/response-detail-dialog.tsx`'in `DialogTitle`'ına form başlığının yanına küçük, soluk `v{version}` yazısı eklendi - uzman bir danışanın cevabını incelerken hangi versiyonun doldurulduğunu görebiliyor.
> - **Bildirimler**: `features/notifications/api.ts`'teki `NotificationType`'a `"document_status"` eklendi. `components/notification-dropdown.tsx`'in click handler'ı bu türde sabit olarak `/profile`'a yönlendiriyor (belge her zaman uzmanın KENDİ belgesi, `message`/`appointment_reminder`'ın aksine ek bir id taşımıyor).
> - **Doğrulama**: `npx tsc -b` + `npx vite build` temiz (dist temizlendi, `messages`/`client-forms` chunk'larının doğru güncellendiği görüldü). Backend tarafı (`review_document()`, admin `save_model()` bug'ı ve düzeltmesi, bildirim üretimi) gerçek bir DB kopyasında Django shell + gerçek bir admin HTTP isteğiyle doğrulandı (bkz. `backend/claude.md`). **Bu turdaki expert değişiklikleri gerçek bir tarayıcıda tıklanarak henüz test edilmedi.**

> ## 📜 Daha Eski Turlar (2026-08-22, 16. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Gerçek Eksikler" listesinde ✅ maddeleri olarak duruyor (🟠 Netlify SPA yönlendirme eksikliği [`_redirects`] düzeltildi [16. tur], Notlar'da danışan kotasının roster'da/panelde gösterilmesi [15. tur], "Notlar" uzman-danışan not/mesaj sistemi eklendi [14. tur], 🔴 kritik `client_id` çakışma bug'ı [backend'de, matrisi test ederken bulundu] + Danışan Formları matris görünümü [13. tur], global bildirim sistemi eklendi [12. tur], yeni "Danışan Formları" özelliği [11. tur], randevu onaylama çift-modal bug'ı + program takviminde durum renklendirmesi [8. tur], Lunova logosu + şablon/Clerk temizliği + üçüncü parti giriş kaldırıldı [7. tur], CSRF token desteği [5. tur], access token refresh [3. tur], profil düzenleme + taxonomy ID düzeltmesi [devam turu], `useAuthStore().user.id` eksikliği + randevu zinciri [initial turu]). **Not (11. turda yeniden doğrulandı, eski iddia YANLIŞ çıktı)**: "devam"/"Randevu Zinciri" turlarındaki "`ClientProfile.expert` hiçbir yerde otomatik set edilmiyor, `GET /accounts/clients/` boş döner" notu Django shell'de gerçek DB sorgulanarak yeniden kontrol edildi — **artık (belki hiç) doğru değil**: 80 danışandan 62'sinin gerçekten atanmış bir uzmanı var. Tam ayrıntı `git log -p -- expert/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-22, 16. tur — 🟠 Netlify SPA Yönlendirme Eksikliği Düzeltildi
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 15. tur — Notlar: Danışan Kotasının Roster'da/Panelde Gösterilmesi
> - 2026-08-20, 14. tur — Yeni Özellik: Notlar (Uzman-Danışan Not/Mesaj Sistemi)
> - 2026-08-20, 13. tur — Danışan Formları: Dropdown Yerine Matris Görünümü + 🔴 Kritik Backend Bug Düzeltmesi
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
├── features/      → auth, availability, client-forms, dashboard, errors, groups (23. tur, YENİ -
│                    grup seansı oluşturma/onay paneli, reservations'ın dosya yapısı taklit edildi),
│                    legal, messages
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
14. **[17. turda eklendi]** Belge onay/red `Badge`'i (3 durumlu) + form response dialog'undaki versiyon yazısı + `document_status` bildirim yönlendirmesi hiç tarayıcıda açılmadı — sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı gerçek bir DB kopyasında ve gerçek bir admin HTTP isteğiyle sıkı doğrulandı (bkz. backend/claude.md).
15. **[18. turda eklendi]** Belge silme butonu (onay dialog'u, disabled+tooltip mantığı, silme sonrası liste tazelemesi) hiç tarayıcıda açılmadı — sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (deactivate mantığı, hata response şekli) gerçek bir DB kopyasında `APIRequestFactory` ile doğrulandı.
16. **[19. turda eklendi]** Onaylanmış bir belgenin artık silinebildiği (disabled durumdan çıkan buton) gerçek bir tarayıcıda henüz test edilmedi - sadece `tsc -b`/`vite build` ile doğrulandı.
17. **[20. turda eklendi]** Randevu tablosu + detay dialog'undaki yeni "Ödeme" rozeti hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (`payment_status` hesaplaması) gerçek dev DB'ye karşı `APIRequestFactory` ile sıkı doğrulandı (bkz. backend/claude.md).
18. **[21. turda eklendi]** Ödeme rozetinin `is_free_trial`'a göre ayırt edici yeni metin varyantları ("Ücretsiz İlk Seans"/"Ücretsiz Seans Onayı Bekleniyor") hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (`is_free_trial` alanının set edilmesi/read-only olması) gerçek dev DB'ye karşı `APIRequestFactory` ile 28/28 kontrolle sıkı doğrulandı (bkz. backend/claude.md).
19. **[22. turda eklendi]** Profil formundan/görüntüleme sayfasından "Seans Tipleri" bölümünün kaldırılması hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b` ile doğrulandı. Backend tarafı (`ExpertProfile.session_types` M2M'inin kaldırılması, serializer'ın artık bu alanı reddetmesi) gerçek dev DB'ye karşı 13 kontrolle doğrulandı (bkz. backend/claude.md 26. tur).
20. **[23. turda eklendi]** Yeni "Grup Seansları" paneli (oluşturma formu, grup listesi doluluk rozeti, Onayla/Reddet, ex-user rozeti) + randevu tablosu/detay dialog'undaki yeni seans tipi rozeti + net kazanç gösterimi hiç gerçek bir tarayıcıda açılmadı - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (durum makinesi, kapasite/onay/red mantığı) gerçek dev DB'ye karşı 60 kontrolle sıkı doğrulandı (bkz. backend/claude.md 27. tur).
21. **[24. tur, Sağlık Kontrolü] `group-detail-dialog.tsx`'e eklenen owner-gated "Bekleme Listesi" bölümü hiç gerçek bir tarayıcıda açılmadı** - sadece `tsc -b`/`vite build` ile doğrulandı. Backend tarafı (`GroupSessionSerializer.waitlist`, FIFO sıra numarası) gerçek dev DB'ye karşı doğrulandı (bkz. backend/claude.md 28. tur). `create-group-modal.tsx`'e eklenen kapasite<2 client-side guard'ı da aynı şekilde sadece derleme kontrolüyle doğrulandı.

---
**Son Güncelleme**: 2026-08-29, 24. tur (Kök `claude.md`'nin 33. tur işi - ödeme/grup seansı zincirinin sağlık kontrolü, backend tarafı için bkz. backend/claude.md 28. tur. Bu turda expert'e iki küçük değişiklik: `group-detail-dialog.tsx`'e onaylanmış katılımcılar bölümünün altına, sadece grubun sahibi uzmana görünen salt-okunur bir "Bekleme Listesi" bölümü [FIFO sıra numarası rozeti] eklendi [backend'in yeni `GroupSessionSerializer.waitlist` alanını tüketiyor, kullanıcı isteği: "uzman paneline bekleme listesi eklensin"]; `create-group-modal.tsx`'in `handleSubmit()`'ine kapasite<2 için client-side bir guard eklendi [backend'de aynı turda bulunan `capacity=0` bug'ının frontend tarafı - HTML `min={2}` attribute'u tek başına programatik submit'i engellemiyordu]. `vite build`+`tsc -b` temiz, gerçek tarayıcıda henüz test edilmedi.)

**Önceki Güncelleme**: 2026-08-28, 23. tur
