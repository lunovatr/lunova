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

> ## 🔧 Son Değişiklikler (2026-08-20, 15. tur) — Danışan Formları Matrisi + 🔴 Kritik Backend Bug Düzeltmesi
> Kullanıcı, expert panelindeki "Danışan Formları" ekranını dropdown-ile-seç yerine bir matris tabloya (satır=danışan, sütun=form, hücre=✓/✗) çevirmeyi istedi; satıra tıklayınca var olan "form cevapları + risk detay dialog'u" akışı değişmeden açılmaya devam ediyor. Bu değişikliği gerçek veriyle doğrularken **önceden fark edilmemiş, 🔴 kritik bir backend bug'ı bulundu ve düzeltildi** — matris kapsamı sadece expert'te ama backend fix'i bu yüzden ayrı, önemli bir madde. Detay: `expert/claude.md`/`backend/claude.md`'nin 13. tur girdileri.
> - **Expert (`features/client-forms/`)**: `<Select>` dropdown'ı kaldırıldı; mount'ta `getMyClients()` + yeni `getForms()` (`GET /api/v1/forms/`) + HER danışan için paralel `getClientFormResponses()` çekilip TEK bir `Map<clientUserId, responses[]>`'te tutuluyor — bu veri hem matrisin ✓/✗ hücrelerini hem (satıra tıklanınca) var olan cevap tablosunu besliyor, ekstra istek atılmıyor. Sütun başlıkları (form başlıkları uzun olabildiği için) `truncate` + tooltip ile kısaltılıyor.
> - **🔴 Backend — `forms/views.py` kritik bug**: `FormClientResponsesView`/`FormClientResponseDetailView`, URL'deki `client_id`'yi ÖNCE `ClientProfile.id` olarak yorumlamayı deniyordu; ama tek gerçek çağıran taraf her zaman `User.id` gönderiyor. `ClientProfile.id` ve `User.id` ayrı auto-increment dizileri olduğundan, gönderilen `User.id` alakasız bir `ClientProfile`'ın PK'sıyla sayısal olarak çakışabiliyor — matrisi gerçek veriyle test ederken TAM OLARAK bu senaryo yaşandı (gerçekten atanmış bir danışan için yanlışlıkla 403 alındı). En kötü ihtimalde (çakışan profil AYNI expert'e aitse) bu, bir danışanın klinik verisinin BAŞKA bir danışan adı altında gösterilmesine yol açabilirdi. Düzeltme: `client_id` artık doğrudan ve sadece `User.id` olarak yorumlanıyor, belirsizlik kaldırıldı.
> - **Doğrulama — gerçek veriyle, gerçekten çalıştırılarak**: `APIRequestFactory` ile hem bug'ın varlığı (yanlış 403) hem düzeltmesi (200 + doğru veri) hem de yetki kontrolünün bozulmadığı (alakasız bir expert hâlâ 403 alıyor) doğrulandı; matris verisi 7 gerçek danışan için uçtan uca test edildi. `expert` → `tsc -b`/`vite build` temiz. **Gerçek tarayıcıda tıklanarak test edilmedi** — bir sonraki oturumda matrisin görsel doğruluğunun ve satır→tablo→dialog zincirinin manuel teyidi öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 14. tur) — Yeni Özellik: Global Bildirim Sistemi (Client + Expert + Backend)
> Kullanıcı, client/expert'te aktif olarak görülebilecek, yaklaşan (2-3 gün içindeki) randevuları listeleyen, tıklanınca randevu detayına yönlendiren, tıklanınca okunmuş işaretlenen, okunduktan 20 gün sonra otomatik temizlenen bir bildirim sistemi istedi. Kod taraması, "tıklanınca okunmuş işaretleniyor" izlenimini veren tek şeyin `client/`'taki TailAdmin şablonundan kalma, tamamen sahte/hardcoded veriyle çalışan bir `NotificationDropdown` UI taslağı olduğunu ortaya çıkardı (`expert/`'te ise bildirimle ilgili hiçbir şey yoktu, sadece devre dışı bir sekme etiketi) — gerçek, backend'e bağlı bir bildirim sistemi hiçbir yerde mevcut değildi, sıfırdan inşa edildi. Mesajlaşma altyapısı bilinçli olarak kurulmadı (kullanıcı isteği) ama model tasarımı ileride bir `message` türünün eklenebileceği şekilde genel bırakıldı.
> - **Backend — yeni `notifications/` app**: `Notification` modeli (user, notification_type, dedupe_key, appointment FK, is_read/read_at) + `UniqueConstraint(user, dedupe_key)`. Projede hiç job scheduler (Celery/cron) olmadığı için periyodik bir arka plan işi yerine `GET /api/v1/notifications/` her çağrıldığında `sync_appointment_reminders(user)` çalışıyor — kullanıcının (expert veya client) önümüzdeki 3 gün içindeki `confirmed` randevuları için `get_or_create` ile eksik bildirimleri oluşturuyor (unique constraint sayesinde idempotent, var olan okuma durumunu bozmuyor) — ve `cleanup_old_read_notifications(user)` 20 günden eski okunmuş bildirimleri siliyor. `PATCH /api/v1/notifications/<id>/read/` okunmuş işaretliyor. Detay ve tasarım gerekçesi `backend/claude.md`'nin 12. tur girdisinde.
> - **Client**: `components/header/NotificationDropdown.tsx` (önceden 100% sahte TailAdmin taslağıydı) artık gerçek veriyle çalışıyor — 60sn'de bir polling, okunmamış sayısı bell ikonunda gösteriliyor, tıklayınca okunmuş işaretlenip randevuya yönlendiriyor. Client'ta randevu detay SAYFASI hiç yoktu (sadece düz bir liste) — yeni `pages/Appointments/AppointmentDetail.tsx` + `/appointments/:id` route'u eklendi, bildirimler oraya yönlendiriyor. `PageBreadCrumb`'ın 12. turda eklenen `items` desteği burada da kullanıldı. Detay: `client/claude.md`'nin 13. tur girdisi.
> - **Expert**: sıfırdan `components/notification-dropdown.tsx` + `features/notifications/api.ts` eklendi (hiç yoktu), 8 ayrı sayfanın `<Header>` bloğuna (bu projede header içeriği her feature'da tekrarlanıyor, merkezi değil — mevcut `ProfileDropdown` deseniyle birebir tutarlı şekilde eklendi) bağlandı. Expert'te zaten var olan randevu detay dialog'u (`appointment-detail-dialog.tsx`) route'lanmıyordu — `routes/_authenticated/reservations.tsx`'e `?appointmentId=` search param'ı (zod ile tip güvenli) eklenip `Reservations` bileşeni bunu okuyup dialog'u otomatik açacak şekilde genişletildi, yeni bir sayfa/route icat edilmeden var olan UI yeniden kullanıldı. Detay: `expert/claude.md`'nin 12. tur girdisi.
> - **Doğrulama — backend gerçekten çalıştırılarak yapıldı**: Django shell'de gerçek bir randevu oluşturulup bildirim üretimi + idempotency (tekrar sync'te duplicate oluşmadığı) + 20 günlük temizlik (`read_at` geriye çekilip silindiği, silinmeyenin kaldığı) doğrulandı; `APIRequestFactory` ile gerçek `GET`/`PATCH` HTTP çağrıları test edildi. `client` → `tsc --noEmit` + `vite build` temiz. `expert` → `tsc -b` + `vite build` temiz, `routeTree.gen.ts`'in yeni `appointmentId` search param'ını doğru ürettiği doğrulandı. **Hiçbir frontend değişikliği gerçek bir tarayıcıda tıklanarak test edilmedi** (ortamda hâlâ tarayıcı otomasyon aracı yok — projenin her turunda tekrarlanan aynı sınırlama) — özellikle bildirim dropdown'larının polling'i, okunmuş/okunmamış görsel farkı, ve iki uygulamadaki randevu detayına yönlendirmenin manuel doğrulanması öneriliyor.

> ## 🔧 Son Değişiklikler (2026-08-20, 13. tur) — Formlar: Gerçek Kök Neden Bulundu (12. Turun Teşhisi Yanlıştı)
> Kullanıcı 12. turdaki düzeltmeyi test etti, bug hâlâ oradaydı ve daha spesifik bir tekrar üretme adımı verdi — bu da **12. turda `multiple_choice` (checkbox) sanılan teşhisin YANLIŞ olduğunu ortaya çıkardı**. Gerçek bug `yes_no`/`single_choice` (radio) sorularındaydı ve kod değil, **VERİ katmanındaydı**: "Genel Sağlık Değerlendirme Formu"nun (form id=3) 4 `yes_no` sorusu (id 16-19) DB'de gerçekten SIFIR `QuestionOption` kaydına sahipti (Django ORM ile doğrulandı) — muhtemelen daha önceki bir test/deneme oturumunda silinmiş. `backend/forms/views.py` → `FormDetailView`, bir `yes_no` sorusunun hiç gerçek seçeneği yoksa `id`'siz bir fallback döner (`{"value":1,"text":"Evet"}` şeklinde); `client/pages/Forms/FormFill.tsx`'teki radio render kodu `opt.id!` (non-null assertion) kullanıyordu, `opt.id` fallback'te TÜM seçenekler için `undefined` olduğundan dokunulmamış bir soruda "Evet" VE "Hayır" AYNI ANDA `checked=true` hesaplanıyordu — native `<input type="radio">` grup davranışı bunu sessizce SON seçeneğe ("Hayır") kilitliyordu, kullanıcı hiç dokunmadığı halde tüm `yes_no` sorular "Hayır" gösteriyordu; React state'i gerçekte hiç set edilmediği için gönderim doğrulaması bunları doğru şekilde "cevaplanmamış" işaretliyordu. Ayrıca `AnswerSubmitSerializer.validate()` seçilen id'nin `question.options`'ta var olmasını zorunlu kıldığından, veri düzeltilmeden bu 4 soru zaten submit EDİLEMEZDİ — salt kod değişikliği yeterli olmazdı. Tam detay `client/claude.md`'nin 13. tur girdisinde; özet:
> - **Veri düzeltmesi**: eksik `QuestionOption` kayıtları ("Evet"/"Hayır", form id=1'deki established convention'la birebir) Django ORM ile yeniden oluşturuldu — `FormDetailView` artık bu 4 soru için de gerçek, benzersiz id döndürüyor.
> - **Kod (savunma katmanı)**: `FormFill.tsx`, `opt.id!` yerine `opt.id ?? opt.value ?? idx` kullanıyor — veri bütünlüğü tekrar bozulsa bile UI'ın sessizce yanlış seçenek göstermesini engelliyor (submit yine backend'in `Invalid option id` hatasıyla düzgün başarısız olur, bu doğal ve beklenen).
> - 12. turdaki `multiple_choice`/breadcrumb/gönderim-modalleri değişiklikleri geri alınmadı (zararsız, hâlâ iyi pratikler) ama asıl bug orada değildi.
> - **Doğrulama — gerçekten çalıştırılarak**: Django ORM ile DB'de gerçek satır sayıları sorgulandı; `APIRequestFactory` ile hem `FormDetailView` (artık gerçek id döndürdüğü) hem gerçek bir `FormSubmitView.post()` çağrısı (5 soru) test edilip `201` + doğru `total_score=3.0` alındığı doğrulandı, test `FormResponse`'u sonra silindi. `tsc`/`vite build` temiz. **Gerçek tarayıcıda tıklanarak hâlâ test edilmedi** ama bu kez hem veri hem kod gerçek bir HTTP/ORM çağrısıyla doğrulandığı için önceki turdan çok daha yüksek güven var.

> ## 📜 Daha Eski Turlar (2026-08-19, 12. tur ve öncesi) — arşivlendi
> Kural (e) gereği ("📌 Kalıcı Kural" → Şişmeyi önleme) 12. tur ve öncesinin ayrıntılı prose'u bu dosyadan çıkarıldı — net sonuçları zaten yukarıdaki **"📊 Sistem Durumu Özeti → ✅ Kapatılmış kritik/yüksek öncelikli maddeler"** listesinde tek satırlık özetler olarak duruyor (Formlar sekmesinin ilk tarayıcı testinden 4 bulgu [12. tur], danışan formları + otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], doküman sistemi iyileştirmesi + `expert/ToDo.md` konsolidasyonu [9. tur], ana sayfa scroll bug'ı + expert çift-modal bug'ı + Zoom 15dk kısıtı + takvim renklendirmesi [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + Clerk sökümü [7. tur], toast z-index bug'ı [6. tur], CSRF koruması [5. tur], access token refresh [3. tur], profil "beyaz sayfa" zinciri [devam turu], randevu 3-ID karışıklığı + login/me `id`/`role` eksikliği [Randevu Zinciri turu], `AvailabilityExceptionView`/`ExpertAvailability` navigate no-op [4. tur]). Tam ayrıntı (kod örnekleri, curl doğrulama adımları) kayıp değil — `git log -p -- CLAUDE.md` ile bu dosyanın o zamanki hâli her zaman geri getirilebilir (repo artık `git subtree` ile birleşmiş tek bir depo, bkz. aşağıdaki "⚠️ Repo Yapısı" notu).
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-20, 12. tur — Formlar: İlk Tarayıcı Testinden Çıkan 4 Bulgu
>
> - 2026-08-19, 11. tur — Danışan Formları Sistemi + Otomatik Versiyonlama
> - 2026-08-19, 10. tur — Zoom Mock URL Placeholder Düzeltmesi
> - 2026-08-19, 9. tur — Doküman Sistemi İyileştirmesi + `expert/ToDo.md` Konsolidasyonu
> - 2026-08-19, 8. tur — Ana Sayfa Scroll Bug'ı, Zoom 15dk Kısıtı, Expert Onay Çift-Modal Bug'ı, Takvimlerde Durum Renklendirmesi
> - 2026-08-19, 7. tur — Mobil Düzeltmeler, Marka/UI Temizliği, Client Ana Sayfası, Hukuki Sayfa Altyapısı
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
Backend (Django)         🟢 Sağlam temel; oturum yönetimi + CSRF koruması tamamlandı (curl ile doğrulandı); Zoom mock URL placeholder'a çevrildi (10. tur); `forms/` modülüne otomatik versiyonlama + admin güvenlik katmanı eklendi, kritik bir skorlama pipeline hatası (total_score hep 0 kalıyordu) düzeltildi (11. tur); yeni `notifications/` app eklendi — job scheduler olmadan sync+idempotent+auto-cleanup modeliyle randevu hatırlatmaları, Django shell/APIRequestFactory ile gerçekten çalıştırılarak doğrulandı (14. tur)
Client (danışan, Redux)  🟢 401/refresh otomatik, CSRF token otomatik ekleniyor; profil/randevu form hataları + mobil header/sidebar bug'ları kapatıldı; ana sayfa gerçek widget'larla donatıldı (7. tur); "Formlar" sekmesi eklendi (11. tur); "seçenekler kayboluyor" bug'ının gerçek kök nedeni (bir formun `yes_no` sorularında eksik DB verisi) bulunup düzeltildi (13. tur); sahte veriyle çalışan TailAdmin bildirim taslağı gerçek bir bildirim sistemine bağlandı + yeni randevu detay sayfası eklendi (14. tur) — sadece `tsc`/`build`, gerçek tarayıcıda hâlâ test edilmedi
Expert (uzman, Zustand)  🟢 Randevu/profil zinciri düzeltildi, CSRF token otomatik ekleniyor; Lunova logosu eklendi, Clerk + şablon demo sayfaları tamamen söküldü (7. tur); "Danışan Formları" sekmesi eklendi (11. tur); sıfırdan bir bildirim sistemi eklendi + randevu detay dialog'u `?appointmentId=` ile deep-link'lenebiliyor (14. tur); "Danışan Formları" dropdown yerine danışan×form matris tabloya çevrildi, bunu doğrularken 🔴 kritik bir backend bug'ı (client_id çakışması) bulunup düzeltildi (15. tur) — `tsc -b`/`build` temiz ama gerçek tarayıcıda test edilmedi; hata mesajı gösterimi (.title bug) hâlâ yanlış ama React Query hiç kullanılmadığı için şu an pasif risk
Entegrasyon (backend↔fe) 🟢 CSRF koruması aktif ve gerçekçi bir curl zinciriyle sıkı doğrulandı; tek eksik gerçek tarayıcıda tıklanarak test — 7-8-10-11-12-13-14. turlardaki UI değişiklikleri de aynı nedenle henüz tarayıcıda tıklanarak doğrulanmadı (bkz. 🟠 aşağıda)
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
- Dev/mock ortamda Zoom bağlantıları literal `"mock url"` string'i yüzünden client'ın kendi 404 sayfasına düşüyordu → `backend/zoom/services.py`'ye paylaşılan bir `create_mock_zoom_meeting()` eklendi, artık gerçek `https://zoom.us/j/...` formatında bir placeholder URL dönüyor (10. tur).
- Danışan formları için ne client'ta ne expert'te hiçbir arayüz yoktu → ikisine de sıfırdan eklendi (client: doldur+görüntüle, expert: danışan seç+skor/risk dahil görüntüle) (11. tur).
- 🔴 [KRİTİK] `FormSubmitView` hiçbir zaman gerçek bir skor hesaplamıyordu — API'den gönderilen HER form cevabı `total_score=0`'da kalıyor, expert'in gördüğü risk seviyesi tamamen anlamsız oluyordu → skorlama pipeline'ı düzeltildi, gerçekten çalıştırılarak doğrulandı (11. tur).
- Admin bir formu (soru/seçenek) düzenlediğinde geçmiş cevapların bozulma riski vardı, versiyonlama hiç yoktu → otomatik versiyonlama sistemi eklendi (formun ≥1 cevabı varsa düzenleme yeni versiyon açar, eski donar), bir Plan-agent ile stres testine tabi tutulup bulunan riskler (POST-time yarış durumu, cascade-delete) kapatıldı (11. tur).
- `forms/views.py`, atanmamış bir danışanın (`ClientProfile.expert=None`) formlarına HERHANGİ bir uzmanın erişmesine izin veriyordu → sadece gerçekten atanmış uzman erişebilecek şekilde sıkılaştırıldı (11. tur).
- Client "Formlar" sekmesinin ilk tarayıcı testinden 4 bulgu çıktı: breadcrumb artık "Home → Formlar → [Form Adı]" gösteriyor, gönderim artık "eksik soru" + "emin misiniz" modalleriyle korunuyor (12. tur) → ama bildirilen "seçenekler kayboluyor" bug'ının 12. turdaki teşhisi (`multiple_choice`) YANLIŞTI; 13. turda gerçek kök neden bulundu: form id=3'ün 4 `yes_no` sorusunun DB'de hiç seçenek kaydı yoktu, backend `id`'siz bir fallback döndürüyordu, frontend bunu sessizce yanlış seçenek gösteriyordu → eksik veri geri yüklendi + `FormFill.tsx`'e savunma katmanı eklendi, gerçek bir submit akışıyla (`APIRequestFactory`, 201+doğru skor) doğrulandı (13. tur).
- Ne client'ta ne expert'te aktif olarak görülebilecek bir bildirim mekanizması yoktu — client'taki "bell" ikonu 100% sahte/hardcoded TailAdmin şablon taslağıydı (gerçek "okundu" state'i bile yoktu), expert'te ise hiçbir şey yoktu (sadece devre dışı bir sekme etiketi) → backend'de yeni `notifications/` app (job scheduler olmadan sync+idempotent+20-gün-auto-cleanup modeliyle randevu hatırlatmaları) + iki frontend'de de gerçek, çalışan bell dropdown'ları + tıklanınca randevu detayına yönlendirme (client'ta hiç var olmayan `/appointments/:id` sayfası + expert'te var olan dialog'un `?appointmentId=` ile deep-link'lenmesi) eklendi (14. tur).
- Expert'teki "Danışan Formları" ekranı dropdown-ile-seç yerine bir danışan×form matris tablosuna (✓/✗) çevrildi, satıra tıklayınca var olan form-cevapları+risk-detay akışı korunarak açılıyor → matrisi gerçek veriyle doğrularken 🔴 kritik bir backend bug'ı bulundu: `forms/views.py`'deki `client_id` çözümlemesi (`ClientProfile.id`/`User.id` karışıklığı) alakasız bir danışan profiliyle çakışıp yanlış 403 (en kötü ihtimalde yanlış danışanın verisini gösterme riski) üretiyordu → `client_id` artık sadece `User.id` olarak yorumlanacak şekilde düzeltildi, gerçek verilerle doğrulandı (15. tur).

### 🟠 En öncelikli açık madde

**Bu ortamda hâlâ bir tarayıcı otomasyon aracı yok — bu yüzden birikmiş, sadece kod/tsc/build ile doğrulanmış ama hiç tıklanarak test edilmemiş bir dizi değişiklik var.** İki ayrı kategori:
1. **CSRF** — axios'un `withXSRFToken` mekanizması kaynak kodu okunarak, backend tarafı ise gerçekçi bir `curl` zinciriyle (login → `csrftoken` cookie → doğru header'la `200`, header'sız `403`, `CORS_ALLOW_HEADERS`'ta `x-csrftoken` mevcudiyeti) sıkı doğrulandı (6. tur). Client/expert'te login olup bir POST/PATCH/DELETE işlemi deneyip başarılı olduğunu gözlemlemek yeterli; 403 alınırsa DevTools → Network'te `X-CSRFToken` header'ının gerçekten gittiğine bakılmalı.
2. **7. turdaki UI değişiklikleri** — mobil sidebar'ın bir linke tıklayınca otomatik kapanması, mobil header logosunun artık taşmaması, client ana sayfasındaki 3 yeni widget'ın (karşılama/yaklaşan randevular/mini takvim) doğru render olması, expert giriş ekranlarında Lunova logosunun göründüğü ve GitHub/Facebook butonlarının kalktığı, expert sidebar'ında gerçek kullanıcı adının (satnaing değil) göründüğü — hepsi `tsc`/`vite build` ile "derlenir" doğrulandı ama tarayıcıda gözle hiç teyit edilmedi.
3. **10. turdaki Zoom mock URL düzeltmesi** — `create_mock_zoom_meeting()` Django shell'de gerçekten çalıştırılıp çıktısı doğrulandı, ama bir randevuyu confirmed'e çekip Zoom butonuna gerçekten tıklayarak yeni sekmenin `https://zoom.us/j/...`'a gittiği hiç gözle teyit edilmedi.
4. **11. turdaki "Formlar" özelliği (client + expert)** — backend tarafı (versiyonlama, skorlama, izinler) Django shell + gerçek HTTP istekleriyle sıkı doğrulandı; admin panelindeki versiyonlama akışı da gerçek bir Django sayfası olduğu için `test.Client` ile tıklanmış gibi test edildi; `GET /accounts/clients/`'in gerçek veride dolu döndüğü de ayrıca doğrulandı (80 danışandan 62'sinin atanmış uzmanı var). Client tarafı 12. turda ilk kez tarayıcıda denendi (bkz. madde 5); **expert tarafı hâlâ hiç tarayıcıda açılmadı**, sadece `tsc -b`/`vite build` ile doğrulandı.
5. **12-13. turdaki değişiklikler (client, breadcrumb + gönderim modalleri + `yes_no` radio veri/kod düzeltmesi)** — 13. turda hem veri (eksik `QuestionOption` kayıtları) hem kod (`opt.id ?? opt.value ?? idx`) tarafı `APIRequestFactory` ile gerçek bir HTTP/ORM çağrısıyla doğrulandı (`FormDetailView`'ın artık gerçek id döndürdüğü + gerçek bir submit'in `201`+doğru skorla sonuçlandığı görüldü) — bu, 12. turdaki sadece statik analizle yapılan (ve kök nedeni ispatlayamayan) doğrulamadan çok daha güçlü. Yine de `tsc`/`vite build` dışında **gerçek tarayıcıda tıklanarak hiç test edilmedi** — bir sonraki oturumda özellikle bu formun (ve genel olarak diğer `yes_no` sorularının) tarayıcıda gerçekten doğru göründüğünün teyidi öneriliyor.
6. **14. turdaki bildirim sistemi (backend + client + expert)** — backend tarafı (sync/idempotency/cleanup/HTTP endpoint'leri) Django shell + `APIRequestFactory` ile sıkı doğrulandı. **İki frontend'in kendisi (bell dropdown'ları, polling, okunmuş/okunmamış görsel farkı, tıklanınca randevu detayına yönlendirme) hiç tarayıcıda açılmadı** — sadece `tsc`/`vite build` ile doğrulandı. Özellikle şu akışların manuel testi öneriliyor: (a) yaklaşan bir randevunun bell'de gerçekten göründüğü, (b) tıklayınca hem okunmuş işaretlendiği hem doğru randevuya yönlendirdiği (client: yeni `/appointments/:id` sayfası; expert: `/reservations?appointmentId=...` ile var olan dialog'un otomatik açıldığı), (c) 60sn polling'in ekstra istek/hata üretmediği.
7. **15. turdaki danışan formları matrisi (expert)** — hem matris verisi hem altındaki 🔴 kritik backend düzeltmesi `APIRequestFactory` ile 7 gerçek danışan için uçtan uca doğrulandı (hepsi 200, önceki yanlış 403'ler düzeldi). **Matrisin kendisi (✓/✗ render'ı, satır tıklamasının doğru danışanı seçtiği, oradan risk detay dialog'unun açıldığı) hiç tarayıcıda görülmedi** — sadece `tsc -b`/`vite build` ile doğrulandı.

Kalan risk her ikisi için de düşük (CSS/JS mantığı statik ve doğrudan; CSRF backend ucu çok sağlam doğrulanmış) ama sıfır değil — bir sonraki oturumda/gerçek bir cihazda kısa bir manuel geçiş (yukarıdaki maddeler + bir POST/PATCH akışı) öneriliyor.

### 🟡 Doğrulanmış, hâlâ açık — önem derecesine göre sıralı

> Önem derecesi ölçeği için "📌 Kalıcı Kural" madde (c)'ye bakın. Aşağıdaki liste 🟠'dan 🟢'ye sıralı.

1. 🟡 `client/src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub, silme butonu kullanıcıya hiçbir geri bildirim vermeden hiçbir şey yapmıyor.
2. 🟡 `client/src/pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response şekil kontrolsüz `.map()`'e veriliyor (ErrorBoundary artık yakalıyor, kök neden düzeltilmedi).
3. 🟡 `LogoutView`, `access_token`'ı blacklist'e almıyor (sadece `refresh_token`'ı) — logout sonrası eski access token kendi 15 dk'lık ömrü boyunca teorik olarak hâlâ geçerli kalabiliyor. CSRF'le ilgisiz, önceden beri var olan bir tasarım tercihi. **[5. turda bulundu]**
4. 🟡 Rate limiting yok, DRF pagination global tanımlı değil (`available-experts/` gibi sınırsız listelerde risk; `appointments/` zaten tarih aralığıyla sınırlı).
5. 🟡 CI/otomatik test yok (`appointments` hariç hiçbir app'te; frontend'lerde hiç test dosyası yok).
6. 🟢 `expert/lib/handle-server-error.ts`'in `.title`-okuma bug'ı — backend hemen hiç `title` döndürmüyor (`detail`/`error` kullanıyor). **Pasif risk** (React Query'nin `useMutation`/`useQuery`'si projede kullanılmıyor), ama biri ileride bir mutation'ı React Query'ye taşırsa aktifleşir. Düzeltmesi tek satırlık bir `.detail || .error` fallback'i. **Not (6. tur)**: expert'te `client`'takiyle aynı `ToastContainer`/`Modal` z-index kalıbı kullanılıyorsa aynı "toast modalın arkasında gizleniyor" riski orada da olabilir — expert'in kendi Modal/Toast bileşenleri (muhtemelen shadcn/ui tabanlı, farklı implementasyon) hiç incelenmedi.
7. 🟢 `client/src/store/authSlice.ts` → `fetchProfile.rejected`, `userProfile`/`isAuthenticated`'ı temizlemiyor (refresh'in kendisi başarısız olursa eski veri ekranda kalır — pratikte interceptor yönlendirdiği için fark edilmiyor ama düzeltilmedi).
8. 🟢 `client/src/components/UserProfile/UploadDocumentModal.tsx` sonrası `RequireAuth`'un tüm `AppLayout`'u tam ekran spinner'a çevirmesi (rutin foto yüklemesi tüm uygulamayı kısa süreliğine kaybettiriyor).
9. 🟢 **[7. turda büyük ölçüde kapatıldı]** ~~İki frontend de açık kaynak şablon kimliğiyle duruyor~~ — `package.json` `name` alanları (`lunova-client`/`lunova-expert`) ve `@clerk/clerk-react` bağımlılığı düzeltildi/kaldırıldı. **Hâlâ açık kalan tek parça**: `client/README.md` ve `expert/README.md` bilinçli olarak kapsam dışı bırakıldı, hâlâ orijinal şablon README'leri.
10. 🟢 **[7. turda bulundu]** Ne client'ta (sidebar daraltılmış hâli) ne expert'te (favicon) gerçek bir kare/icon-only Lunova logosu yok — ikisi de hâlâ TailAdmin/shadcn-admin'in jenerik varsayılan ikonlarını kullanıyor. Elimizdeki iki PNG asset (yatay lockup + 1024×1024 dikey lockup) doğrudan bu kullanım için uygun değil; kullanıcıdan/tasarımcıdan ayrı bir icon-only asset istenmesi öneriliyor.
11. 🟢 **[7. turda eklendi, içeriksiz — bilinçli]** `/terms` ve `/privacy` sayfaları iki frontend'de de altyapı olarak var ama gerçek Kullanım Şartları/Gizlilik Politikası metni yok — kullanıcı içeriği kendisi ekleyecek.
12. 🟢 `client/store/authReducer.ts` ölü kod (store'a bağlı değil).
13. 🟢 `backend/requirements.txt`'te kullanılmayan/şüpheli `rest-framework-simplejwt==0.0.2` satırı duruyor.
14. 🟢 `FRONTEND_URLS`'teki zorunlu `admin` anahtarının ne için kullanıldığı netleştirilmedi.
15. 🟢 `SIMPLE_JWT` içindeki `AUTH_COOKIE*` anahtarları ölü konfigürasyon (hiçbir yerde okunmuyor, gerçek cookie parametreleri `set_auth_cookies()`'te ayrı) — temizlenebilir. **[5. turda bulundu]**
16. 🟢 `client/src/components/UserProfile/UserSupportCard.tsx` dosyasının içindeki bileşen adı aslında `UserTreatmentCard`; `UserContactCard.tsx` ise `UserProfiles.tsx`'te `UserInfoCard` diye import ediliyor. Üçü de doğru render ediliyor, fonksiyonel bug yok — sadece dosya/bileşen/import-alias adları arasındaki tutarsızlık ileride kod arayan birini yanıltabilir. **[6. turda bulundu]**
17. 🟡 **[11. turda bulundu]** `backend/forms/models.py` → `Question.next_question` (self-FK) hiçbir queryset kısıtı olmadan TANIMLI — bir soru teorik olarak BAŞKA bir formun sorusuna "sonraki soru" olarak bağlanabilir. Sadece admin panelindeki dropdown (`QuestionAdmin.formfield_for_foreignkey`) aynı forma sınırlandı (11. tur); model seviyesinde bir `clean()`/validasyon yok, versiyonlama fork'u da (`fork_form_version`) böyle bir cross-form linke rastlarsa sessizce `None` bırakıp logluyor (veri kaybı değil, ama linkin amacı kayboluyor).
18. ✅ **[11. turda doğrulandı, artık geçerli değil]** ~~Expert'teki eski bir not (Randevu Zinciri turu), `ClientProfile.expert`'in hiçbir yerde set edilmediğini, `GET /accounts/clients/`'in bu yüzden boş döneceğini iddia ediyordu~~ — Django shell'de gerçek DB sorgulanıp bunun artık (belki de hiç) doğru olmadığı görüldü: 80 danışandan 62'sinin gerçekten atanmış bir uzmanı var. Expert'in yeni "Danışan Formları" sekmesi bu ucu doğrudan kullandığı için (bkz. `expert/claude.md` 11. tur) çoğu uzman hesabı için dolu bir danışan listesi görmesi bekleniyor — ama sekmenin kendisi hâlâ gerçek tarayıcıda tıklanmadı (bkz. 🟠 madde 4).

### 🚀 Önerilen sıradaki adımlar (öncelik sırasıyla)

1. **11. turdaki "Formlar" özelliğinin (client+expert) VE `GET /accounts/clients/`'in gerçekten dolu döndüğünün gerçek bir tarayıcıda doğrulanması** — en yeni, en az test edilmiş değişiklik, öncelik en yüksek.
2. CSRF fix'inin, 7-8-10. turdaki diğer UI değişikliklerinin gerçek bir tarayıcıda doğrulanması (yukarıda, 🟠).
3. `handle-server-error.ts` `.detail || .error` fallback'i (ucuz, birisi React Query'ye geçerse aktifleşecek riski önler).
4. Yukarıdaki "hâlâ açık" listesindeki 🟡 maddeler: documents delete stub, response şekil kontrolü, logout'ta access token blacklist, rate limiting/pagination, CI/test altyapısı, `next_question` model-seviyesi scoping.
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

# notifications/urls.py — (14. tur, YENİ)
GET    /api/v1/notifications/                 (sync + 20 gün temizlik yan etkili; expert veya client, kendi bildirimleri)
PATCH  /api/v1/notifications/<id>/read/        (okunmuş işaretler, idempotent)
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

Notification (notifications/models.py) — 14. tur, YENİ
├── user (FK), notification_type (şu an tek değer: appointment_reminder — ileride
│   "message" gibi başka türler için genel bırakıldı), dedupe_key, title, body
├── appointment (nullable FK → appointments.Appointment)
├── is_read, read_at, created_at
└── UniqueConstraint(user, dedupe_key) — job scheduler olmadan "her GET'te sync"
    modelinin idempotency temeli, bkz. backend/claude.md 12. tur
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

**Son Güncelleme**: 2026-08-20, 15. tur (Expert'teki "Danışan Formları" dropdown yerine danışan×form matris tabloya çevrildi; matrisi gerçek veriyle doğrularken 🔴 kritik bir backend bug'ı bulunup düzeltildi — `forms/views.py`'deki `client_id` çözümlemesi (`ClientProfile.id`/`User.id` karışıklığı) alakasız bir danışan profiliyle çakışıp yanlış 403 veriyordu, en kötü ihtimalde yanlış danışanın verisini göstermesi mümkündü; `APIRequestFactory` ile hem bug hem düzeltme gerçek verilerle doğrulandı, `expert` → `tsc -b`/`vite build` temiz, gerçek tarayıcı testi bekliyor)
**Durum**: Aktif Geliştirme
