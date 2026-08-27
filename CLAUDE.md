# Lunova - Proje Overview ve Mimari Rehber

> **Not (2026-08-14)**: Bu dosya ve alt dizinlerdeki `claude.md` dosyaları, kod tabanı doğrudan okunarak (satır satır `models.py`, `views.py`, `settings.py`, `urls.py`, gerçek `package.json`'lar vb.) doğrulanmıştır. Önceki bir AI ajanının ürettiği ilk sürüm; token ömrü, endpoint listesi, model alanları, dizin ağacı ve bağımlılık versiyonları gibi birçok noktada **kod ile örtüşmeyen (uydurma/varsayılan) bilgiler** içeriyordu. Bu sürümdeki her teknik iddia kaynak koddan doğrulanmıştır. Sonraki agentic çalışmalarda bu dosyalara güvenebilirsin, ama kod değiştikçe bu dosyaların da güncellenmesi gerekir.

> ## 📌 Kalıcı Kural — Dokümantasyon Bakımı (2026-08-19, 8. tur'da revize edildi)
>
> Bu proje çok-turlu, çok-ajanlı bir şekilde geliştiriliyor; bir çalışmanın bulguları bir sonrakinin tek başlangıç noktası. Bu dosyanın (ve alt dizinlerdekilerin) doğruluğu bu yüzden kritik — **aşağıdaki 5 kural, "isteğe bağlı iyi pratik" değil, her çalışmanın sonunda uygulanması gereken zorunlu adımlardır.**
>
> **(a) Ne zaman güncellenir**: Kod değiştiren HER çalışma sonunda — küçük bir bug fix, bir özellik, bir refactor, fark etmez. Bunun ek token/zaman maliyeti **kabul edilmiş bir maliyettir**; "az değişti, dokümana değmez" diye atlanmaz. Kullanıcı açıkça "dokümantasyona dokunma" demediği sürece bu adım zorunludur — varsayılan davranış her zaman günceller.
>
> **(b) Nereler güncellenir**: **(1)** bu kök dosya — en azından "🔧 Son Değişiklikler" ve "📊 Sistem Durumu Özeti"; **(2)** değişikliğin gerçekleştiği alt dizin(ler)in kendi dosyası (`backend/claude.md`, `client/claude.md`, `expert/claude.md`). **Kritik teknik gerçek**: yeni oturumlar SADECE bu kök dosyayı otomatik olarak context'e alıyor — alt dizin dosyaları kendiliğinden görünmüyor, önce açıkça `Read` edilmesi gerekiyor. Bunun iki sonucu var: **(i)** bir alt dizinde çalıştıysan o dosyayı güncellemeden önce mutlaka önce okumalısın (üzerine kör yazma); **(ii)** kök dosyada iddia edilen HER teknik gerçek (paket adları, bağımlılıklar, dosya ağacı gibi) burada ayrıca elle tekrarlanmışsa, o kopya da güncellenmeli — aksi halde tam olarak aşağıdaki "🏗️ Sistem Mimarisi" bölümünde 7. turda yakalanan drift tekrarlanır (`package.json` adları ve Clerk bağımlılığı orada güncellenmemiş kalmıştı, "📊 Sistem Durumu Özeti"nde doğruyken). **Bir gerçeğin birden fazla yerde tekrarlandığını fark edersen, mümkünse tek bir yere indirip diğerinden ona link ver — iki kopyayı senkron tutmaya güvenme.**
>
> **(c) Nasıl yazılır**: ne değişti, neden, nasıl doğrulandı (gerçek test/curl/tarayıcı mı, yoksa sadece kod/tip kontrolü mü — açıkça belirt) ve önem derecesi. Yeni bulunan ama düzeltilmeyen her bulgu için önem derecesi **zorunlu**, şu ölçek kullanılmalı:
>
> - 🔴 **Kritik** — güvenlik açığı, veri kaybı riski, üretimi/ana akışı tamamen kıran hata
> - 🟠 **Yüksek** — kullanıcının ana akışını bozan, sık karşılaşılan hata
> - 🟡 **Orta** — gerçek ama nadiren tetiklenen/dar kapsamlı sorun
> - 🟢 **Düşük** — kozmetik, ölü kod, "olsa iyi olur" niteliğinde
>
> **(d) "🧭 Geliştirme Fikirleri" yaşam döngüsü**: statik bir liste değil. Bir fikir gerçekleştirildiğinde madde silinmez — üstü çizilip hangi turda kapatıldığı not düşülür (istenirse "Kapatılmış" listesine taşınır). Çalışma sırasında gerçek, somut bir geliştirme fırsatı fark edilirse (uydurma değil, koddan/kullanıcıdan gelen) bu bölüme yeni madde eklenmeli. **Liste sonsuza kadar aynı maddelerde donup kalmamalı.**
>
> **(e) Şişmeyi önleme (yeni, 8. turda eklendi)**: Bu dosya HER oturumda TAMAMEN yükleniyor — bu yüzden "🔧 Son Değişiklikler" (tur bazlı ayrıntılı changelog) sonsuza kadar büyümemeli. **Kural: en fazla son 3 tur ayrıntılı tutulur.** Yeni bir tur eklerken, artık 4. sıraya düşen turu sil — bilgi kaybı değildir, çünkü (i) o turun net sonucu zaten "📊 Sistem Durumu Özeti"nde bir cümleye indirgenmiş olmalı (değilse, silmeden önce oraya taşı), (ii) tam ayrıntısı `git log -p -- claude.md` ile her zaman geri getirilebilir (repo artık `git subtree` ile birleşmiş tek bir depo — bkz. aşağıdaki "⚠️ Repo Yapısı" notu, bu dosyanın kendisi de sürüm kontrolünde). Bu, projenin daha önce ayrı bir `SYSTEM_REPORT.md` dosyası tutup onu senkronize edemeyip terk ettiği hatanın (bkz. git geçmişi) tam tersi bir çözüm: içerik çoğaltmak yerine, GEÇMİŞİ git'e devret, bu dosyada sadece GÜNCEL DURUM + SON birkaç tur kalsın.

> ## 🔧 Son Değişiklikler (2026-08-27, 30. tur) — Ücretsiz İlk Seans: Danışan "Devam Et" Onayı + Promosyon Rozetleri
>
> Kullanıcı, 28-29. turda kurulan "ücretsiz ilk seans" hakkının uzman onayladığı anda danışanın hiçbir etkileşimi olmadan sessizce tüketilmesini (ödeme akışıyla tutarsız) düzeltmek istedi: ücretli seanstaki gibi danışanın da bir "taahhüt" adımından (Ödemeler sayfasında "Devam Et") geçmesini, ayrıca panelin çeşitli yerlerinde ("İlk 15 dakikanız ücretsiz!") bu hakkın henüz kullanılmadığını vurgulayan rozet/banner'lar istedi. Üç ürün kararı netleştirildi: **(1)** "15 dakika" sadece bilgilendirici metin - `Appointment.duration`/Zoom süresi/takvim bloğu hiç değişmiyor (booking akışına dokunulmadı, yarış durumu riski yok); **(2)** "devam et" istemi için var olan `payment_required` yerine yeni, özel bir bildirim/mail türü (`free_trial_ready`); **(3)** rozetler ana sayfa + randevu alma akışı + Ödemeler sayfası + uzman paneli, hepsinde.
>
> - **Backend — kilit tasarım**: yeni `Appointment.is_free_trial` (BooleanField, migration `0002_appointment_is_free_trial`) - Payment kaydı oluşmadan ÖNCE, uzman onayladığı/randevu oluşturduğu anda set edilir (Ödemeler sayfası henüz Payment yokken "Devam Et" gösterebilsin diye). `payments/services.py::resolve_appointment_payment()` artık ücretsiz hakkı ANINDA tüketmiyor - sadece bayrağı işaretleyip `False` döner (paid akışıyla simetrik). Yeni `confirm_free_trial(appointment)` - danışanın "Devam Et" tıklamasıyla çağrılır, `transaction.atomic()`+`select_for_update()` içinde eligibility'yi TEKRAR kontrol edip (iki randevu neredeyse eşzamanlı onaylanmışsa ikincisi zarifçe normal ödemeye düşürülür - `is_free_trial=False`), uygunsa asıl `Payment(amount=0, SUCCEEDED, metadata={'free_trial':True})`'ı burada oluşturup Zoom'u açar.
> - **Backend — yeni uçlar**: `POST /api/v1/payments/appointments/<id>/confirm-free-trial/` (`AppointmentFreeTrialConfirmView` - 403/404/400 aynı `AppointmentCheckoutView` deseninde) ve `GET /api/v1/payments/free-trial-eligibility/` (`FreeTrialEligibilityView`, `{"eligible": bool}` - client'ın ana sayfa/randevu alma banner'ı için, çünkü eligibility danışanın TÜM Payment geçmişine bakıyor, frontend'in elindeki tarih-aralığı-sınırlı randevu listesinden güvenilir türetilemez).
> - **Backend — bildirim/mail**: `Notification.TYPE_CHOICES`'a `free_trial_ready` eklendi (migration `0005_alter_notification_notification_type`, choices-only). `notifications/services.py::create_free_trial_ready_notification()` (YENİ, `create_payment_required_notification`'ın "devam et" karşılığı) + `create_payment_succeeded_notification()` artık `payment.amount==0 and metadata.free_trial` durumunda hem danışan hem uzman metnini "ödemeniz alındı" yerine "ücretsiz ilk seansınız onaylandı" olacak şekilde dallandırıyor (yeni tip AÇILMADI - tamamlama tarafı zaten mailsiz, sadece bildirim, asimetri kasıtlı korundu). `mailer/services.py::send_free_trial_ready_email()` (YENİ, `send_payment_required_email`'in ücretsiz karşılığı, aynı `/payments?appointmentId=` CTA'sı).
> - **Backend — appointments entegrasyonu**: `appointments/views.py::status_update()` ve `appointments/serializers.py::CreateAppointmentWithZoomSerializer.create()`'a `elif instance.is_free_trial:` dalı eklendi (payment_required'ın yerine free_trial_ready). `AppointmentSerializer`'a `is_free_trial` eklendi - hem `fields` hem **`read_only_fields`**'a (sistem tarafından hesaplanan bir bayrak, client'ın `PATCH /appointments/{id}/` ile doğrudan yazabilmesine izin verilmedi - script'te bu koruma ayrıca doğrulandı). `appointments/services.py`'ye HİÇ dokunulmadı (aynı appointment objesi referansla geçtiği için `resolve_appointment_payment`'ın içindeki değişiklik çağıran tarafta zaten bellekte güncel).
> - **Client**: yeni `components/common/FreeTrialBanner.tsx` (kendi başına eligibility çeker, `Home.tsx` ana sayfada ve `Request.tsx` randevu alma akışında kalıcı banner olarak kullanılıyor). `pages/Payments/Payments.tsx`: bekleyen satırda `is_free_trial` ise fiyat yerine "Ücretsiz İlk Seans" rozeti + buton "Devam Et"; geçmiş satırında hand-rolled yeşil `<span>` yerine paylaşılan `Badge` (bu turda ayrıca küçük bir tutarlılık düzeltmesi), `is_free_trial` ise "Ücretsiz İlk Seans" (solid); onay tıklaması `confirm-free-trial` ucuna gider, 400 (yarış durumu değeri düştüyse) hem hata toast'ı hem otomatik yeniden-çekme ile satırı "Öde"ye geri döndürür. `NotificationDropdown.tsx`'e `free_trial_ready`, `payment_required` ile AYNI `/payments?appointmentId=` dalına eklendi.
> - **Expert**: `features/reservations/api.ts::Appointment`'a `is_free_trial` eklendi. `appointments-table.tsx` + `appointment-detail-dialog.tsx`'teki var olan `PAYMENT_STATUS_LABELS` sabit lookup'ı yerine `is_free_trial`'a bakan bir `paymentBadgeLabel()` yardımcı fonksiyonu (proje konvansiyonu gereği iki dosyada da kopyalı) - "paid"+free_trial → "Ücretsiz İlk Seans", "unpaid"+free_trial → "Ücretsiz Seans Onayı Bekleniyor". Detail dialog'daki fiyat parantezi artık `is_free_trial` iken gösterilmiyor (yanıltıcı olurdu).
> - **Doğrulama**: Backend, gerçek dev `db.sqlite3`'e karşı `APIRequestFactory`/`force_authenticate` ile GERÇEK view'lar üzerinden 28/28 kontrolle doğrulandı (uzman-onayı→`is_free_trial=True`+Payment yok+doğru bildirim/mail, `status_update` yolu, "Devam Et"→Payment+Zoom+her iki tarafa bildirim, çift-tık→400, yarış durumu→400+bayrak sıfırlama, 403/404/401/400 yetki kontrolleri, eligibility true→false geçişi, `PATCH` ile `is_free_trial` yazma denemesinin yok sayıldığı) - tüm test verisi silinip sıfır kaldığı ayrıca sorgulandı. `manage.py check` + `makemigrations --check --dry-run` temiz. İki frontend'de de `npx tsc -b` + `npx vite build` temiz. **Hiçbiri gerçek tarayıcıda test edilmedi** (bkz. aşağıdaki "🟠 En öncelikli açık madde" - yeni madde 13).

> ## 🔧 Son Değişiklikler (2026-08-26, 29. tur) — Ödeme Akışının Randevu/Bildirim/Mail/İki Frontend Entegrasyonu
>
> 28. turda kurulan `payments/` app'i bu turda gerçek akışa bağlandı: kullanıcı "uzman bir seansı onayladığında danışana mail + bildirim gitsin, danışan yeni 'Ödemeler' sayfasından ödesin, ödeme başarılı olunca her iki tarafa bildirim gitsin, uzman panelinde ödeme durumu görünsün" akışının uçtan uca (backend + client + expert) kurulmasını istedi. Ek bağlam: Lunova bir bağımlılıkla mücadele platformu, seanslar tamamen dijital/online (bu, VIRTUAL basketItem varsayımını ve adres-placeholder kararını doğruladı, değiştirmedi).
>
> - **Backend — mail dallanması**: `mailer/services.py::send_payment_required_email()` (YENİ) — bir randevu onaylandığında/uzman tarafından oluşturulduğunda ödeme gerekiyorsa `send_appointment_confirmed_email`/`send_appointment_created_email` YERİNE bu çağrılıyor (CTA linki randevu detayına değil yeni `/payments?appointmentId=` sayfasına gider - Zoom henüz yok). `appointments/views.py::status_update()` ve `appointments/serializers.py::CreateAppointmentWithZoomSerializer.create()`, `grant_appointment_access_if_paid()`'in dönüş değerine göre iki mailden hangisinin gideceğine karar veriyor.
> - **Backend — bildirimler**: `notifications/models.py::Notification.TYPE_CHOICES`'a `payment_required`/`payment_succeeded` eklendi (migration `0004_alter_notification_notification_type`, sadece choices - DB şeması değişmedi). `notifications/services.py`'ye iki yeni fonksiyon: `create_payment_required_notification(appointment)` (SADECE danışana, `appointment` FK'sini kullanıyor - yeni alan gerekmedi) ve `create_payment_succeeded_notification(payment)` (hem danışana hem uzmana ayrı birer bildirim - BİLİNÇLİ OLARAK ücretsiz ilk seans hakkının tüketildiği anda çağrılmıyor, orada gerçek bir ödeme yaşanmıyor). `payments/services.py`'nin üç gerçek başarı noktasından (`_mock_complete_checkout`, `handle_checkout_callback`'in DIRECT dalı, `capture_preauth`) çağrılıyor - `payments`, `notifications.services`'i modül seviyesinde import ediyor (notifications payments'ı hiç import etmediği için döngü riski yok, appointments↔payments'taki gibi deferred import'a gerek kalmadı).
> - **Backend — `AppointmentSerializer` genişletildi**: `payment_status` (`not_applicable`/`unpaid`/`paid`, `payments.services.has_appointment_been_paid()`'ten hesaplanan SerializerMethodField), `session_price`/`session_currency` (`expert.expertprofile`'dan). Bu TEK ekleme hem client'ın yeni "Ödemeler" sayfasını hem expert panelindeki "ödendi mi" rozetini besliyor - ayrı bir endpoint gerekmedi, var olan `GET /appointments/` zaten kullanılıyordu.
> - **Client (danışan)**: yeni sidebar linki "Ödemeler" (`DollarLineIcon`, zaten var ama kullanılmayan bir ikon) → `/payments` (`pages/Payments/Payments.tsx`, YENİ) — "Bekleyen Ödemeler" (payment_status=unpaid, fiyat + "Öde" butonu + onay modalı) ve "Ödeme Geçmişi" (paid) olarak ikiye ayrılmış, `?appointmentId=` (bildirimden gelince) ilgili satırı vurguluyor. `POST /payments/appointments/{id}/checkout/` çağrısının yanıtına göre dallanıyor: mock modda (`mock:true`) anında başarı toast'ı + liste tazeleme, gerçek modda `payment_page_url`'e `window.location.href` ile yönlendirme. `pages/Payments/PaymentResult.tsx` (YENİ) — backend'in `checkout_callback`'inin gerçek modda yönlendirdiği `/payments/result?status=&appointment_id=` sonuç sayfası (mock modda hiç ziyaret edilmiyor, mock akış senkron tamamlanıyor). `NotificationDropdown.tsx`'e `payment_required` için yeni bir dal eklendi (`/payments?appointmentId=`); `payment_succeeded` var olan genel `appointment_id` fallback'ine (`/appointments/{id}`) düşüyor, ayrı dal gerekmedi. `types/appointment.ts`/`types/notification.types.ts` güncellendi.
> - **Expert (uzman)**: `features/reservations/api.ts::Appointment` tipine `payment_status`/`session_price`/`session_currency` eklendi. Hem `appointments-table.tsx` (yeni "Ödeme" kolonu) hem `appointment-detail-dialog.tsx`'e (yeni "Ödeme:" satırı, tutar bilgisiyle) var olan `STATUS_LABELS`/`statusVariant()` deseni BİREBİR taklit edilerek bir `PAYMENT_STATUS_LABELS`/`paymentStatusVariant()` çifti eklendi (projenin bu iki dosya arasında zaten tolere ettiği duplikasyon deseniyle tutarlı, yeni bir paylaşılan modül icat edilmedi). `features/notifications/api.ts`'teki `NotificationType`'a `payment_succeeded` eklendi - navigasyon mantığına dokunulmadı, zaten var olan genel `appointment_id` dalı yeterli.
> - **Doğrulama**: Backend tarafı gerçek dev `db.sqlite3`'e karşı 16 kontrolle uçtan uca doğrulandı (`APIRequestFactory`/`force_authenticate` ile GERÇEK view'lar üzerinden - `status_update` ile onay, `payment_required` maili+bildirimi, `AppointmentCheckoutView` ile mock ödeme, Zoom'un ödeme SONRASINA kadar oluşmadığı, `payment_succeeded`'in her iki tarafa da düştüğü, hem danışan-talep-eden hem uzman-doğrudan-oluşturan akışların ikisi de) - tüm test verisi temizlenip silindiği ayrıca sorgulanarak teyit edildi. `manage.py check` + `makemigrations --check` temiz. İki frontend'de de `npx tsc -b` + `npx vite build` temiz. **Hiçbiri gerçek bir tarayıcıda tıklanarak test edilmedi** - bu turun tek doğrulama yöntemi backend simülasyonu + derleme kontrolü (bkz. aşağıdaki "🟠 En öncelikli açık madde").

> ## 🔧 Son Değişiklikler (2026-08-26, 28. tur) — Yeni `payments/` App'i: iyzico Ödeme Entegrasyonu (Checkout Form)
>
> Kullanıcı ödeme altyapısını iyzico ile kurma isteğini iletti - platformun ana gelir modeli devreye giriyor: danışan her seans için öder (ileride toplu paket + %indirim + indirim kodu planlanıyor), ilk seans hesap bazında ücretsiz. Kod yazmadan önce üç mimari karar tartışıldı ve kullanıcı onayıyla karara bağlandı:
>
> - **Checkout Form (iyzico hosted sayfa) vs kendi non-3DS formu**: Checkout Form seçildi - gerekçe kod zorluğu değil kalıcı borç (PCI-DSS kapsamı SAQ-A vs SAQ-D, 3DS'in doğal olarak akışta olması vs non-3DS'in fraud/chargeback liability'sini merchant'a bırakması).
> - **`IYZICO_MODE` (mock/sandbox/production)**: `ENVIRONMENT`'tan BAĞIMSIZ yeni bir env değişkeni (backend/claude.md'de detaylandırıldı) - proje henüz gerçek prod'a çıkmadığı için (sadece local+sunucu-test var), "prod" olarak deploy edilen sunucu bile ödeme tarafında `sandbox` modda kalabiliyor; mail/storage'ın `ENVIRONMENT=Production`'a geçmesiyle ödemenin gerçek paraya geçmesi birbirine bağlı DEĞİL.
> - **Ödeme noktası**: kullanıcı önce "danışan talep göndermeden önce ödesin" eğilimindeydi, tartışma sonrası (reddedilen taleplerde hiç para hareketi olmaması + appointments state machine'ine dokunmama avantajları nedeniyle) **"uzman onayladıktan sonra, Zoom erişimi verilmeden hemen önce"** kararlaştırıldı. Kalan tek iade senaryosu (onaylı+ödenmiş bir randevunun sonradan iptali) için otomatik iyzico refund API'si BAĞLANMADI - admin panelinden manuel "İade Edildi" işaretlemesi yeterli görüldü (minimal başlangıç).
> - Kullanıcı ayrıca resmi iyzico dokümanlarını (docs.iyzico.com/odeme-metotlari/on-provizyon) bulup paylaştı: Checkout Form'un ön provizyon (preauth/postAuth/cancel) akışını da desteklediğini, bunun AYRI bir initialize endpoint'i (`preauth/ecom`, `auth/ecom`'un parametre varyasyonu DEĞİL) olduğunu belirtip bunun da kurulmasını istedi - appointments akışı şimdilik DIRECT (`auth/ecom`) kullanmaya devam edecek şekilde, PREAUTH tam çalışır durumda ama hiçbir yerden çağrılmadan kuruldu (ileride "talep anında bloke" politikasına geçilirse hazır).
> - **Backend**: yeni `payments/` app'i (`Payment` modeli + `services.py` + DRF view'ı + callback endpoint'i + admin). `appointments/services.py` yeni dosya - önceden `appointments/views.py` ve `serializers.py`'de AYRI AYRI kopyalanmış Zoom oluşturma mantığı tek noktaya (`ensure_zoom_meeting`) çıkarıldı, üstüne ödeme kontrolü ekleyen `grant_appointment_access_if_paid()` eklendi. Ücretsiz ilk seans hakkı ayrı bir alan/model DEĞİL - danışanın daha önce `SUCCEEDED` bir ödemesi (ücretsiz olan da `amount=0 SUCCEEDED` olarak kaydedilir) olup olmadığından hesaplanıyor (messaging'in seans-kotası deseniyle tutarlı). Var olan ama hiç kullanılmayan `ExpertProfile.free_first_session` alanına (uzman-bazlı, farklı bir kavram) BİLİNÇLİ OLARAK dokunulmadı.
> - **iyzico Python SDK doğrulaması gerçek kaynaktan yapıldı** (uydurulmadı): resmi dokümanlar preauth/postAuth/cancel endpoint path'lerini tam vermeyince, SDK'nın kendi GitHub reposundaki (`iyzico/iyzipay-python`) `samples/` dizini doğrudan çekilip tam parametre/response şekli oradan alındı. `iyzipay==1.0.46` eklendi.
> - **Adres/buyer alanı boşluğu (bilinçli basitleştirme)**: iyzico Checkout Form zorunlu tuttuğu `buyer`/`billingAddress` alanları (city/country/zipCode) için Lunova hiç veri toplamıyor (video seans satıyor, fiziksel adres hiç collect edilmemiş) - kimlik/iletişim alanları (TCKN/telefon/email) gerçek, adres alanları sabit bir yer tutucu. 🟢 Düşük öncelik, iyzico'nun risk motoru sorun ederse gerçek adres toplanması gerekebilir.
> - **Doğrulama**: gerçek dev `db.sqlite3`'e karşı 26/26 kontrol geçti (ücretsiz hak kullanımı, ödeme gating [ödenmeden Zoom açılmıyor], `IYZICO_MODE=mock`'ta anında başarı+Zoom tetikleme, çift ödeme engeli, eksik `session_price`/TCKN hataları, `AppointmentCheckoutView`'ın gerçek `force_authenticate` ile 403/201/400/404/401 döndüğü, `unittest.mock.patch` ile sahtelenen iyzico SDK çağrılarıyla callback/postAuth/cancel'ın DIRECT/PREAUTH dallanmaları) - oluşturulan TÜM test verisi script sonunda silinip silindiği ayrıca sorgulanarak teyit edildi. `manage.py check` + `makemigrations --check --dry-run` temiz. Detay: backend/claude.md 22. tur.
> - **Bilinçli olarak bu turda YAPILMADI**: frontend entegrasyonu (client'ta "ödeme yap" akışı, checkout sayfası/yönlendirmesi, sonuç sayfası) - backend'e odaklanıldı, ayrı bir aşama. Gerçek sandbox/production key'leri yok (kullanıcı sonra edinip `.env`'e ekleyecek, `IYZICO_MODE=mock` varsayılan olarak sorunsuz çalışıyor). Toplu seans paketi/%indirim/indirim kodu - `Payment.metadata`/`payment_type` şema olarak buna hazır ama model/mantık kurulmadı (bkz. aşağıdaki "🧭 Geliştirme Fikirleri").

> ## 📜 27. tur — arşivlendi (özet)
>
> `accounts/tests/feed_accounts.py::seed_named_team_accounts()`'un ürettiği isimlendirilmiş ekip test hesapları (selin, selen, onur, ece, eslem, yusuf, +yeni "samet") gerçek ad/soyad + `@lunova.tr` mailleriyle güncellendi, ekibin yarısı uzman yarısı danışan tarafında gerçek kimlik taşıyacak şekilde bir `role` alanı eklendi (`appointments`/`messaging` feed'lerindeki kopyaları da senkronize edildi), canlı `db.sqlite3` da aynı şekilde güncellendi. Net sonuç `git log -p -- CLAUDE.md` ile geri getirilebilir.

> ## 📜 26. tur — arşivlendi (özet)
>
> Randevu talep/onay/iptal durumları için otomatik mail bildirimi (`send_appointment_created_email`/`send_appointment_confirmed_email`/`send_appointment_cancellation_email`) + ortak Lunova HTML şablonu + asenkron gönderim eklendi. Bu, 28-29. turda kurulan ödeme mailinin ÜZERİNE inşa edildiği temel — `send_payment_required_email` aynı `send_template_email_async` altyapısını kullanıyor. Net sonuç yukarıdaki "📊 Sistem Durumu Özeti"nde duruyor, tam ayrıntı `git log -p -- CLAUDE.md` ile geri getirilebilir.

> ## 🔧 Son Değişiklikler (2026-08-24, 26. tur) — Randevu Durumu Mailleri (Talep/Onay/İptal) + Ortak HTML Şablon + Asenkron Gönderim
>
> Kullanıcı 25. turdaki tartışmadan sonra harici bir mail servisine (SendGrid/Mailgun/SES vb.) şimdilik geçmek istemediğini, mevcut Gmail SMTP'yle devam edeceğini netleştirdi. Sıradaki iş olarak randevu talep/onay/iptal durumlarını mail ile bildiren mantığın kurulmasını, tüm seans mailleri için ORTAK bir HTML şablon (logosuz, sade "Lunova" yazılı) tasarlanmasını, şifre sıfırlama mailinin de aynı şablona geçirilmesini, gönderimin sistem akışını YAVAŞLATMAMASI için asenkron olmasını ve hata durumunda akışı bozmadan sadece loglanmasını istedi.
>
> - **`mailer/services.py` yeniden yapılandırıldı**: `_dispatch()` artık düz `send_mail` yerine `EmailMultiAlternatives` kullanıyor (hem düz metin hem HTML gövde taşıyabiliyor). Üzerine iki katman eklendi: `send_template_email()` (senkron, ortak şablonla render eder) ve `send_template_email_async()` (aynısını `threading.Thread` ile arka planda çalıştırır, `fail_silently`'yi HER ZAMAN `True`'ya zorlar + thread içi HERHANGİ bir hatayı [SMTP dışı, örn. template render hatası dahil] ayrıca yakalayıp loglar - `_dispatch`'in kendi try/except'i sadece SMTP'yi kapsadığı için bu ek katman gerekliydi).
> - **Yeni `mailer/templates/mailer/base_email.html`**: tek, paylaşılan bir Lunova şablonu (mavi başlıkta sade "Lunova" yazısı - logo YOK, kullanıcı isteğiyle -, başlık/paragraflar/opsiyonel bilgi kutusu/opsiyonel CTA butonu, tablo tabanlı basit inline-CSS - email client uyumluluğu için). `send_password_reset_email` DE bu şablona geçirildi (artık "Merhaba {isim}," selamlamalı) - **ama bilinçli olarak SENKRON kaldı** (`send_template_email`, async değil): o istekte mail göndermek yan etki değil isteğin asıl amacı, başarısız olursa kullanıcıya 500 olarak yansımalı.
> - **3 yeni tipli fonksiyon** (`mailer/services.py`, appointment nesnesi duck-typed - mailer `appointments`'ı import etmiyor): `send_appointment_created_email(appointment)` (durum bazlı dallanır: `waiting_approval` → uzmana "yeni talep", `pending` → danışana "sizin için planlandı" - `notifications/services.py::create_document_status_notification()`'daki "tek fonksiyon, durum bazlı dallanma" deseniyle tutarlı), `send_appointment_confirmed_email(appointment)` (→ danışana), `send_appointment_cancellation_email(appointment, *, actor)` (durum bazlı dallanır: `cancel_requested` → uzmana, `cancelled` → `actor`'a göre işlemi YAPMAYAN tarafa). CTA linkleri, 14. turdaki bildirim sisteminin AYNI deep-link'lerini yeniden kullanıyor (`client: /appointments/{id}`, `expert: /reservations?appointmentId={id}`) - tutarlılık için.
> - **`appointments/serializers.py`**: `ClientCreateAppointmentSerializer.create()` ve `CreateAppointmentWithZoomSerializer.create()`'ın sonuna `send_appointment_created_email(appointment)` eklendi. **`appointments/views.py::status_update()`**: `instance.save()`'den sonra `new_status`'e göre `send_appointment_confirmed_email`/`send_appointment_cancellation_email` çağrılıyor (`actor=request.user`). İkisi de modül seviyesinde `from mailer.services import ...` (zoom.services'in appointments'ta zaten kullanılan import deseniyle aynı - mailer'ın appointments'a bağımlı olmaması sayesinde döngüsel risk yok).
> - **Asenkron tasarım kararı**: Celery/kuyruk kurulmadı - projede hâlâ hiçbir arka plan görev altyapısı (Redis/broker) yok, bu ölçek için `threading.Thread` yeterli görüldü. **Bilinen kısıt** (kullanıcıya da söylendi): süreç mail gönderilmeden ÖNCE çökerse/yeniden başlarsa o mail kaybolur, retry mekanizması yok - kabul edilebilir çünkü mail burada ana veri kaynağı değil (randevu durumu zaten DB'ye senkron yazıldı), sadece bir bilgilendirme.
> - **Doğrulama**: `manage.py check` temiz. Gerçek DB'de: (1) tüm 5 randevu-maili dallanması (`created`×2 yön, `confirmed`, `cancel_requested`, `cancelled`×2 yön) doğrudan fonksiyon çağrısıyla, thread'ler `join()` edilerek doğru alıcı/içerik/CTA-link ile test edildi; (2) `AppointmentDetailView.status_update()` GERÇEK `APIRequestFactory` PATCH isteğiyle (confirmed→cancel_requested→cancelled zinciri) uçtan uca çalıştırılıp hem `200` yanıtların hem doğru maillerin geldiği görüldü (views.py'deki import wiring'in gerçekten çalıştığının kanıtı); (3) HTML şablonu `render_to_string` ile hatasız render olduğu + içerik/CTA doğru göründüğü ayrıca doğrulandı; (4) production + gerçek console `EmailBackend` ile `EmailMultiAlternatives.send()`'in çalışıp `multipart/alternative` (text+html) ürettiği doğrulandı; (5) SMTP hatası simülasyonunda senkron çağrının (`fail_silently=False`) exception fırlattığı, asenkron çağrının (`fail_silently=True` zorlanmış) HİÇBİR exception sızdırmadan sadece loglayıp tamamlandığı ayrı ayrı doğrulandı; (6) şifre sıfırlama akışı yeni şablon+selamlamayla yeniden `APIRequestFactory` ile test edildi, davranış (200/500) değişmedi.
> - **Not**: kullanıcı bu servislerden birine (SendGrid/Mailgun/SES/Postmark) ilerleyen zamanlarda geçilmesi gerektiğini açıkça kaydetmemizi istedi - bu, `mailer/services.py`'nin kendi docstring'ine VE aşağıdaki "🧭 Geliştirme Fikirleri"ne not düşüldü. `_dispatch()` tüm gönderimi tek bir yerden yaptığı için böyle bir geçiş ileride sadece orada yapılacak, çağıran taraflar (appointments, accounts) etkilenmeyecek.

> ## 📜 25. tur ve öncesi — arşivlendi (özet)
>
> 25. tur (yeni `mailer` app'i, `send_email()`/`send_password_reset_email()`, `PasswordResetRequestView`'in merkezi servise taşınması, görünen isim desteği) artık yukarıdaki "📊 Sistem Durumu Özeti"nde ve alttaki "✅ Kapatılmış" listesinde özetlenmiş durumda. Tam ayrıntı `git log -p -- CLAUDE.md` ile geri getirilebilir - repo tek bir `git subtree`-birleşik depo olduğu için bu her zaman çalışır (bkz. aşağıdaki "⚠️ Repo Yapısı" notu). 24. tur ve öncesinin arşiv özeti için aşağıdaki "📜 Daha Eski Turlar" bölümüne bakın.

> ## 🔧 Son Değişiklikler (2026-08-24, 25. tur) — Yeni `mailer` App'i: Mail Gönderimi Merkezi Bir Servise Taşındı
>
> Kullanıcı önce backend'in mail konusunda ne yapabildiğini sordu (tek bir yer bulundu: şifre sıfırlama, `PasswordResetRequestView` içine gömülü `send_mail` çağrısı), sonra bunun mimaride nereye toplanmasının doğru olduğunu tartıştık; kullanıcı ileride seans hatırlatması, sistem/admin duyuru-kampanya, randevu talebi/iptal durumu ve danışan mesajı → uzman bildirimi gibi birçok yeni mail türü ekleneceğini belirtip ayrı bir `mailer` app'i kurulmasını istedi.
>
> - **Yeni `backend/mailer/` app'i**: `zoom/` app'inin şekliyle birebir aynı (sadece `apps.py` + `services.py`, models.py/migrations/views/urls YOK — REST kaynağı değil, diğer app'lerin doğrudan import ettiği bir servis katmanı), `INSTALLED_APPS`'a eklendi.
> - **`mailer/services.py::send_email(to_email, subject, body, *, fail_silently=False)`**: tüm gelecekteki mail türlerinin ortak geçiş noktası. "Gerçekten SMTP'ye mi gidilecek yoksa konsola mı loglanacak" kararı (`settings.ENVIRONMENT != 'Production'`) artık SADECE burada veriliyor — önceden bu kontrol `PasswordResetRequestView` içine özel yazılmıştı, yeni bir mail türü eklendikçe tekrar tekrar kopyalanması gerekecekti. `fail_silently=True` (varsayılan `False`, orijinal davranışı korur) ileride bir yan-etki maili (örn. bir durum güncellemesiyle birlikte atılan bildirim) SMTP arızası yüzünden ana işlemi 500'letmesin diye eklendi.
> - **`send_password_reset_email(to_email, reset_url)`**: ilk (ve şimdilik tek) tipli sarmalayıcı — `notifications/services.py`'deki "her olay için ayrı fonksiyon" deseniyle tutarlı, bilinçli olarak bir enum/registry veya Django email template'i eklenmedi (tek mail türü varken soyutlamak YAGNI'ye aykırı olurdu).
> - **`accounts/views/views.py::PasswordResetRequestView`**: artık `django.core.mail.send_mail`'i doğrudan çağırmıyor, `send_password_reset_email()`'i çağırıp exception'ı kendi 500 response'una çeviriyor. View'ın kendi dev-only Postman-body/prod-URL-önizleme print'leri AYNEN korundu (bunlar mailer'ın genel işi değil, şifre sıfırlamaya özel test kolaylığı).
> - **Görünen isim (aynı tur, kullanıcı takibiyle eklendi)**: kullanıcı From adresinin (`noreply@lunova.tr`) Gmail hesabına gerçekten girip cevapları görebileceğini doğruladıktan sonra, harici bir mail servisine geçmeden sade bir "görünen isim" istedi. `send_email()`'e `from_name: str = DEFAULT_FROM_NAME` (`"Lunova Destek"`) parametresi eklendi — From ADRESİ (`EMAIL_HOST_USER`, Gmail'in giriş kimliğiyle eşleşmek zorunda) DEĞİŞMEDİ, sadece alıcının gördüğü etiket `"Lunova Destek <noreply@lunova.tr>"` şeklinde birleşiyor. Mail türüne göre override edilebilir (örn. ileride bir duyuru maili farklı bir isim kullanabilir) — `send_password_reset_email()` varsayılanı kullanıyor. Dev-mode konsol logu da From'u göstermesi için güncellendi; `APIRequestFactory` ile yeniden çalıştırılıp çıktıda `From: Lunova Destek <noreply@lunova.tr>` göründüğü doğrulandı.
> - **Doğrulama**: `manage.py check` + `makemigrations --check --dry-run` temiz. Gerçek `db.sqlite3` üzerinde `APIRequestFactory` ile (view salt-okunur, hiçbir yazma yapmıyor, veriye zarar riski yok): (1) dev ortamında `200` + mailer'ın konsol logu + view'ın orijinal Postman/prod-URL çıktısı birebir korunmuş görüldü; (2) `ENVIRONMENT='Production'` + gerçek console `EmailBackend` ile `django_send_mail`'in gerçekten çağrılıp `True` döndürdüğü doğrulandı; (3) `django_send_mail` mock'lanıp hata fırlatıldığında `fail_silently=False`'ın (varsayılan) exception'ı fırlattığı, `fail_silently=True`'nun `False` döndürüp yuttuğu ayrı ayrı doğrulandı; (4) view seviyesinde production'da SMTP hatası simüle edilip `500 {"error": "..."}` döndüğü (orijinal davranışla birebir) doğrulandı.
> - **Bilinçli olarak bu turda YAPILMADI (YAGNI + kullanıcının kendi aşamalı planı)**: `EmailLog` modeli/admin kaydı, Django email template'leri, toplu/kitlesel gönderim (`send_mass_mail` benzeri), zamanlanmış görev altyapısı (randevu hatırlatma maili için gerekecek — bkz. "🧭 Geliştirme Fikirleri" madde 1) ve randevu/mesaj olaylarının mailer'a bağlanması (kullanıcı bunu kendisi bir sonraki aşamada kuracağını belirtti).
> - 🟢 **Düşük, yeni bulgu**: `settings.DEFAULT_FROM_EMAIL` hâlâ tanımlı ama gerçek gönderim yolunda kullanılmıyor — bilinçli olarak orijinal davranış (`EMAIL_HOST_USER` gönderen adresi) korundu (Gmail SMTP genelde From'un kimlik doğrulama hesabıyla eşleşmesini istiyor, `DEFAULT_FROM_EMAIL`'e geçmek deployment'ta sessiz bir teslim sorununa yol açabilirdi).

> ## 📜 Daha Eski Turlar (2026-08-24, 24. tur ve öncesi) — arşivlendi
>
> Kural (e) gereği ("📌 Kalıcı Kural" → Şişmeyi önleme) 24. tur ve öncesinin ayrıntılı prose'u bu dosyadan çıkarıldı — net sonuçları zaten yukarıdaki **"📊 Sistem Durumu Özeti → ✅ Kapatılmış kritik/yüksek öncelikli maddeler"** listesinde tek satırlık özetler olarak duruyor (belge indirme kaldırılıp yerine expert'teki "Görüntüle" deseni getirildi [24. tur], onaylanmış belgeler de artık silinebiliyor/deactivate edilebiliyor [23. tur], belge indirme CORS hatası [credentialed cross-origin isteğin Supabase'in wildcard CORS yanıtıyla çakışması] düzeltildi [22. tur], belge silme = aktif/pasif [deactivate] özelliği danışan+uzman panelinde eklendi [21. tur], belge onay/red akışı [admin] + admin panel genel güçlendirmesi + form versiyon numarası görünürlüğü eklendi [20. tur], 🔴 kritik danışan belge/profil fotoğrafı yükleme akışı düzeltmesi + deploy/altyapı teşhis serüveni [Render/Supabase Frankfurt taşınması, IPv6/Session pooler, `.env` bozuk değerleri] + `default-avatar.png` sonsuz döngü bug'ı + kullanıcının 7 maddelik UX listesi + testte bulunan 3 ek bug [19. tur], veritabanı besleme script'lerine isimlendirilmiş ekip hesapları + `messaging`/`notifications` feed'leri + `feed_db.py` orkestrasyon script'i eklendi [18. tur], Notlar sistemi saatlik throttle'dan seans-bazlı mesaj kotasına çevrildi [17. tur], "Notlar" uzman-danışan not/mesaj sistemi eklendi [16. tur], danışan formları matrisi + 🔴 kritik `client_id` çakışma bug'ı düzeltmesi [15. tur], global bildirim sistemi eklendi [14. tur], Formlar'daki `yes_no` seçenek kaybı bug'ının gerçek kök nedeni bulunup düzeltildi [13. tur], Formlar sekmesinin ilk tarayıcı testinden 4 bulgu [12. tur], danışan formları + otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], doküman sistemi iyileştirmesi + `expert/ToDo.md` konsolidasyonu [9. tur], ana sayfa scroll bug'ı + expert çift-modal bug'ı + Zoom 15dk kısıtı + takvim renklendirmesi [8. tur], mobil header/sidebar bug'ları + marka/UI temizliği + client ana sayfası + Clerk sökümü [7. tur], toast z-index bug'ı [6. tur], CSRF koruması [5. tur], access token refresh [3. tur], profil "beyaz sayfa" zinciri [devam turu], randevu 3-ID karışıklığı + login/me `id`/`role` eksikliği [Randevu Zinciri turu], `AvailabilityExceptionView`/`ExpertAvailability` navigate no-op [4. tur]). Tam ayrıntı (kod örnekleri, curl doğrulama adımları) kayıp değil — `git log -p -- CLAUDE.md` ile bu dosyanın o zamanki hâli her zaman geri getirilebilir (repo artık `git subtree` ile birleşmiş tek bir depo, bkz. aşağıdaki "⚠️ Repo Yapısı" notu).
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-22, 24. tur — Belge İndirme Kaldırıldı, Yerine Expert'teki "Görüntüle" Deseni Getirildi
> - 2026-08-22, 23. tur — Onaylanmış Belgeler Artık Silinebiliyor (Deactivate)
> - 2026-08-22, 22. tur — 🐛 Belge İndirme Kırıktı: CORS + Credentialed Cross-Origin İstek Çakışması
> - 2026-08-22, 21. tur — Belge Silme = Aktif/Pasif (Deactivate), Danışan+Uzman Panelinde Silme Butonu
> - 2026-08-22, 20. tur — Yeni Özellik: Belge Onay/Red Akışı (Admin) + Admin Panel Genel Güçlendirme + Form Versiyon Numarası Görünürlüğü
> - 2026-08-22, 19. tur — 🔴 Kritik: Danışan Belge/Fotoğraf Yükleme Tamamen Bozuktu + Deploy/Altyapı Teşhis Serüveni + Kapsamlı UX Düzeltme Turu
> - 2026-08-20, 17. tur — Notlar: Saatlik Throttle Yerine Seans-Bazlı Mesaj Kotası + Dinamik UI
> - 2026-08-20, 16. tur — Yeni Özellik: Uzman-Danışan Not/Mesaj Sistemi ("Notlar")
> - 2026-08-20, 15. tur — Danışan Formları Matrisi + 🔴 Kritik Backend Bug Düzeltmesi
> - 2026-08-20, 14. tur — Yeni Özellik: Global Bildirim Sistemi (Client + Expert + Backend)
> - 2026-08-20, 13. tur — Formlar: Gerçek Kök Neden Bulundu (12. Turun Teşhisi Yanlıştı)
> - 2026-08-20, 12. tur — Formlar: İlk Tarayıcı Testinden Çıkan 4 Bulgu
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
Backend (Django)         🟢 Sağlam temel; oturum yönetimi + CSRF koruması tamamlandı (curl ile doğrulandı); Zoom mock URL placeholder'a çevrildi (10. tur); `forms/` modülüne otomatik versiyonlama + admin güvenlik katmanı eklendi, kritik bir skorlama pipeline hatası (total_score hep 0 kalıyordu) düzeltildi (11. tur); yeni `notifications/` app eklendi (14. tur); yeni `messaging/` app eklendi — uzman-danışan not sistemi, önce saatlik throttle denendi sonra seans-bazlı bir mesaj kotasına çevrildi (`Appointment`/`Message` verisinden hesaplanan, ayrı bir model/alan olmadan), `APIRequestFactory` ile gerçekten çalıştırılarak doğrulandı (16-17. tur); tüm app'lerin `feed_*.py` script'lerini tek sırada çalıştıran `backend/feed_db.py` + isimlendirilmiş ekip test hesapları + `messaging`/`notifications` için ilk kez feed script'i eklendi, bir DB kopyası üzerinde uçtan uca gerçekten çalıştırılarak doğrulandı (18. tur); belge onay/red akışı (`Document.status` + admin toplu aksiyonları + `document_status` bildirimi) + Django admin panelinin genel güçlendirilmesi (kullanıcı/uzman/belge toplu aksiyonları) + form versiyon numarasının API'lerde görünür kılınması eklendi, gerçek bir DB kopyasında + gerçek bir admin HTTP isteğiyle doğrulandı, bu süreçte kendi bulunan bir admin `save_model()` bug'ı (eşzamanlı alan değişikliği kaybı) düzeltildi (20. tur); belge "silme"nin gerçek bir DELETE değil `is_current` aktif/pasif anahtarına bağlı bir deactivate olduğu netleştirildi (`DocumentDeleteView`'daki gereksiz `storage.delete()` çağrısı kaldırıldı, dosya storage'da kalıyor) + admin'de aktif/pasif toplu aksiyonları eklendi (21. tur); mail gönderimi artık merkezi bir `mailer/` app'ine taşındı (`send_email()`/`send_password_reset_email()`, `zoom/` app'iyle aynı model/migration'sız servis-katmanı şeklinde) — `PasswordResetRequestView` artık `send_mail`'i doğrudan çağırmıyor, ileride eklenecek her yeni mail türü (hatırlatma, duyuru, randevu durumu) aynı merkezi noktadan geçecek (25. tur); ortak bir Lunova HTML şablonu (`mailer/templates/mailer/base_email.html`) + asenkron gönderim (`threading.Thread`, hata durumunda akışı bozmadan loglayıp geçen `fail_silently`) eklendi, randevu talep/onay/iptal durumları artık `appointments/serializers.py` + `views.py::status_update()`'ten otomatik mail bildirimi tetikliyor, şifre sıfırlama maili de aynı şablona geçirildi (bilinçli olarak senkron kaldı) (26. tur); yeni `payments/` app'i ile iyzico Checkout Form entegrasyonu eklendi — danışan uzman onayından sonra/Zoom erişimi verilmeden hemen önce öder, hesap bazında ömür boyu 1 kez ücretsiz ilk seans (ayrı alan yok, hesaplanan), `IYZICO_MODE` (mock/sandbox/production) `ENVIRONMENT`'tan bağımsız yeni env değişkeni, DIRECT akış appointments'a bağlı + resmi dokümandan doğrulanmış PREAUTH/postAuth/cancel akışı hazır ama henüz bağlı değil, `appointments/services.py` yeni dosyada Zoom oluşturma mantığı tekilleştirildi, gerçek dev DB'ye karşı 26/26 kontrol geçti (28. tur); ödeme akışı gerçek randevu yaşam döngüsüne bağlandı - onay/oluşturma anında ödeme gerekiyorsa `send_payment_required_email` + `payment_required` bildirimi, gerçek bir ödeme tamamlanınca hem danışana hem uzmana `payment_succeeded` bildirimi, `AppointmentSerializer`'a `payment_status`/`session_price`/`session_currency` eklendi (hem client'ın yeni Ödemeler sayfasını hem expert'in ödeme rozetini besliyor) (29. tur); ücretsiz ilk seans artık uzman onayladığı anda sessizce tüketilmiyor - `Appointment.is_free_trial` bayrağı + yeni `free_trial_ready` bildirim/mail türü + `confirm_free_trial()` (`POST /payments/appointments/<id>/confirm-free-trial/`, danışanın "Devam Et" onayıyla asıl Payment'ı burada oluşturuyor, `transaction.atomic()`+`select_for_update()` ile yarış durumuna karşı korumalı) + `GET /payments/free-trial-eligibility/` (promosyon banner'ları için), gerçek dev DB'ye karşı 28/28 kontrolle doğrulandı (30. tur)
Client (danışan, Redux)  🟢 401/refresh otomatik, CSRF token otomatik ekleniyor; profil/randevu form hataları + mobil header/sidebar bug'ları kapatıldı; ana sayfa gerçek widget'larla donatıldı (7. tur); "Formlar" sekmesi eklendi (11. tur); "seçenekler kayboluyor" bug'ının gerçek kök nedeni bulunup düzeltildi (13. tur); sahte veriyle çalışan TailAdmin bildirim taslağı gerçek bir bildirim sistemine bağlandı (14. tur); yeni "Notlar" sayfası eklendi (16-17. tur); 🔴 kritik bir bug bulundu ve düzeltildi — belge/profil fotoğrafı yükleme akışı var olmayan bir endpoint'e istek attığı için tamamen bozuktu (gerçek Supabase'e karşı uçtan uca doğrulandı), 🟠 `default-avatar.png` eksikliğinin yol açtığı sonsuz istek döngüsü + kullanıcının 7 maddelik UX listesi (spinner'lar, dropdown, kontrast, accordion→otomatik-açık) + testte bulunan 3 ek bug (slot seçim çakışması, çift-tıklama yarışı, bozuk spinner path'i) düzeltildi (19. tur); belge onay/red rozeti 3 duruma çevrildi + form versiyon numarası köşe yazısı eklendi + kendi bulunan ilgisiz bir `Document.filename` tip bug'ı düzeltildi (20. tur); `UserDocumentsCard.tsx`'teki `handleDeleteDocument` stub'ı gerçek bir silme (deactivate) akışına bağlandı, onay modalı + `useToast` eklendi (21. tur); 🐛 kullanıcının gerçek tarayıcıda bulduğu ilk gerçek bug düzeltildi — belge indirme `handleDownload()`'ın Supabase'in dış imzalı URL'sini credentialed `api` instance'ıyla çekmesi CORS hatası veriyordu, credential'sız düz `fetch()`'e çevrildi (22. tur); yeni "Ödemeler" sayfası (sidebar'a eklendi) - bekleyen ödemeler + ödeme geçmişi, `POST /payments/appointments/{id}/checkout/` çağırıp mock/gerçek modu ayırt ediyor (mock: anında toast, gerçek: `payment_page_url`'e redirect), yeni `/payments/result` sonuç sayfası, bildirim tıklaması `payment_required` için buraya yönleniyor (23. tur); ücretsiz ilk seans artık aynı sayfada "Devam Et" ile ayrı bir onay adımından geçiyor (kart bilgisi yok, `confirm-free-trial` ucu), yeni `FreeTrialBanner.tsx` ana sayfa+randevu alma akışında "ilk seansınız ücretsiz" promosyonu gösteriyor, `free_trial_ready` bildirimi `payment_required` ile aynı yönlendirmeyi paylaşıyor (24. tur) — bu turlarda upload akışı dışında geri kalanı sadece `tsc`/`build`, gerçek tarayıcıda hâlâ test edilmedi
Expert (uzman, Zustand)  🟢 Randevu/profil zinciri düzeltildi, CSRF token otomatik ekleniyor; Lunova logosu eklendi, Clerk + şablon demo sayfaları tamamen söküldü (7. tur); "Danışan Formları" sekmesi eklendi (11. tur); sıfırdan bir bildirim sistemi eklendi (14. tur); "Danışan Formları" dropdown yerine danışan×form matris tabloya çevrildi, 🔴 kritik bir backend bug'ı (client_id çakışması) bulunup düzeltildi (15. tur); yeni "Notlar" özelliği (roster + not paneli, danışanın kalan hakkı parantez içinde, bildirim ziliyle entegre) eklendi (16-17. tur); 🟠 prod'da F5/derin link'te Netlify'ın kendi 404'ü geliyordu, eksik olan `public/_redirects` eklendi (19. tur); belge onay/red rozeti + form versiyon numarası dialog başlığında gösterimi eklendi (20. tur); önceden var ama hiçbir UI'ya bağlı olmayan `deleteDocument()` API fonksiyonu `profile-view.tsx`'e bağlandı, `handleApiError`'da kendi bulunan bir DRF-dizi-hatası bug'ı düzeltildi (21. tur); randevu tablosu + detay dialog'una "Ödeme" rozeti eklendi (Ödendi/Ödeme Bekliyor, var olan status-badge deseni taklit edildi) (20. tur); rozet artık `is_free_trial`'a göre "Ücretsiz İlk Seans"/"Ücretsiz Seans Onayı Bekleniyor" metnini de ayırt ediyor (21. tur) — `tsc -b`/`build` temiz ama gerçek tarayıcıda test edilmedi; hata mesajı gösterimi (.title bug) hâlâ yanlış ama React Query hiç kullanılmadığı için şu an pasif risk
Entegrasyon (backend↔fe) 🟢 CSRF koruması aktif ve gerçekçi bir curl zinciriyle sıkı doğrulandı; tek eksik gerçek tarayıcıda tıklanarak test — 7-8-10-11-12-13-14-15-16-17-19-20-21. turlardaki UI değişiklikleri de aynı nedenle henüz tarayıcıda tıklanarak doğrulanmadı (bkz. 🟠 aşağıda). 19. turda Render (backend) + Supabase (DB+storage) Frankfurt'ta ortaklaştırıldı ve Supabase Storage bağlantısı için iki ayrı gerçek `.env` hatası düzeltildi. 20. turda "admin panelini kullanışlı hale getir" isteği net bir kapsamla (sadece Django `/admin/`, ayrı bir admin frontend YOK) karşılandı — `FRONTEND_URLS`'teki `admin` anahtarının ne için kullanılacağı sorusu hâlâ açık (muhtemelen sadece parola sıfırlama e-postası linki). 21. turda iki frontend'de de aynı DRF davranışı (`ValidationError` düz string'i ham bir dizi olarak serialize ediyor) ayrı ayrı bulunup düzeltildi - iki bağımsız kod tabanında aynı sınıf hatanın tekrarlandığı bir örnek
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
- Uzman-danışan ikilisi arasında görüntülü görüşme dışında iletişim için hiçbir mekanizma yoktu → klasik chat DEĞİL, kompakt bir "not bırakma" sistemi eklendi: sıfırdan `messaging/` app'i (Conversation+Message, `other_user_id` her yerde `User.id`) + iki frontend'de sıfırdan "Notlar" sayfası + bildirim ziline entegrasyon (16. tur).
- 16. turdaki saatlik gönderim sınırı (30/hour) kullanıcı isteğiyle seans-bazlı bir mesaj kotasına çevrildi: iki seans arası toplam 5 danışan mesajı hakkı, her tamamlanan seans sonrası yenilenen — `Appointment`/`Message` verisinden hesaplanan, ayrı bir model/alan içermeyen bir tasarım. Danışan tarafında dinamik kalan-hak göstergesi + açıklama modalı + hak bitince kırmızı border/disable + 200 karakter limiti, uzman tarafında danışanın hakkının parantez içinde gösterilmesi, iki frontend'de de gönderilmemiş taslakların localStorage'da korunması eklendi; 10 senaryo gerçek DB verisiyle `APIRequestFactory` ile uçtan uca doğrulandı (17. tur).
- Veritabanı besleme script'leri: `accounts`/`appointments` feed'lerine isimlendirilmiş ekip test hesapları (selin, selen, onur, ece, eslem, gokcen, niga, mustafa, yusuf — her biri için eşleşmiş bir uzman+danışan çifti) + `messaging`/`notifications` app'leri için (önceden hiç yoktu) ilk feed script'leri eklendi; backend kökünde tüm feed'leri doğru sırayla çalıştıran `backend/feed_db.py` orkestrasyon script'i oluşturuldu. Gerçek `db.sqlite3`'ün bir kopyası üzerinde uçtan uca gerçekten çalıştırılarak doğrulandı (18. tur).
- 🔴 [KRİTİK] Danışan tarafında profil fotoğrafı/belge yükleme tamamen bozuktu — `UploadDocumentModal.tsx` var olmayan bir endpoint'e (`/documents/upload/`) istek atıyordu, backend'e hiç ulaşmadan HER deneme 404 alıyordu → expert'in zaten doğru uyguladığı 3 adımlı (presign→PUT→finalize) akışla değiştirildi, gerçek bir Supabase projesine karşı uçtan uca doğrulandı. Bunu düzeltirken/test ederken art arda üç ayrı sorun daha çıktı: `backend/.env`'deki `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` değerleri gerçekten bozuktu (muhtemelen bir yerden kısmen maskelenmiş görünen metin kopyalanmıştı, literal `*` karakterleri içeriyordu → DNS çözülemiyordu), sonra yanlış anahtar TİPİ kullanılmıştı (`publishable`/anon yerine `secret`/service_role gerekiyordu, RLS hatası veriyordu) — ikisi de teşhis edilip kullanıcı tarafından düzeltildi (19. tur).
- 🟠 [YÜKSEK] `default-avatar.png` dosyası hiç mevcut değildi, `UserMetaCard.tsx`'teki `onError` handler'ı fallback görsel de 404 alınca kendini tekrar tetikleyip sonsuz bir istek döngüsüne giriyordu (fotoğrafsız — yukarıdaki bug yüzünden pratikte neredeyse tüm — danışanlarda) → gerçek bir `default-avatar.svg` + `onerror=null` guard'ı eklendi (19. tur).
- Render backend Oregon'da, Supabase DB Seoul'daydı — yarı dünya turlayan her sorgu gözle görülür bir yavaşlığa sebep oluyordu → ikisi de Frankfurt'a (Türkiye'ye coğrafi olarak en yakın makul seçenek) taşındı, kullanıcı hızlanmayı doğruladı (19. tur).
- Prod'da expert'te F5/derin link'te Netlify'ın kendi 404'ü geliyordu → eksik olan `expert/public/_redirects` eklendi (`client`'ta zaten vardı) (19. tur).
- Kullanıcının verdiği 7 maddelik danışan UX listesi (avatar konumu, login/kaydet/randevu-gönder spinner'ları, header dropdown sadeleştirme+Türkçeleştirme, yükleme modalındaki `<select>`'in okunamaz kontrast bug'ı, profil fotoğrafı dışı yüklemelerde gereksiz tam-ekran-spinner flaşı, randevu müsaitlik panellerinin accordion yerine otomatik açık gelmesi) uygulandı; bunu test ederken 3 ek bug daha bulundu: 🟡 uzmanlar arası slot seçimi ortaklaştırılmamıştı (biri seçilince diğeri temizlenmiyordu), 🟡 randevu gönderiminde başarı sonrası 2 saniyelik pencerede buton tekrar tıklanabiliyordu (çift-randevu riski), 🟢 önceden var olan bozuk bir spinner SVG path'i — üçü de düzeltildi (19. tur).
- Belge (danışan/uzman evrak) onay/red akışı hiç yoktu, sadece bir `verified` boolean vardı (admin panelinden onay/red bulk aksiyonu, kullanıcıya bildirim, "reddedildi" kavramı hiçbiri yoktu) → `Document.status` (pending/approved/rejected) + `accounts/services.py::review_document()` + admin panelinde tekil/toplu onay-red aksiyonları + `notifications`'a yeni `document_status` bildirim türü eklendi, iki frontend'de renkli 3 durumlu rozete çevrildi. Django admin paneli genel olarak güçlendirildi (kullanıcı aktif/pasif + belge onay/red toplu aksiyonları, uzman onay toplu aksiyonu). Form versiyon numarası artık client/expert/admin'in üçünde de görünür (versiyonlama sisteminin kendisi 11. turdan beri değişmedi). Gerçek bir DB kopyasında + gerçek bir admin HTTP isteğiyle doğrulandı, bu süreçte admin `save_model()`'de kendi bulunan bir bug (eşzamanlı alan değişikliği kaybı) ve client'ta ilgisiz bir `Document.filename` tip bug'ı düzeltildi (20. tur).
- Danışan/uzman kendi yüklediği bir belgeyi silemiyordu (client'ta stub, expert'te API fonksiyonu vardı ama UI'ya hiç bağlı değildi) → ikisine de gerçek bir silme akışı eklendi, AMA bilinçli olarak gerçek bir DELETE değil `Document.is_current` aktif/pasif anahtarına bağlı bir deactivate (dosya storage'da kalır, admin'de görünmeye/yeniden aktifleştirilmeye devam eder) — var olan `DocumentDeleteView`'daki gereksiz `storage.delete()` çağrısı kaldırılarak bu netleştirildi. Admin panelinde `is_current` artık renkli "Aktif"/"Pasif" + toplu aktifleştir/pasifleştir aksiyonları. Gerçek bir DB kopyasında `APIRequestFactory`/gerçek admin metodlarıyla uçtan uca doğrulandı (21. tur).
- Belge indirme CORS hatasıyla başarısız oluyordu (`handleDownload`'ın Supabase'in dış imzalı URL'sini kimlik bilgili `api` instance'ıyla çekmesi, Supabase'in wildcard CORS yanıtıyla çakışıyordu) → credential'sız düz `fetch()`'e çevrildi (22. tur). Aynı sırada kullanıcı sil butonunun onaylanmış belgelerde neden devre dışı olduğunu sorup "saçma" bulduğunu belirtti → netleştirme sonrası onaylanmış belgeler de artık silinebiliyor (deactivate edilebiliyor), çünkü silme artık geri alınabilir - eski "geri dönüşsüz kaybetme" gerekçesi geçersizdi; `is_primary` engeli korundu (23. tur).
- Backend'de mail gönderimi tek bir view'a gömülü, dağınık bir haldeyken → ayrı bir `mailer` app'ine merkezileştirildi (25. tur); randevu talep/onay/iptal durumları için hiçbir mail bildirimi yoktu → 3 yeni tipli fonksiyon (`send_appointment_created_email`, `send_appointment_confirmed_email`, `send_appointment_cancellation_email`) `appointments`'a bağlandı, ortak bir Lunova HTML şablonu + asenkron (`threading.Thread`, hata durumunda akışı bozmadan loglayan) gönderim eklendi, şifre sıfırlama maili de aynı şablona geçirildi (26. tur). Kullanıcı harici bir mail servisine (SendGrid/Mailgun/SES vb.) şimdilik BİLİNÇLİ olarak geçmedi, Gmail SMTP ile devam kararı aldı - ileride hacim/deliverability sorun olursa değerlendirilecek (bkz. "🧭 Geliştirme Fikirleri").

### 🟠 En öncelikli açık madde

**Bu ortamda hâlâ bir tarayıcı otomasyon aracı yok — bu yüzden birikmiş, sadece kod/tsc/build ile doğrulanmış ama hiç tıklanarak test edilmemiş bir dizi değişiklik var.** İki ayrı kategori:

1. **CSRF** — axios'un `withXSRFToken` mekanizması kaynak kodu okunarak, backend tarafı ise gerçekçi bir `curl` zinciriyle (login → `csrftoken` cookie → doğru header'la `200`, header'sız `403`, `CORS_ALLOW_HEADERS`'ta `x-csrftoken` mevcudiyeti) sıkı doğrulandı (6. tur). Client/expert'te login olup bir POST/PATCH/DELETE işlemi deneyip başarılı olduğunu gözlemlemek yeterli; 403 alınırsa DevTools → Network'te `X-CSRFToken` header'ının gerçekten gittiğine bakılmalı.
2. **7. turdaki UI değişiklikleri** — mobil sidebar'ın bir linke tıklayınca otomatik kapanması, mobil header logosunun artık taşmaması, client ana sayfasındaki 3 yeni widget'ın (karşılama/yaklaşan randevular/mini takvim) doğru render olması, expert giriş ekranlarında Lunova logosunun göründüğü ve GitHub/Facebook butonlarının kalktığı, expert sidebar'ında gerçek kullanıcı adının (satnaing değil) göründüğü — hepsi `tsc`/`vite build` ile "derlenir" doğrulandı ama tarayıcıda gözle hiç teyit edilmedi.
3. **10. turdaki Zoom mock URL düzeltmesi** — `create_mock_zoom_meeting()` Django shell'de gerçekten çalıştırılıp çıktısı doğrulandı, ama bir randevuyu confirmed'e çekip Zoom butonuna gerçekten tıklayarak yeni sekmenin `https://zoom.us/j/...`'a gittiği hiç gözle teyit edilmedi.
4. **11. turdaki "Formlar" özelliği (client + expert)** — backend tarafı (versiyonlama, skorlama, izinler) Django shell + gerçek HTTP istekleriyle sıkı doğrulandı; admin panelindeki versiyonlama akışı da gerçek bir Django sayfası olduğu için `test.Client` ile tıklanmış gibi test edildi; `GET /accounts/clients/`'in gerçek veride dolu döndüğü de ayrıca doğrulandı (80 danışandan 62'sinin atanmış uzmanı var). Client tarafı 12. turda ilk kez tarayıcıda denendi (bkz. madde 5); **expert tarafı hâlâ hiç tarayıcıda açılmadı**, sadece `tsc -b`/`vite build` ile doğrulandı.
5. **12-13. turdaki değişiklikler (client, breadcrumb + gönderim modalleri + `yes_no` radio veri/kod düzeltmesi)** — 13. turda hem veri (eksik `QuestionOption` kayıtları) hem kod (`opt.id ?? opt.value ?? idx`) tarafı `APIRequestFactory` ile gerçek bir HTTP/ORM çağrısıyla doğrulandı (`FormDetailView`'ın artık gerçek id döndürdüğü + gerçek bir submit'in `201`+doğru skorla sonuçlandığı görüldü) — bu, 12. turdaki sadece statik analizle yapılan (ve kök nedeni ispatlayamayan) doğrulamadan çok daha güçlü. Yine de `tsc`/`vite build` dışında **gerçek tarayıcıda tıklanarak hiç test edilmedi** — bir sonraki oturumda özellikle bu formun (ve genel olarak diğer `yes_no` sorularının) tarayıcıda gerçekten doğru göründüğünün teyidi öneriliyor.
6. **14. turdaki bildirim sistemi (backend + client + expert)** — backend tarafı (sync/idempotency/cleanup/HTTP endpoint'leri) Django shell + `APIRequestFactory` ile sıkı doğrulandı. **İki frontend'in kendisi (bell dropdown'ları, polling, okunmuş/okunmamış görsel farkı, tıklanınca randevu detayına yönlendirme) hiç tarayıcıda açılmadı** — sadece `tsc`/`vite build` ile doğrulandı. Özellikle şu akışların manuel testi öneriliyor: (a) yaklaşan bir randevunun bell'de gerçekten göründüğü, (b) tıklayınca hem okunmuş işaretlendiği hem doğru randevuya yönlendirdiği (client: yeni `/appointments/:id` sayfası; expert: `/reservations?appointmentId=...` ile var olan dialog'un otomatik açıldığı), (c) 60sn polling'in ekstra istek/hata üretmediği.
7. **15. turdaki danışan formları matrisi (expert)** — hem matris verisi hem altındaki 🔴 kritik backend düzeltmesi `APIRequestFactory` ile 7 gerçek danışan için uçtan uca doğrulandı (hepsi 200, önceki yanlış 403'ler düzeldi). **Matrisin kendisi (✓/✗ render'ı, satır tıklamasının doğru danışanı seçtiği, oradan risk detay dialog'unun açıldığı) hiç tarayıcıda görülmedi** — sadece `tsc -b`/`vite build` ile doğrulandı.
8. **16-17. turdaki not/mesaj sistemi (backend + client + expert)** — backend tarafı (permission, read-receipt, seans-bazlı kota hesaplama, 200 karakter limiti, bildirim üretimi/idempotency) `APIRequestFactory` ile gerçek bir expert/client çiftiyle 10+ senaryoda sıkı doğrulandı. **İki frontend'in kendisi (mesaj balonları, kalan-hak sayacı/info modalı, hak bitince kırmızı border+disable, roster'daki son not/okunmamış/kalan-hak rozeti, quota_exceeded/message_too_long hata mesajları, localStorage taslak koruması, bildirimden `/messages`'a yönlendirme) hiç tarayıcıda açılmadı** — sadece `tsc`/`vite build` ile doğrulandı.
9. **19. turdaki client düzeltme paketi** — belge/profil fotoğrafı yükleme akışının kendisi (presign→PUT→finalize) gerçek bir Docker container'dan gerçek bir Supabase projesine karşı GERÇEKTEN uçtan uca doğrulandı (bkz. yukarıdaki 19. tur changelog — bu, diğer maddelerin çoğundan daha güçlü bir doğrulama, sadece backend simülasyonu değil gerçek bir tarayıcı+gerçek storage). **Ama aynı turdaki geri kalan her şey (avatar konumu, login/kaydet/randevu-gönder spinner'ları, header dropdown sadeleşmesi, select kontrast düzeltmesi, accordion→otomatik-açık, uzmanlar arası slot seçim çakışması düzeltmesi, çift-tıklama önleme, spinner path düzeltmesi, expert'teki `_redirects` düzeltmesi) hiç tarayıcıda tıklanarak test edilmedi** — sadece `tsc -b`/`vite build` ile doğrulandı.
10. **20. turdaki belge onay/red + admin panel + form versiyonu paketi** — backend tarafı (durum senkronu, bildirim üretimi, admin `save_model()` bug'ı ve düzeltmesi) gerçek bir DB kopyasında Django shell + gerçek bir admin HTTP isteğiyle (superuser login, gerçek bir POST) sıkı doğrulandı — bu, diğer birçok maddeden daha güçlü bir doğrulama (gerçek admin view'ı uçtan uca). **Django admin arayüzünün kendisi (renkli status kolonu, toplu aksiyon dropdown'ı, hızlı filtre) ve iki frontend'deki UI değişiklikleri (rozet renkleri, versiyon köşe yazıları, bildirim yönlendirmesi) hiç tarayıcıda tıklanarak test edilmedi** — sadece `tsc -b`/`vite build`/`test.Client` ile doğrulandı.
11. **21. turdaki belge silme (deactivate) paketi** — backend tarafı (deactivate mantığı, `GET /documents/`+`GET /profile/`'dan kaybolma, admin bulk aksiyonları, deaktivasyon sonrası yeniden yükleme, `ValidationError`'ın gerçek response şekli) gerçek bir DB kopyasında `APIRequestFactory`/gerçek admin metodlarıyla sıkı doğrulandı. **İki frontend'deki silme butonları (onay modalı/dialog'u, disabled+tooltip mantığı, silme sonrası liste tazelemesi) hiç tarayıcıda tıklanarak test edilmedi** — sadece `tsc -b`/`vite build` ile doğrulandı.
12. **[YENİ, en yüksek öncelik] 28-29. turdaki ödeme akışının TAMAMI** — backend tarafı (payment gating, ücretsiz ilk seans, mail/bildirim dallanması, mock checkout, Zoom tetikleme, SDK-mock'lu callback/postAuth/cancel) gerçek dev DB'ye karşı 42 kontrolle (26+16) `APIRequestFactory`/`force_authenticate` ile GERÇEK view'lar üzerinden sıkı doğrulandı - bu, listedeki en güçlü backend doğrulamalarından biri. **Ama client'taki yeni "Ödemeler" sayfası (bekleyen/geçmiş listesi, onay modalı, mock-başarı toast'ı, `/payments/result` sayfası, bildirim deep-link'i) ve expert'teki ödeme rozeti (tablo + detay dialog) HİÇ tarayıcıda açılmadı** — sadece `tsc -b`/`vite build` ile doğrulandı. Gerçek iyzico sandbox key'i de henüz yok, yani `payment_page_url`'e gerçek yönlendirme + `/payments/callback/` akışı da hiç uçtan uca (gerçek iyzico'ya karşı) denenmedi - sadece mock mod ve SDK-mock'lu birim testleriyle.
13. **[YENİ, 30. tur] Ücretsiz ilk seansın "Devam Et" onay akışı + promosyon banner'ları** — backend tarafı (bayrak set edilmesi, `confirm_free_trial()`'ın yarış durumu korumalı Payment oluşturması, bildirim/mail dallanması, `read_only_fields` koruması) gerçek dev DB'ye karşı 28/28 kontrolle `APIRequestFactory`/`force_authenticate` ile sıkı doğrulandı. **Ama client'taki yeni `FreeTrialBanner.tsx` (ana sayfa + randevu alma akışı), Payments.tsx'teki "Devam Et" butonu/rozetleri ve expert'teki güncellenmiş rozet metinleri HİÇ tarayıcıda açılmadı** — sadece `tsc -b`/`vite build` ile doğrulandı.

Kalan risk her ikisi için de düşük (CSS/JS mantığı statik ve doğrudan; CSRF backend ucu çok sağlam doğrulanmış) ama sıfır değil — bir sonraki oturumda/gerçek bir cihazda kısa bir manuel geçiş (yukarıdaki maddeler + bir POST/PATCH akışı) öneriliyor.

### 🟡 Doğrulanmış, hâlâ açık — önem derecesine göre sıralı

> Önem derecesi ölçeği için "📌 Kalıcı Kural" madde (c)'ye bakın. Aşağıdaki liste 🟠'dan 🟢'ye sıralı.

1. ✅ **[DÜZELTİLDİ — 2026-08-22, 21. tur]** ~~`client/src/components/UserProfile/UserDocumentsCard.tsx` → `handleDeleteDocument` tamamen stub, silme butonu kullanıcıya hiçbir geri bildirim vermeden hiçbir şey yapmıyor~~ — artık gerçek bir onay modalı + `DELETE /accounts/documents/{uid}/` çağrısı (backend'de gerçek bir silme değil, `is_current` aktif/pasif anahtarı - bkz. backend/claude.md 18. tur). Expert tarafında da aynı şekilde önceden var olan ama UI'ya hiç bağlanmamış `deleteDocument()` fonksiyonu artık kullanılıyor. **[20. turda AYRICA bulunan, ilgisiz bir bug 18. turda düzeltildi]** ~~aynı client dosyasındaki `Document.filename` tipi backend'in gerçek alanıyla (`original_filename`) hiç eşleşmiyordu~~ — düzeltildi.
2. 🟡 `client/src/pages/Appointments/AppointmentsList.tsx:50`, `Request.tsx:50` → API response şekil kontrolsüz `.map()`'e veriliyor (ErrorBoundary artık yakalıyor, kök neden düzeltilmedi).
3. 🟡 `LogoutView`, `access_token`'ı blacklist'e almıyor (sadece `refresh_token`'ı) — logout sonrası eski access token kendi 15 dk'lık ömrü boyunca teorik olarak hâlâ geçerli kalabiliyor. CSRF'le ilgisiz, önceden beri var olan bir tasarım tercihi. **[5. turda bulundu]**
4. 🟡 Genel/global rate limiting yok, DRF pagination global tanımlı değil (`available-experts/` gibi sınırsız listelerde risk; `appointments/` zaten tarih aralığıyla sınırlı). **[16. turda kısaca denendi, 17. turda geri alındı]** `messaging/`'in gönderim endpoint'i için 16. turda DRF `ScopedRateThrottle` (30/hour) denendi ama kullanıcı bunun yerine seans-bazlı bir mesaj KOTASI istedi (bkz. yukarıdaki "✅ Kapatılmış" listesi) — throttle tamamen kaldırıldı, artık zaman-bazlı değil `backend/messaging/services.py::get_client_remaining_quota()` ile hesaplanan bir kota kullanılıyor. Hiçbir endpoint (login dahil) zaman-bazlı bir rate limiting'e tabi değil.
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

1. **20. turdaki belge onay/red akışının Django admin'de gerçek bir tarayıcıda tıklanarak doğrulanması** (bir belgeyi tekil/toplu onayla/reddet, iki frontend'de doğru rozetin ve bir `document_status` bildiriminin göründüğünü teyit et) — en yeni, en az test edilmiş değişiklik, öncelik en yüksek.
2. **11. turdaki "Formlar" özelliğinin (client+expert) VE `GET /accounts/clients/`'in gerçekten dolu döndüğünün gerçek bir tarayıcıda doğrulanması**.
3. CSRF fix'inin, 7-8-10. turdaki diğer UI değişikliklerinin gerçek bir tarayıcıda doğrulanması (yukarıda, 🟠).
4. `handle-server-error.ts` `.detail || .error` fallback'i (ucuz, birisi React Query'ye geçerse aktifleşecek riski önler).
5. Yukarıdaki "hâlâ açık" listesindeki 🟡 maddeler: documents delete stub, response şekil kontrolü, logout'ta access token blacklist, rate limiting/pagination, CI/test altyapısı, `next_question` model-seviyesi scoping.
6. Kalan şablon temizliği: `client/README.md`/`expert/README.md`'nin Lunova'ya özgü içerikle yeniden yazılması, `client/store/authReducer.ts` ölü kodunun kaldırılması/kararlaştırılması, icon-only bir Lunova logosu sağlanması — yayına çıkmadan önce.
7. `/terms`+`/privacy` sayfalarına gerçek Kullanım Şartları/Gizlilik Politikası içeriğinin eklenmesi (kullanıcı tarafından).
8. Google OAuth ile giriş (client + expert, detay `expert/claude.md`'nin "🗒️ Ekip Notları" bölümünde).
9. Orta vadeli: `available-experts`/takvim uçlarının performansı, hata response formatının backend genelinde tutarlı hale getirilmesi (`detail` standardı).

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
              │ notifications │ messaging   │
              │ mailer │ payments           │
              └──┬──────────┬─────────┬─────┘
                 │          │         │
           JWT (cookie) │ CORS │ Storage (Supabase/Mock)
                 │                          │
          PostgreSQL (prod) / SQLite (dev)  │
                                    iyzico (mock/sandbox/production)
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

# notifications/urls.py — (14. tur, YENİ; 16. turda 'message' türüyle genişletildi)
GET    /api/v1/notifications/                 (sync + 20 gün temizlik yan etkili; expert veya client, kendi bildirimleri)
PATCH  /api/v1/notifications/<id>/read/        (okunmuş işaretler, idempotent)

# messaging/urls.py — (16. tur, YENİ; 17. turda kota sistemi eklendi) — klasik chat DEĞİL, uzman-danışan not sistemi
GET    /api/v1/messaging/conversations/                       (sadece expert; danışan roster'ı, son not/okunmamış/client_quota özeti)
GET    /api/v1/messaging/conversations/<other_user_id>/messages/   (other_user_id HER ZAMAN User.id; okurken karşı tarafın mesajlarını okunmuş işaretler; yanıt: {"messages":[...],"client_quota":{"remaining","limit"}})
POST   /api/v1/messaging/conversations/<other_user_id>/messages/   (danışan için: body max 200 karakter + seans-bazlı kota — biri aşılırsa 400/403; uzman için sınır yok, body max 1000 karakter)

# payments/urls.py — (28. tur, YENİ) iyzico Checkout Form entegrasyonu
POST   /api/v1/payments/appointments/<appointment_id>/checkout/   (sadece randevunun kendi client'ı; DIRECT/auth-ecom akışı başlatır, zaten ödenmiş/session_price tanımsız/TCKN eksikse 400)
POST   /api/v1/payments/appointments/<appointment_id>/confirm-free-trial/   (30. tur, YENİ — sadece randevunun kendi client'ı; appointment.is_free_trial=True ise "Devam Et" onayıyla asıl Payment'ı oluşturur, zaten ödenmiş/free-trial değil/hak bu arada başka randevuda tüketilmişse 400)
GET    /api/v1/payments/free-trial-eligibility/                   (30. tur, YENİ — {"eligible": bool}, danışanın ömür boyu hakkı olan ücretsiz ilk seansı henüz kullanıp kullanmadığı, promosyon banner'ları için)
POST   /api/v1/payments/callback/                                 (kimliksiz — iyzico'nun Checkout Form sonrası kullanıcı tarayıcısı üzerinden POST ettiği callback, DRF/JSON değil düz Django view, sonunda frontend'e redirect eder)
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
├── status: pending|approved|rejected (20. tur, YENİ - asıl doğruluk kaynağı, admin panelinden
│   tekil/toplu onaylanır/reddedilir - bkz. accounts/services.py::review_document())
├── is_primary, is_current ("Aktif mi?", 21. tur YENİ verbose_name), verified, verified_at
│   (verified/verified_at artık status'ün senkron tutulan türevi - eski API tüketicileriyle
│   geriye dönük uyumluluk için korunuyor)
├── "silme" = deactivate (21. tur, YENİ netleştirme): DocumentDeleteView kullanıcının kendi
│   belgesini `is_current=False`'a çeker, storage'dan HİÇ silmez (önceden storage.delete()
│   da çağrılıyordu, kullanıcı isteğiyle çelişiyordu - kaldırıldı) - admin panelinde görünmeye
│   ve toplu aksiyonla yeniden aktifleştirilmeye devam eder
└── presign-upload akışı: backend sadece presigned URL üretir, dosya doğrudan Supabase'e gider

Appointment (appointments/models.py)
├── expert, client (User FK, ExpertProfile/ClientProfile DEĞİL)
├── date, time, duration (default 45 — 30. tur'da BİLİNÇLİ OLARAK dokunulmadı,
│   "15 dakika ücretsiz" tamamen bilgilendirici/rozet metni, bu alan hiç değişmiyor)
├── status (6 durum — bkz. backend/claude.md)
├── is_free_trial (30. tur, YENİ — BooleanField, default False) - danışanın ömür
│   boyu hakkı olan ücretsiz ilk seansıyla mı ilerlediği; Payment kaydı
│   oluşmadan ÖNCE, uzman onayladığı/randevu oluşturduğu anda
│   payments.services.resolve_appointment_payment() tarafından set edilir,
│   asıl Payment (ve Zoom erişimi) danışanın "Devam Et" onayıyla
│   payments.services.confirm_free_trial() içinde oluşur - serializer'da
│   read_only (sistem tarafından hesaplanır, PATCH ile yazılamaz)
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

Notification (notifications/models.py) — 14. tur, YENİ; 16. turda genişletildi; 20. turda 3. türe,
│   28-29. turda payment_required/payment_succeeded ile 5, 30. turda free_trial_ready ile 6 türe çıktı
├── user (FK), notification_type (appointment_reminder | message | document_status | payment_required |
│   payment_succeeded | free_trial_ready), dedupe_key, title, body
├── appointment (nullable FK → appointments.Appointment, appointment_reminder türü için)
├── related_user (nullable FK → User, 16. tur YENİ - message türü için, bildirime tıklayınca
│   hangi konuşmaya gidileceğini belirtir)
├── is_read, read_at, created_at
├── document_status (20. tur, YENİ) hiçbir FK kullanmaz - alıcı zaten `user` alanının kendisi
│   (belge her zaman kullanıcının KENDİ belgesi), tıklanınca frontend sabit /profile'a gider;
│   `update_or_create` ile üretilir (get_or_create DEĞİL) - aynı belge tekrar incelenirse
│   bildirim METNİ güncellenir ve is_read sıfırlanır
└── UniqueConstraint(user, dedupe_key) — job scheduler olmadan "her GET'te sync"
    modelinin idempotency temeli, bkz. backend/claude.md 12. tur

Conversation / Message (messaging/models.py) — 16. tur, YENİ
├── Conversation: expert/client (User FK), UniqueConstraint(expert,client), last_message_at
│   → sadece ilk mesaj gönderiminde (get_or_create) oluşur, GET'te değil
└── Message: conversation FK, sender (User FK), body (CharField, max_length=1000 - model
    üst sınırı; danışan için POST'ta 200'e sıkılaştırılır, bkz. services.py), is_read/read_at,
    created_at — klasik chat DEĞİL, "yazıyor" durumu/kanal kavramı yok, çift başına tek bir
    sürekli not hattı

    Danışanın mesaj hakkı (17. tur, YENİ) — ayrı bir model/alan DEĞİL, tamamen hesaplanan:
    messaging/services.py::get_client_remaining_quota() bu çiftin en son TAMAMLANMIŞ
    randevusunun bitiş zamanından itibaren gönderilen Message sayısını sayıp 5'ten düşer
    ("her seans sonrası yenilenir"). Uzmanın hiçbir sınırı yok.

Payment (payments/models.py) — 28. tur, YENİ — iyzico Checkout Form entegrasyonu
├── payer (User FK, on_delete=PROTECT — projenin geri kalanından bilinçli sapma, mali
│   kayıtların sessizce silinmemesi için), appointment (nullable FK → appointments.Appointment,
│   SET_NULL — ileride randevuya bağlı olmayan toplu paket satın alımları için nullable)
├── payment_type (şimdilik sadece single_session), flow (direct|preauth — iyzico'nun
│   gerçekten AYRI iki initialize endpoint'i, parametre farkı değil), status
│   (pending|authorized|succeeded|voided|failed|refunded)
├── amount/currency, conversation_id (bizim ürettiğimiz eşleştirme anahtarı, unique),
│   provider_token (Checkout Form token'ı), provider_payment_id (iyzico paymentId)
├── metadata (JSONField, boş dict varsayılan — ileride indirim/kupon detayları için,
│   şema değişmeden) — ücretsiz ilk seans {'free_trial': True} ile işaretlenir
└── Ücretsiz ilk seans (danışan hesabı bazında ömür boyu 1 kez) — ayrı bir alan/model
    DEĞİL: payments/services.py::is_client_eligible_for_free_session() danışanın daha
    önce SUCCEEDED bir Payment'ı olup olmadığına bakar (amount=0 SUCCEEDED kayıt hem
    "hak kullanıldı" işareti hem audit kaydı) — messaging'in seans-kotası "mevcut
    veriden hesapla" deseniyle tutarlı. Var olan ama hiç kullanılmayan
    ExpertProfile.free_first_session (uzman-bazlı, farklı bir kavram) BİLİNÇLİ OLARAK
    bu mantığa dahil edilmedi.
```

## 🔍 Frontend ↔ Backend Haberleşmesinde Tespit Edilen Gerçek Sorunlar

Bu bölüm, önceki raporun genel geçer ("pagination yok", "interceptor yok" gibi) maddelerinin ötesinde, **kod okunarak doğrulanmış somut** entegrasyon sorunlarını listeler:

1. **[DÜZELTİLDİ — 2026-08-17]** ~~15 dakikalık access token + refresh mekanizması hiçbir katmanda yok.~~ `POST /accounts/token/refresh/` eklendi, her iki frontend de 401'de otomatik refresh deniyor. Detay için yukarıdaki "Access token 15 DAKİKA, ama artık gerçek bir refresh akışı VAR" bölümüne bakın.

2. **[YÜKSEK] Expert frontend'in hata mesajı okuma mantığı backend'in gerçek hata formatıyla uyuşmuyor.** `expert/src/lib/handle-server-error.ts` sadece `error.response.data.title` alanını okuyor. Backend'de ise hata gövdeleri neredeyse hep `detail` (accounts, forms, document view'larında 16 yerde) veya `error` (appointments/availability custom validasyonlarında) anahtarını kullanıyor — **`title` anahtarı backend'in hiçbir hata yanıtında yok** (tek `title` kullanımı, `ExpertProfile.title` adlı bambaşka bir model alanının serializer çıktısı). Sonuç: expert arayüzünde kullanıcıya gösterilen hata tostları neredeyse her zaman backend'in asıl mesajı yerine sabit "Something went wrong!" metnini gösteriyor.

3. **[KISMEN DÜZELTİLDİ — 2026-08-17]** ~~`client/` içinde global 401/hata interceptor'ı hiç yok~~ — artık `lib/api.ts`'te bir response interceptor'ı var (401 → refresh dene → başarısızsa `/signin`'e yönlendir). `expert/` içindeki **iki katmanlı, örtüşen** yapı hâlâ mimari olarak duruyor (axios interceptor + React Query `QueryCache.onError`) ama 2026-08-17'de doğrulandığı üzere ikinci katman (React Query) projede `useMutation`/`useQuery` hiç kullanılmadığı için **pratikte ölü kod** — tutarsızlık riski teorik, aktif değil (bkz. expert/claude.md).

4. ✅ **[DÜZELTİLDİ — 2026-08-17, 5. tur]** ~~CSRF koruması muhtemelen hiç aktif değil.~~ İki katmanlı çözüm uygulandı: `access_token`/`refresh_token`/`csrftoken` cookie'leri artık `SameSite=Lax` (önceden `None`), VE `CookieJWTAuthentication.enforce_csrf()` eklenip Django'nun standart CSRF token doğrulaması cookie-tabanlı istekler için gerçekten çalışıyor (`Authorization: Bearer` header'ıyla gelen istekler muaf — CSRF riski taşımıyorlar). İki frontend'in axios client'larına da `xsrfCookieName`/`xsrfHeaderName`/`withXSRFToken` eklendi. `curl` ile orijinal PoC yeniden çalıştırıldı: aynı CSRF token'sız form-encoded `POST /accounts/logout/` artık `205` yerine `403 {"detail":"CSRF doğrulaması başarısız: CSRF token missing."}` dönüyor; doğru `X-CSRFToken` header'ıyla (gerçek `Origin: http://localhost:5174` header'ı simüle edilerek) aynı istek `205` ile başarılı. Detay, tam doğrulama adımları ve tek doğrulanamayan parça (gerçek tarayıcıda axios'un otomatik davranışının tıklanarak test edilememesi) için dosyanın en üstündeki "5. tur" changelog girişine bakın.

5. **[DÜZELTİLDİ — 2026-08-17]** ~~Login/`/me/` yanıtları `role` ve `id` döndürmüyor.~~ Artık ikisi de dönüyor (`accounts/views/views.py`, "Randevu Zinciri" değişikliği — bkz. yukarıdaki changelog). Bu madde önceden buradaydı, hâlâ çözülmemiş gibi göründüğü için düzeltildi; kod bu turda `curl` ile yeniden doğrulandı.

6. **[DÜŞÜK-ORTA] `available-experts/` ve `expert/<id>/calendar/` uçları büyük veri altında yavaşlayabilir.** `AvailableExpertsByCategoryView` ve `MyAvailabilityView` (availability/views.py), her expert × her gün için Python döngüsüyle çakışma hesabı yapıyor (DB seviyesinde değil). Klasik "pagination eksik" değil, asıl risk N+1/quadratic hesaplama — expert sayısı ve tarih aralığı büyüdükçe response süresi lineer/karesel büyür.

7. **[DÜŞÜK] `appointments/` listeleme ucu zaten `start_date`/`end_date` zorunlu tutuyor ve süreyi 4-6 ayla sınırlıyor** — yani "1000+ randevu tek seferde dönüyor" iddiası bu endpoint için abartılı; asıl pagination ihtiyacı `available-experts` ve `clients/` gibi sınırsız listelerde.

8. **[DÜŞÜK] `client/README.md` ve `expert/README.md` hâlâ orijinal açık kaynak şablon README'leri** (TailAdmin / shadcn-admin) — Lunova'dan, backend'den, portlardan hiç bahsetmiyorlar. Yeni bir geliştirici bu dosyalara güvenirse yanlış repo klonlamaya çalışır.

9. **[DÜZELTİLDİ]** ~~`backend/requirements.txt` UTF-16 kodlamayla kaydedilmiş~~ — Docker altyapısı eklenirken (bkz. "🐳 Docker" bölümü) UTF-8'e çevrildi. Listede gerçek `djangorestframework_simplejwt==5.5.1` yanında anlamsız/muhtemelen yanlışlıkla eklenmiş bir `rest-framework-simplejwt==0.0.2` paketi hâlâ duruyor — bu ayrı, hâlâ açık bir kalem (bkz. "📊 Sistem Durumu Özeti" madde 14).

10. **[DÜZELTİLDİ — 2026-08-19, bu turda `expert/ToDo.md` silinmeden önce doğrulandı]** ~~Randevu reddetme (reject) işlemi expert arayüzünden backend'de 403 Forbidden ile başarısız oluyor; `dashboard/api.ts` hâlâ hardcoded localhost kullanıyor~~ — `expert/ToDo.md`'de "bilinen bug" diye not edilmişti ama ikisi de artık geçersiz (backend'de reject akışı çoktan düzeltilmiş, `dashboard/api.ts` dosyası artık repoda yok) — dosyanın kendisi güncellenmemiş kalmıştı. Detay için `expert/claude.md`'nin "🗒️ Ekip Notları" bölümüne bakın.

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
# ÖNERİLEN (18. tur, YENİ): tüm app'lerin feed'lerini doğru sırayla tek seferde çalıştırır
# (accounts -> availability -> appointments -> messaging -> notifications -> forms),
# isimlendirilmiş ekip test hesaplarını (selin, selen, onur, ece, eslem, gokcen, niga,
# mustafa, yusuf -> <isim>@mail.com uzman + danisan_<isim>@mail.com eşleşmiş danışan,
# şifre: password123) da içerir. Ayrıntı: backend/claude.md.
venv\Scripts\python feed_db.py                         # --list ile sırayı, --apps a,b ile alt küme görebilirsin
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

**[19. tur, YENİ]** `backend` servisine `dns: [8.8.8.8, 1.1.1.1]` eklendi — bir Supabase Storage bağlantı hatası (`httpx.ConnectError`) araştırılırken önce Docker/Windows DNS sorunu sanılıp eklendi. **Gerçek kök neden bu değildi** (bkz. yukarıdaki 19. tur changelog — asıl sebep `backend/.env`'deki bozuk `SUPABASE_URL` değeriydi, host makineden de aynı hata alınarak doğrulandı), ama ayar zararsız/genel bir sağlamlaştırma olduğu için kaldırılmadı, kaldı.

## 🧭 Geliştirme Fikirleri (canlı liste — bkz. yaşam döngüsü kuralı)

Bu bölüm hata/bug listesi değil, henüz değerlendirilmemiş basit fikir notlarıdır — **ama statik değil**. Yaşam döngüsü ("📌 Kalıcı Kural" madde d'nin özeti): bir fikir gerçekleştirildiğinde madde buradan silinmez, üstü çizilip hangi turda hayata geçtiği not düşülür; bir çalışma sırasında koddan/kullanıcıdan gerçek bir yeni fikir fırsatı fark edilirse (uydurulmuş değil) buraya yeni madde olarak eklenir. **Bu listenin sonsuza kadar aynı 2 maddede donup kalması, bu kuralın uygulanmadığının işaretidir.**

1. **Randevu hatırlatma e-postası.** `backend`'de artık merkezi bir `mailer/` app'i var (25. tur, bkz. yukarıdaki changelog) — yeni bir `send_appointment_reminder_email()` fonksiyonu eklemek küçük bir iş. Asıl eksik parça zamanlayıcı: mevcut `notifications` sistemi bildirimleri SADECE birisi `/notifications/`'a istek attığında (pull, "her GET'te sync") üretiyor, bu email için yetersiz — kullanıcı uygulamayı hiç açmazsa mail de hiç gitmez. Randevudan belirli bir süre önce (örn. 24 saat ve/veya 1 saat kala) gerçekten gönderilebilmesi için gerçek bir zamanlayıcı (`manage.py` komutu + cron/Windows Task Scheduler, ya da Celery beat gibi bir kuyruk) gerekiyor — bu, `mailer` app'inin kendisinden bağımsız, ayrı bir altyapı kararı.
2. **Seans sonrası basit değerlendirme (puan + kısa yorum).** `ExpertProfile` modelinde zaten `rating_average`/`rating_count` alanları var (`backend/accounts/models.py`) ama kod taramasında bu alanları dolduran/güncelleyen bir "danışan uzmanı değerlendirir" akışı görülmedi — alanlar şu an sadece salt-okunur görüntüleniyor gibi duruyor, gerçek veri girişi yok. Randevu `completed` (veya benzeri bir durum) olduğunda danışana "bu seansı değerlendir" diye basit bir 1-5 yıldız + opsiyonel kısa yorum formu sunup `rating_average`/`rating_count`'ı güncelleyen bir akış, zaten var olan ama boş duran bir veri modelini tamamlar.
3. ✅ **[17. turda gerçekleştirildi]** ~~Seans başına not/mesaj kotası.~~ `messaging/services.py::get_client_remaining_quota()` ile seans-bazlı (iki seans arası 5 danışan mesajı, her tamamlanan randevu sonrası yenilenen) bir kota uygulandı — detay için `backend/claude.md`'nin 15. turuna bakın. Bu madde önceden hâlâ "henüz uygulanmadı" diye işaretliydi; bu, kural (d)'nin ihlal edildiği bir drift'ti — 25. turda fark edilip düzeltildi.
4. **[25. tur'da kullanıcı tarafından planlandı] Sistem/admin duyuru-kampanya maili.** Admin'in tüm kullanıcılara veya bir gruba (örn. sadece uzmanlar) toplu bir bilgilendirme/duyuru maili göndermesi isteniyor. `mailer.services.send_email()` şu an tekil alıcı için tasarlı — toplu gönderim (Django'nun `send_mass_mail`'i ya da bir kuyruk) ve muhtemelen bir admin arayüzü/komutu ayrı bir çalışma gerektirecek.
5. **[25. tur'da kullanıcı tarafından planlandı] Danışan mesajı → uzmana mail bildirimi.** `messaging` app'inin mevcut in-app `Notification`'ına (bkz. `create_message_notification`) ek olarak, danışandan gelen bir mesajda (kota sorunu olmadığı durumlarda) uzmana ayrıca mail atılması isteniyor. Tetikleme sıklığı (her mesaj mı, belli bir süre okunmazsa mı) henüz netleşmedi.
6. ✅ **[26. turda gerçekleştirildi]** ~~Randevu talebi/onay/iptal durumu maili.~~ `mailer/services.py`'ye `send_appointment_created_email`/`send_appointment_confirmed_email`/`send_appointment_cancellation_email` eklendi, `appointments/serializers.py` (2 oluşturma noktası) + `views.py::status_update()`'e bağlandı - asenkron (`threading.Thread`) ve ortak bir Lunova HTML şablonuyla. Detay için yukarıdaki "26. tur" changelog girişine bakın.
7. **[26. tur'da kullanıcı tarafından açıkça planlandı, henüz uygulanmadı] Harici bir transaksiyonel mail servisine geçiş.** Kullanıcı şimdilik Gmail SMTP ile devam etmeyi bilinçli olarak tercih etti (harici bir servise - SendGrid/Mailgun/SES/Postmark vb. - şimdilik geçmek istemedi), ama ileride (özellikle randevu mailleri gibi sık gönderilen türler hacim kazandıkça) Gmail SMTP'nin günlük gönderim limiti ve teslim edilebilirlik/spam riski nedeniyle bu servislerden birine geçilmesi gerekebileceği not düşüldü. `mailer/services.py::_dispatch()` tüm gönderimi tek bir yerden yaptığı için bu geçiş ileride sadece orada yapılacak, çağıran taraflar (appointments, accounts) etkilenmeyecek — bkz. `mailer/services.py`'nin kendi docstring'i.
8. ✅ **[29. turda gerçekleştirildi]** ~~Ödeme akışının frontend entegrasyonu.~~ Client'ta yeni "Ödemeler" sayfası (`pages/Payments/Payments.tsx` + `PaymentResult.tsx`) mock/gerçek mod ayrımını (anında toast vs `payment_page_url`'e redirect) doğru yönetiyor, expert'te ödeme durumu rozeti eklendi. **Hiçbiri gerçek bir tarayıcıda henüz açılmadı** - bkz. aşağıdaki "🟠 En öncelikli açık madde".
9. **[28. tur'da kullanıcı tarafından planlandı, henüz uygulanmadı] Toplu seans paketi + %indirim + indirim kodu.** Kullanıcının belirttiği yol haritası: danışan ileride tek seferde birden fazla seans için toplu ödeme yapabilecek, toplu alımda seans başına %3 (ya da belirlenecek başka bir oran) indirim uygulanacak, sonra da indirim kodu desteği eklenecek. `payments/models.py::Payment` (payment_type/flow/metadata alanları) ve appointment'a bağlı olmayan (nullable) tasarımı bunun için hazırlandı ama `SessionPackage`/`DiscountCode` gibi hiçbir model/mantık henüz kurulmadı (YAGNI - henüz gerçek ihtiyaç değildi, bkz. backend/claude.md 22. tur).
10. ✅ **[30. turda gerçekleştirildi]** ~~ücretsiz randevu hakkı danışanın 15 dakikalık ücretsiz seans hakkı daha net planlanmalı.~~ Agent ile tartışılıp karar verildi: kişiye özel bir indirim kodu YERİNE (gereksiz bir dolaylama, kimlik zaten oturumdan biliniyor) mevcut computed-eligibility yaklaşımı korundu, sadece uzman onayladığında ANINDA tüketilme davranışı ücretli akışla simetrik bir "Devam Et" onay adımına çevrildi (`Appointment.is_free_trial` + `confirm_free_trial()`) ve ana sayfa/randevu alma akışı/Ödemeler sayfası/uzman panelinde promosyon rozetleri eklendi - detay için yukarıdaki "30. tur" changelog girişine bakın.

## 📖 Diğer Dosyalar

> **Not**: Bu dosyaların hiçbiri oturum başlangıcında otomatik yüklenmiyor (bkz. "📌 Kalıcı Kural" madde b) — ilgili alana dokunan bir çalışmada önce açıkça `Read` edilmeli.

- [backend/claude.md](backend/claude.md) — Django app detayları, gerçek modeller, README doğrulaması
- [client/claude.md](client/claude.md) — Redux/Axios mimarisi, gerçek dosya ağacı
- [expert/claude.md](expert/claude.md) — Zustand/TanStack mimarisi; `ToDo.md` 8. turda silindi (içeriği "🗒️ Ekip Notları" bölümüne taşındı), `CHANGELOG.md` hâlâ ayrı duruyor

`SYSTEM_REPORT.md` **8. turda kaldırıldı** — içeriği zaten 4. turda yukarıdaki "📊 Sistem Durumu Özeti"ne taşınmıştı, geride sadece yönlendiren bir stub kalmıştı; kök `claude.md` (bu dosya) zaten otomatik yükleniyorken, otomatik yüklenmeyen ayrı bir stub dosyasının hiçbir agentic avantajı yoktu — sadece bir senkronizasyon riski (bkz. "📌 Kalıcı Kural"ın anlattığı orijinal drift hikayesi).

---

**Son Güncelleme**: 2026-08-27, 30. tur (28-29. turda kurulan ücretsiz ilk seans hakkı artık uzman onayladığı anda sessizce tüketilmiyor - danışan ücretli akışla simetrik bir "Devam Et" onayından geçiyor. Backend: yeni `Appointment.is_free_trial` bayrağı [Payment oluşmadan önce set edilir], `payments/services.py::confirm_free_trial()` [danışanın "Devam Et" tıklamasıyla asıl Payment'ı oluşturur, `transaction.atomic()`+`select_for_update()` ile yarış durumu korumalı], yeni uçlar `POST /payments/appointments/<id>/confirm-free-trial/` + `GET /payments/free-trial-eligibility/`, yeni bildirim/mail türü `free_trial_ready` [`payment_required`'ın ücretsiz karşılığı]. `AppointmentSerializer`'a `is_free_trial` eklendi [read-only]. Client: yeni `FreeTrialBanner.tsx` [ana sayfa + randevu alma akışı], Ödemeler sayfasında "Devam Et" butonu + rozetler. Expert: randevu tablosu + detay dialog'undaki ödeme rozeti artık ücretsiz ilk seansı ayırt ediyor. Gerçek dev DB'ye karşı GERÇEK view'lar üzerinden [`force_authenticate`] 28/28 kontrol geçti [bayrak set edilmesi, "Devam Et" akışı, çift-tık/yarış durumu korumaları, yetki kontrolleri, eligibility endpoint'i], tüm test verisi temizlendi. `manage.py check` + `makemigrations --check` temiz, iki frontend'de de `tsc -b`+`vite build` temiz. **Hiçbiri gerçek tarayıcıda test edilmedi** - bkz. "🟠 En öncelikli açık madde" madde 13. Detay: backend/claude.md 25. tur, client/claude.md 24. tur, expert/claude.md 21. tur)
**Durum**: Aktif Geliştirme
