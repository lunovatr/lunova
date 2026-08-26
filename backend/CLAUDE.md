# Backend - Claude Developer Guide

> Bu dosya kaynak koddan (settings.py, models.py, views.py, urls.py) doğrudan doğrulanmıştır — bir önceki AI taslağındaki model alanları, endpoint listesi ve token ömrü gibi bilgilerin çoğu hatalıydı ve burada düzeltildi. Kök dizindeki [claude.md](../claude.md) genel sistem/haberleşme sorunlarını, bu dosya backend'in iç detaylarını anlatır (dokümantasyon bakım kuralları da orada — kısaca: `backend/` içinde yaptığın HER değişiklikten sonra hem bu dosya hem kök `claude.md` güncellenmeli, token maliyeti gerekçesiyle atlanmaz).

> ## 🔧 Son Değişiklikler (2026-08-26, 24. tur) — 🔴 Kritik: Gerçek iyzico Sandbox'ta `IYZICO_BASE_URL` Şeması Yüzünden TÜM Ödemeler 500 Veriyordu
> Kullanıcı gerçek bir iyzico sandbox hesabı açıp `.env`'e gerçek `IYZICO_SANDBOX_API_KEY`/`SECRET_KEY` yerleştirdi, Docker'da denedi. İki bulgu geldi: (1) danışan-uzman akışında randevu onaylanır onaylanmaz uzman panelinde "ödendi" görünüyordu - bu bir bug DEĞİL, gerçek DB sorgulanıp `amount=0, status=succeeded, metadata={'free_trial': True}` bir `Payment` kaydı olduğu görüldü - test edilen danışanın hesap bazında ömür boyu 1 kez hakkı olan ücretsiz ilk seansı doğru şekilde tetiklenmişti (bkz. 22. tur). (2) client'ta "Ödemeler" sayfası "yüklenirken hata oluştu" veriyordu - bu GERÇEK bir bug'dı: `Payments.tsx`'teki tarih aralığı (-1ay/+4ay = 5 ay) `AppointmentListView`'ın admin-olmayanlar için uyguladığı 4 aylık üst sınırı aşıyordu, backend `400 {"error": "..."}` döndürüyordu ama hata mesajı çıkarma zinciri `.error` alanını kontrol etmiyordu - `-1ay/+3ay`'a (AppointmentsList.tsx'teki ÇALIŞAN aralıkla aynı) çekildi + `.error` fallback'i eklendi, gerçek backend'e karşı `APIRequestFactory` ile (400→200) doğrulandı.
> - **Asıl kritik bulgu**: kullanıcı ikinci (ücretsiz olmayan) bir randevu için gerçekten "Öde"ye bastığında backend `500 Internal Server Error` verdi - Docker log'undaki traceback `http.client.InvalidURL: nonnumeric port: '//sandbox-api.iyzipay.com'` gösteriyordu. Kök neden: `iyzipay` SDK'sının `iyzipay_resource.py::connect()`'i `options['base_url']`'i DOĞRUDAN `http.client.HTTPSConnection(host)`'a host argümanı olarak geçiriyor - bir URL değil, çıplak bir hostname bekliyor (SDK'nın kendi `__init__.py`'sindeki varsayılan da `'sandbox-api.iyzipay.com'`, şemasız). `lunova_backend/settings.py`'de 22. turda `IYZICO_BASE_URL` **şemayla birlikte** (`'https://sandbox-api.iyzipay.com'`) yazılmıştı - bu, mock modda hiç fark edilmedi çünkü mock mod SDK'ya hiç dokunmuyor (bkz. 22. tur), sadece gerçek bir sandbox key'iyle gerçek bir ağ isteği denendiğinde ortaya çıktı.
> - **Düzeltme**: `IYZICO_BASE_URL` her iki dalda da (`sandbox`/`production`) şema OLMADAN yazıldı (`'sandbox-api.iyzipay.com'` / `'api.iyzipay.com'`), koda SDK'nın bu beklentisini açıklayan bir yorum eklendi.
> - **Doğrulama - bu turun en güçlü doğrulaması, GERÇEK sandbox'a karşı**: kullanıcının gerçek `.env`'indeki gerçek `IYZICO_SANDBOX_API_KEY`/`SECRET_KEY` ile (aynı `.env` dosyası hem Docker hem yerel venv tarafından okunuyor), gerçek bir test randevusu için `initiate_direct_checkout()` DOĞRUDAN çağrıldı (sadece `IYZICO_CALLBACK_URL`'i geçici olarak `mock.patch.object` ile bir placeholder'a çevirerek - gerçek callback URL'i henüz yok, bkz. kök claude.md'deki ngrok tartışması) - gerçek iyzico sandbox sunucusundan geçerli bir `token`, `checkout_form_content` (gerçek iyzico JS bundle'ı, `isSandbox:true` içeriyor) ve `payment_page_url` (`https://sandbox-cpp.iyzipay.com?token=...`) döndüğü görüldü, buyer bilgilerinin (isim/email/telefon) doğru taşındığı da yanıtta gözle teyit edildi. Bu, projedeki iyzico entegrasyonunun GERÇEKTEN çalıştığının kod-okuma/mock-test'in ötesinde ilk kanıtı. Test verisi (kullanıcı/randevu/payment) sonunda temizlendi. `manage.py check` temiz, client `tsc -b` temiz.
> - **Not**: `IYZICO_CALLBACK_URL` hâlâ boş - kullanıcı bunu lokal test için nasıl dolduracağını sordu (ngrok ile tünelleme + `ALLOWED_HOSTS`'a tünel domain'inin eklenmesi gerektiği anlatıldı, kod değişikliği gerekmedi bu kısım için) - gerçek callback/postback döngüsü (ödeme sonrası Zoom/bildirim tetiklenmesi) henüz uçtan uca denenmedi, sıradaki adım bu.

> ## 🔧 Son Değişiklikler (2026-08-26, 23. tur) — Ödeme Akışının Randevu/Bildirim/Mail Entegrasyonu
> 22. turda kurulan `payments/` app'i bu turda gerçek randevu yaşam döngüsüne bağlandı (kök claude.md 29. tur, aynı iş - iki frontend tarafı için oraya bakın).
> - **`mailer/services.py::send_payment_required_email(appointment)`** (YENİ) - `send_appointment_confirmed_email`/`send_appointment_created_email`'daki AYNI şablon/CTA desenini kullanıyor ama CTA linki randevu detayına değil `{FRONTEND_URLS.client}/payments?appointmentId={id}`'ye gider (Zoom henüz yok, ödeme bekleniyor). `appointments/views.py::status_update()` ve `appointments/serializers.py::CreateAppointmentWithZoomSerializer.create()`, artık `grant_appointment_access_if_paid()`'in dönüş değerine (True/False) göre iki mailden birini seçiyor - state machine'e dokunulmadı.
> - **`notifications/models.py`**: `TYPE_CHOICES`'a `payment_required`/`payment_succeeded` eklendi (migration `0004_alter_notification_notification_type` - SADECE choices, DB şeması/kolonu değişmedi, `notification_type` zaten düz `CharField`). **`notifications/services.py`**: `create_payment_required_notification(appointment)` (danışana, `appointment` FK'sini kullanıyor - yeni alan yok) ve `create_payment_succeeded_notification(payment)` (hem danışana hem uzmana AYRI birer satır, `payment.appointment` üzerinden duck-typed - BİLİNÇLİ OLARAK ücretsiz ilk seans hakkının tüketildiği an çağrılmıyor, orada gerçek para hareketi yok).
> - **`payments/services.py`**: modül seviyesinde `from notifications.services import create_payment_succeeded_notification` eklendi (notifications hiçbir zaman payments'ı import etmediği için döngü riski yok - appointments↔payments'taki karşılıklı bağımlılığın aksine burası tek yönlü). Üç gerçek başarı noktasına (`_mock_complete_checkout`, `handle_checkout_callback`'in DIRECT dalı, `capture_preauth`) `create_payment_succeeded_notification(payment)` çağrısı eklendi - hepsi `ensure_zoom_meeting()`'den HEMEN sonra, aynı "artık gerçekten erişim var" anında.
> - **`appointments/serializers.py::AppointmentSerializer`**: üç yeni `SerializerMethodField` - `payment_status` (`not_applicable`/`unpaid`/`paid`, `payments.services.has_appointment_been_paid()`'e deferred-import ile bakıyor, appointments zaten payments'ı serbestçe import edebiliyor), `session_price`/`session_currency` (`obj.expert.expertprofile`'dan). Bu TEK serializer değişikliği hem client'ın yeni "Ödemeler" sayfasını hem expert panelindeki rozeti besledi - `GET /appointments/` zaten var olan tek endpoint, yeni bir uç açmaya gerek kalmadı.
> - **Doğrulama**: gerçek dev `db.sqlite3`'e karşı, `APIRequestFactory`+`force_authenticate` ile GERÇEK view'lar üzerinden (serializer'ı izole çağırmak değil) 16 kontrol: (1) danışan talep edip uzman onaylıyor (`AppointmentDetailView.status_update`) → `payment_status` doğru geçişi (`not_applicable`→`unpaid`→ mock ödeme sonrası `paid`) yapıyor, Zoom SADECE ödeme sonrası oluşuyor, `payment_required` bildirimi doğru oluşuyor; (2) `AppointmentCheckoutView` üzerinden mock checkout → `payment_succeeded` bildirimi HEM danışana HEM uzmana düşüyor; (3) uzmanın doğrudan oluşturduğu randevuda (`ExpertAppointmentCreateView`) da aynı `payment_required` dallanması çalışıyor. Test scripti kendi ürettiği TÜM veriyi (kullanıcı/randevu/payment/notification) sonunda silip sıfır kaldığını ayrıca sorguladı. `manage.py check` + `makemigrations --check --dry-run` temiz.

> ## 🔧 Son Değişiklikler (2026-08-26, 22. tur) — Yeni `payments/` App'i: iyzico Ödeme Entegrasyonu (Checkout Form, DIRECT + hazır-ama-bağlanmamış PREAUTH akışı)
> Kullanıcı ödeme altyapısını iyzico ile kurma isteğini iletti. Kod yazmadan önce üç mimari karar tartışıldı: **(1)** Checkout Form (iyzico hosted sayfa) mı yoksa kendi non-3DS formu mu — Checkout Form seçildi, gerekçe kod zorluğu değil kalıcı teknik borç: kart verisi backend'e hiç dokunmuyor (PCI-DSS SAQ-A vs SAQ-D), 3DS'in doğal olarak akışın parçası olması (non-3DS = fraud/chargeback liability merchant'ta kalır). **(2)** local+sunucu-test var ama gerçek prod yok — bu yüzden `IYZICO_MODE` (mock/sandbox/production) `ENVIRONMENT`'tan BAĞIMSIZ yeni bir env değişkeni: gerçek prod'a çıkana kadar "prod" olarak deploy edilen sunucu bile `sandbox` modda kalabilir, mail/storage'ın `ENVIRONMENT=Production`'a geçmesiyle ödemenin gerçek paraya geçmesi birbirine bağlı değil. **(3)** ödeme noktası — kullanıcı önce "talepten önce öde"yi düşündü, tartışma sonrası **"Zoom erişimi verilmeden hemen önce" (uzman onayından sonra)** kararlaştırıldı: reddedilen bir talep için hiç para hareketi olmuyor (sadece onaylı+sonradan-iptal senaryosu için iade kalıyor, o da şimdilik admin'den manuel), appointments'ın status state machine'ine hiç dokunulmuyor. Kullanıcı ayrıca resmi iyzico dokümanlarından (docs.iyzico.com/odeme-metotlari/on-provizyon) ön provizyon/postAuth/cancel akışının Checkout Form'da da desteklendiğini bulup paylaştı ve bunun **AYRI bir initialize akışı** (parametre farkı değil, gerçekten farklı endpoint: `preauth/ecom`) olarak kurulmasını istedi — appointments akışı şimdilik DIRECT (`auth/ecom`) kullanmaya devam edecek şekilde karar verildi, PREAUTH tam çalışır durumda kuruldu ama hiçbir yerden çağrılmıyor (ileride "talep anında bloke" politikasına geçilirse hazır).
> - **Danışan hesabı bazında, ömür boyu bir kez ücretsiz ilk seans** — ayrı bir alan/model YOK, `payments/services.py::is_client_eligible_for_free_session()` danışanın daha önce (herhangi bir randevu için) `SUCCEEDED` bir `Payment`'ı olup olmadığına bakıyor (messaging'in seans-kotası "mevcut veriden hesapla" deseniyle tutarlı). Hak kullanıldığında `amount=0`, `status=SUCCEEDED`, `metadata={'free_trial': True}` bir `Payment` kaydı oluşuyor - bu hem "hak kullanıldı" işareti hem audit kaydı, ikinci bir alan gerekmiyor. `ExpertProfile.free_first_session` (var olan ama hiç kullanılmayan, uzman bazlı "tüm ilk seans ücretsiz" bayrağı) BİLİNÇLİ OLARAK dokunulmadı - kullanıcı "hangi app'te tutulması best practice ise" dedi, karar: accounts'a hiç dokunmadan tamamen payments içinde, hesaplanan bir değer olarak tutmak (best practice: yeni state değil, mevcut veriden türetilen bir sorgu).
> - **Yeni `payments/` app'i** (`zoom`/`mailer` gibi service-katmanı ağırlıklı, ama parasal kayıt gerektirdiği için TEK modeli var): `models.py` → `Payment` (payer, appointment [nullable - ileride randevuya bağlı olmayan paket satın alımları için], payment_type [şimdilik sadece `single_session`], flow [`direct`/`preauth`], status [`pending`/`authorized`/`succeeded`/`voided`/`failed`/`refunded`], amount/currency, conversation_id/provider_token/provider_payment_id, `metadata` JSONField [ileride indirim/kupon detayları buraya - şema değişmeden] ). `payer` FK'sında bilinçli olarak `on_delete=PROTECT` kullanıldı (projenin geri kalanı User FK'larında CASCADE kullanıyor - mali kayıtların sessizce silinmemesi için sapma).
> - **`services.py`**: `resolve_appointment_payment(appointment)` appointments'ın çağırdığı ana giriş noktası - zaten ödenmişse ya da ücretsiz hak varsa `True` (hakkı tüketip) döner, yoksa `False` (hiçbir şeye dokunmadan). `initiate_direct_checkout()` (DIRECT/`auth/ecom`, appointments akışına bağlı OLAN), `handle_checkout_callback()` (iyzico'nun callbackUrl'e POST ettiği token ile `CheckoutForm.retrieve` sorgusu yapıp Payment'ı günceller - DIRECT'te başarı=SUCCEEDED+Zoom tetikler, PREAUTH'ta sadece AUTHORIZED'a çeker), `initiate_preauth_checkout()`/`capture_preauth()` (postAuth)/`void_preauth()` (cancel) - PREAUTH akışının tamamı, hazır ama bağlı değil. `IYZICO_MODE=='mock'` iken hiçbir fonksiyon gerçek iyzico'ya gitmiyor, `initiate_direct_checkout` anında `SUCCEEDED` sayıp Zoom'u senkron tetikliyor (gerçek modda bunu `handle_checkout_callback` yapar, mock modda hiç callback yaşanmayacağı için).
> - **Adres/buyer alanı boşluğu (bilinçli basitleştirme)**: iyzico Checkout Form `buyer.city/country/zipCode/registrationAddress` ve `billingAddress` alanlarını ZORUNLU tutuyor ama Lunova (video seans satıyor, fiziksel ürün yok) hiçbir zaman gerçek şehir/adres/posta kodu toplamamış (`User`/`ClientProfile` modellerinde böyle bir alan yok). Kimlik/iletişim alanları (TCKN → `id_number`/`national_id`, telefon, email) gerçek kullanıcı verisi, ama adres alanları için sabit bir yer tutucu kullanıldı (`payments/services.py::_build_buyer_and_billing()` docstring'inde işaretli). 🟢 **Düşük, bilinçli**: iyzico'nun risk/fraud motoru ileride bunu sorun ederse gerçek adres toplanması gerekebilir - şimdilik değerlendirilmedi.
> - **`appointments/services.py` (YENİ dosya)**: `ensure_zoom_meeting()` - önceden `appointments/serializers.py` (`CreateAppointmentWithZoomSerializer.create()`) ve `appointments/views.py` (`status_update()`'in confirmed dalı) içine AYRI AYRI kopyalanmış olan Zoom mock/real oluşturma mantığı, payments'ın üçüncü bir çağırana (ödeme callback'i) ihtiyaç duymasıyla buraya çıkarıldı. `grant_appointment_access_if_paid()` (yeni) - yukarıdaki iki çağrı noktası artık Zoom'u DOĞRUDAN değil bunun üzerinden istiyor: `payments.services.resolve_appointment_payment()` `False` dönerse hiçbir şey yapmıyor, randevu durumu (pending/confirmed) etkilenmiyor, sadece `zoom_meeting_id` boş kalıyor.
> - **`views.py`**: `AppointmentCheckoutView` (`POST /api/v1/payments/appointments/<id>/checkout/`, `IsAuthenticated`, sadece randevunun kendi client'ı çağırabilir - 403/404/400 net ayrılmış) ve `checkout_callback` (`POST /api/v1/payments/callback/`, düz Django view - DRF/JSON değil, iyzico'nun kullanıcı tarayıcısı üzerinden form-POST ettiği + sonunda frontend'e `HttpResponseRedirect` döndüğü bir uç; kimliksiz/`AllowAny` - iyzico isteği hiçbir Lunova cookie'si taşımadığı için `CookieJWTAuthentication` zaten anonime düşüyor, CSRF hiç tetiklenmiyor). `admin.py`'de `PaymentAdmin` - iade şimdilik OTOMATİK değil (iyzico refund API'si bağlanmadı, kalan tek senaryo - onaylı+ödenmiş randevunun sonradan iptali - için admin'in manuel "İade Edildi" toplu aksiyonu yeterli görüldü).
> - **iyzico Python SDK doğrulaması (uydurulmadı, gerçek kaynaktan doğrulandı)**: resmi dokümanlar (`docs.iyzico.com`) preauth/postAuth/cancel endpoint path'lerini tam vermiyordu - SDK'nın kendi GitHub reposundaki (`iyzico/iyzipay-python`) `samples/` dizini (`initialize_checkout_form_preauth.py`, `create_payment_postauth.py`, `cancel.py` vb.) doğrudan çekilip TAM parametre/response şekli oradan alındı (`iyzipay.CheckoutFormInitializePreAuth`, `iyzipay.PaymentPostAuth`, `iyzipay.Cancel`, `iyzipay.CheckoutForm().retrieve()` - sınıf adları/kullanım şekli birebir örnek koddan). `iyzipay==1.0.46` (PyPI'daki en güncel sürüm) `requirements.txt`'e eklendi, venv'e kuruldu.
> - **Doğrulama - gerçek dev `db.sqlite3`'e karşı, oluşturulan TÜM test verisi script sonunda silindi (silindiği ayrıca sorgulanıp teyit edildi)**: (1) 19 kontrol - ücretsiz ilk seans hakkının ilk randevuda kullanılması + `Payment(amount=0, SUCCEEDED)` oluşması, ikinci randevuda hakkın tükenmiş olması + Zoom'un ödemeden önce oluşturulmaMAsı, `IYZICO_MODE=mock` ile `initiate_direct_checkout`'un anında `SUCCEEDED` dönüp Zoom'u tetiklemesi, çift ödemenin `PaymentError` ile engellenmesi, `session_price=None` ve TCKN'siz kullanıcı hatalarının doğru mesajla reddedilmesi, `AppointmentCheckoutView`'ın gerçek `force_authenticate` ile 403 (başkasının randevusu)/201 (başarılı)/400 (zaten ödenmiş)/404 (yok)/401 (kimliksiz) döndüğü - hepsi doğrudan fonksiyon/view çağrısıyla. (2) 7 kontrol - `iyzipay.CheckoutForm.retrieve`/`PaymentPostAuth.create`/`Cancel.create` `unittest.mock.patch` ile sahtelenerek (gerçek ağ isteği YOK, henüz gerçek key de yok) `handle_checkout_callback`'in DIRECT başarı/başarısızlık, PREAUTH başarı (AUTHORIZED'a çeker, SUCCEEDED'a değil, Zoom tetiklemez) dallanmaları + `capture_preauth`/`void_preauth`'ın başarı/başarısızlık/yanlış-durum guard-clause senaryoları doğrulandı. Toplam 26/26 geçti. `manage.py check` + `makemigrations --check --dry-run` temiz.
> - **Bilinçli olarak bu turda YAPILMADI**: frontend entegrasyonu (client'ta "ödeme yap" butonu, checkout_form_content/payment_page_url'e yönlendirme, `/payments/result` sonuç sayfası) - bu tur backend'e odaklandı, kullanıcı ayrı bir aşama olarak ele alacak. Gerçek sandbox/production key'leri yok (`IYZICO_MODE=mock` varsayılan, kullanıcı key'leri edinince `.env`'e ekleyecek). Toplu seans paketi/indirim/indirim kodu (kök claude.md → Geliştirme Fikirleri) - `Payment.metadata`/`payment_type` şema olarak buna hazır ama model/mantık kurulmadı. **Not**: `IYZICO_CALLBACK_URL` backend'in KENDİ (frontend değil) callback endpoint'i olmalı ve iyzico'nun sunucularından erişilebilir olmalı - sandbox'ı localden test etmek isteyen bir geliştirici bunu unutmamalı (örn. ngrok gibi bir tünel gerekir, düz `localhost` çalışmaz).

> ## 📜 Daha Eski Turlar (2026-08-26, 21. tur ve öncesi) — arşivlendi
> Kök `CLAUDE.md`'nin "son 3 tur ayrıntılı tutulur" kuralı burada da uygulandı. Net sonuçları aşağıdaki "⚠️ Bilinen Gerçek Sorunlar" listesinde ✅ maddeleri olarak duruyor (randevu talep/onay/iptal durumu mailleri + ortak Lunova HTML şablonu + asenkron gönderim eklendi [21. tur], yeni `mailer/` app'i - mail gönderimi merkezileştirildi, görünen isim desteği eklendi [20. tur], onaylanmış belgeler de artık silinebiliyor [deactivate] + belge indirme CORS hatası düzeltildi [19. tur], belge silme = aktif/pasif [deactivate] özelliği danışan+uzman panelinde eklendi, `DocumentDeleteView`'daki gereksiz `storage.delete()` çağrısı kaldırıldı [18. tur], belge onay/red akışı + admin panel genel güçlendirmesi + form versiyon görünürlüğü eklendi [17. tur], veritabanı besleme script'lerine isimlendirilmiş ekip hesapları + `messaging`/`notifications` feed'leri + `feed_db.py` orkestrasyon script'i eklendi [16. tur], mesaj sınırlaması saatlik throttle'dan seans-bazlı bir kotaya çevrildi (`messaging/services.py::get_client_remaining_quota()`, ayrı bir model/alan olmadan `Appointment`/`Message` verisinden hesaplanan) [15. tur, 25. turda arşive taşındı — daha önce burada gözden kaçmıştı], uzman-danışan not/mesaj sistemi + bildirim zili entegrasyonu eklendi [14. tur], 🔴 kritik `forms/views.py` client_id çakışma bug'ı düzeltmesi [13. tur], global bildirim sistemi eklendi [12. tur], danışan formları otomatik versiyonlama + kritik skorlama hatası düzeltmesi [11. tur], Zoom mock URL placeholder'a çevrildi [10. tur], CSRF koruması [5. tur], AvailabilityExceptionView serializer düzeltmesi [4. tur], access token refresh [3. tur], ProfileView write/read-serializer tutarsızlığı + `timezone` alanı eksikliği [devam turu], login/me `id`/`role` eksikliği + danışanın kendi talebini geri çekebilmesi [Randevu Zinciri turu]). Tam ayrıntı `git log -p -- backend/CLAUDE.md` ile geri getirilebilir.
>
> <details><summary>Silinen turların başlıkları (arşiv referansı için)</summary>
>
> - 2026-08-24, 21. tur — Randevu Durumu Mailleri (Talep/Onay/İptal) + Ortak HTML Şablon + Asenkron Gönderim
> - 2026-08-24, 20. tur — Yeni `mailer/` App'i: Mail Gönderimi Merkezileştirildi
> - 2026-08-22, 19. tur — Onaylanmış Belgeler Artık Silinebiliyor (Deactivate) + Belge İndirme CORS Düzeltmesi
> - 2026-08-22, 18. tur — Belge Silme = Aktif/Pasif (Deactivate), Danışan+Uzman Panelinde Silme Butonu
> - 2026-08-22, 17. tur — Yeni Özellik: Belge Onay/Red Akışı (Admin) + Admin Panel Genel Güçlendirme + Form Versiyonu Görünürlüğü
> - 2026-08-21, 16. tur — Veritabanı Besleme: İsimlendirilmiş Ekip Hesapları + messaging/notifications Feed'leri + Ana Orkestrasyon Script'i
> - 2026-08-20, 15. tur — Mesaj Sınırlaması Saatlik Throttle'dan Seans-Bazlı Kotaya Çevrildi
> - 2026-08-20, 14. tur — Yeni Özellik: Uzman-Danışan Not/Mesaj Sistemi + Bildirim Zili Entegrasyonu
> - 2026-08-20, 13. tur — 🔴 Kritik: forms/views.py Client ID Çakışma Bug'ı Düzeltmesi
> - 2026-08-20, 12. tur — Yeni Özellik: Global Bildirim Sistemi
> - 2026-08-19, 11. tur — Danışan Formları: Otomatik Versiyonlama + Kritik Skorlama Hatası Düzeltmesi
> - 2026-08-19, 10. tur — Zoom Mock URL Placeholder Düzeltmesi
> - 2026-08-17, 5. tur — CSRF Koruması
> - 2026-08-17, 4. tur — AvailabilityExceptionView.delete() Serializer Düzeltmesi
> - 2026-08-17, 3. tur — Access Token Refresh Mekanizması
> - 2026-08-17, devam — Profil Düzenleme + Yerel Ortam
> - 2026-08-17 — Randevu Zinciri
>
> </details>

## 📋 Hızlı Başlangıç

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt

# .env dosyası repo'da YOK ve örnek (.env.example) da YOK.
# backend/README.md "başlangıç kitini incele" diyor — gerekli değişkenler
# (aşağıdaki "Zorunlu Environment Variables" bölümüne bakın) elle oluşturulmalı.

python manage.py migrate
python accounts/tests/feed_accounts.py    # SQLite için TEK gereken script (zorunlu temel veri)
# PostgreSQL kullanıyorsan ayrıca:
python availability/tests/feed_availability.py
python appointments/tests/feed_appointments.py
python forms/tests/feed_forms.py
python messaging/tests/feed_messaging.py       # (16. tur, YENİ)
python notifications/tests/feed_notifications.py   # (16. tur, YENİ)

# ÖNERİLEN (16. tur, YENİ): yukarıdaki hepsini doğru bağımlılık sırasıyla tek
# komutla çalıştırır, isimlendirilmiş ekip test hesaplarını (selin, selen, onur,
# ece, eslem, gokcen, niga, mustafa, yusuf -> <isim>@mail.com uzman +
# danisan_<isim>@mail.com eşleşmiş danışan, şifre: password123) da içerir.
python feed_db.py                # --list ile sırayı, --apps a,b ile alt kümeyi görebilirsin

python manage.py runserver     # http://localhost:8000/  , admin: /admin/
```

## 🏗️ Gerçek Dosya Yapısı

```
backend/
├── accounts/
│   ├── tests/feed_accounts.py → `NAMED_TEAM_REAL_INFO`'daki her isim artık bir `"role"`
│   │                          (expert|client) taşıyor - ekibin yarısı gerçek @lunova.tr
│   │                          kimliğiyle UZMAN, yarısı gerçek kimlikle DANIŞAN (`danisan_`
│   │                          önekSİZ) tarafında test ediyor; kök `claude.md`'nin "aynı gün,
│   │                          küçük ek düzeltme" notuna bakın - roller ileride ters çevrilecek.
│   ├── models.py           → User, AdminProfile, ExpertProfile, ClientProfile, Document,
│   │                          Service, Language, University, DegreeLevel, Major,
│   │                          Specialization, ApproachMethod, TargetGroup, SessionType,
│   │                          AddictionType, EmergencyContact  (14 model — zengin taksonomi)
│   ├── views/views.py      → Register (expert/client/admin), Login, Logout, Me,
│   │                          ExpertList, ClientList, PasswordReset(Request/Confirm)
│   ├── views/profile.py    → ProfileView (GET/PATCH)
│   ├── views/document_views.py → DocumentListCreate, DocumentPresignUpload, DocumentDelete
│   ├── services.py           (17. tur, YENİ) → review_document()/sync_review_fields()/
│   │                          notify_document_review() - belge onay/red iş mantığı, admin
│   │                          panelindeki tekil düzenleme VE toplu aksiyonlar buradan geçer
│   ├── authentication.py   → CookieJWTAuthentication (cookie veya header'dan token okur)
│   ├── permissions.py, storage/{base,supabase,mock,factory}.py
│   ├── migrations/           → 0001_initial, 0002_document_status (17. tur, YENİ - Document.status
│   │                          alanı + verified=True→status=approved backfill data migration'ı)
│   └── tests/               → test_accounts_complete.py, feed_accounts.py (16. tur, YENİ:
│                          seed_named_team_accounts() - isimlendirilmiş ekip test hesapları)
│
├── appointments/            ⭐ En iyi dokümante edilmiş app — README.md ve ENDPOINTS.md
│   │                          kod ile satır satır örtüşüyor, örnek alınmalı.
│   ├── models.py            → Appointment (expert/client User FK'ları, 6 durumlu status)
│   ├── services.py           (22. tur, YENİ) → ensure_zoom_meeting() (views.py/serializers.py'de
│   │                          AYRI AYRI kopyalanmış olan Zoom mock/real oluşturma mantığının tek
│   │                          paylaşılan noktası - payments'ın 3. bir çağırana ihtiyacıyla çıkarıldı),
│   │                          grant_appointment_access_if_paid() (payments.services.
│   │                          resolve_appointment_payment() üzerinden ödeme/ücretsiz-hak kontrolü
│   │                          yapıp GEÇERSE ensure_zoom_meeting'i tetikler)
│   ├── views.py              → status_update içinde geçiş matrisi + (22. tur, YENİ) confirmed
│   │                          dalında Zoom artık DOĞRUDAN değil grant_appointment_access_if_paid()
│   │                          üzerinden + confirmed/cancel_requested/cancelled'da mailer.services çağrıları
│   ├── serializers.py        → (22. tur, YENİ) CreateAppointmentWithZoomSerializer.create() de aynı
│   │                          şekilde grant_appointment_access_if_paid() kullanıyor; her iki create()
│   │                          (Client/Expert) sonunda mailer.services.send_appointment_created_email()
│   └── permissions.py        → IsExpertOrClientForCreatePermission, IsAppointmentParticipantPermission,
│                                IsAppointmentExpertPermission, IsAppointmentClientPermission
│
├── availability/
│   ├── models.py            → WeeklyAvailability (UniqueConstraint + CheckConstraint VAR),
│   │                          AvailabilityException, AppointmentSlot (kullanılmayan/opsiyonel model)
│   └── views.py              → WeeklyAvailabilityView.put()/.delete() slot birleştirme/bölme mantığı
│                                (basit CRUD değil, kayda değer iş mantığı içeriyor)
│
├── zoom/
│   ├── services.py           → get_zoom_access_token(), create_zoom_meeting() (Server-to-Server OAuth);
│   │                          create_mock_zoom_meeting(appointment_id) (10. tur, YENİ) — dev/mock ortamda
│   │                          gerçek görünümlü `https://zoom.us/j/<10-haneli-id>` formatında placeholder
│   │                          döndürür (önceden appointments/views.py ve serializers.py'de ayrı ayrı
│   │                          literal `"mock url"` string'i tekrarlanıyordu, artık tek paylaşılan fonksiyon)
│   ├── urls.py                → SADECE POST /meetings/ (create_zoom_meeting fonksiyon view'ı)
│   └── (appointments/views.py VE appointments/serializers.py bu servisleri doğrudan import edip
│       çağırıyor — bağımsız REST kaynağı değil, appointments'a sıkı bağımlı)
│
├── forms/                    ⭐ Tam işlevsel klinik form/skorlama motoru (DAST-10, SDS, genel sağlık)
│   ├── models.py              → Form.calculate_risk_level(), Answer.calculate_score() otomatik hesaplama;
│   │                          Form.group_key/version (11. tur, YENİ) - versiyonlama alanları
│   ├── versioning.py           (11. tur, YENİ) → form_has_responses(), get_latest_version(),
│   │                          fork_form_version() - detay için aşağıdaki "11. tur" changelog girişine bakın
│   ├── admin.py                → VersionForkAdminMixin (11. tur, YENİ) - Form/Question/QuestionOption
│   │                          admin'lerini otomatik versiyonlama ile korur; FormResponse/Answer zaten
│   │                          adminden tamamen gizli (has_module_permission/has_view_permission False)
│   └── views.py                → Client ve Expert için ayrı response görünümleri, rol bazlı yetki
│
├── notifications/             (12. tur, YENİ; 14. turda genişletildi) → Bildirim sistemi
│   ├── models.py               → Notification (user, notification_type — 'appointment_reminder'|'message',
│   │                          dedupe_key, appointment FK, related_user FK [14. tur, YENİ - 'message' türü
│   │                          için], is_read/read_at) - UniqueConstraint(user, dedupe_key) idempotency temeli
│   ├── services.py              → sync_appointment_reminders() (3 gün içindeki confirmed randevular için
│   │                          get_or_create ile bildirim üretir - job scheduler YOK, her GET'te çalışır),
│   │                          cleanup_old_read_notifications() (20 günden eski okunmuşları siler),
│   │                          create_message_notification() (14. tur, YENİ - messaging/views.py'den çağrılır)
│   ├── views.py                 → NotificationListView (GET, sync+cleanup tetikler), NotificationMarkReadView (PATCH)
│   └── tests/feed_notifications.py  (16. tur, YENİ) → tüm kullanıcılar için sync_appointment_reminders()'ı
│                              tetikler + bazı bildirimleri okunmuş/20-günden-eski-okunmuş işaretler (test verisi)
│
├── messaging/                 (14. tur, YENİ) → Uzman-danışan not/mesaj sistemi (klasik chat DEĞİL)
│   ├── models.py               → Conversation (expert/client User FK, UniqueConstraint(expert,client),
│   │                          last_message_at) + Message (body=CharField(max_length=1000), is_read/read_at)
│   │                          - Conversation SADECE ilk mesaj gönderiminde (get_or_create) oluşur, GET'te değil
│   ├── services.py              (15. tur, YENİ) → get_client_remaining_quota() - danışanın seans-bazlı
│   │                          not hakkını (iki seans arası 5, her tamamlanan seans sonrası yenilenir)
│   │                          Appointment+Message verisinden HESAPLAR, ayrı bir "kota" modeli/alanı yok
│   └── views.py                 → ConversationMessagesView (GET/POST /conversations/<other_user_id>/messages/,
│   │                          other_user_id HER ZAMAN User.id - bkz. 13. tur'un client_id dersi; yanıt şekli
│   │                          {"messages":[...],"client_quota":{...}}); danışan için body>200 karakter veya
│   │                          quota.remaining<=0 ise sunucu taraflı 400/403 (uzmanın hiçbir sınırı yok);
│   │                          ConversationListView (GET /conversations/, sadece expert - roster/unread/quota özeti)
│   └── tests/feed_messaging.py (16. tur, YENİ) → isimlendirilmiş ekip çiftleri için kota-senaryolu örnek
│                              sohbetler + genel havuzdan rastgele bir alt küme için sade örnek sohbetler
│
├── mailer/                    (20. tur, YENİ; 21. turda genişledi) → Mail gönderiminin tek geçiş noktası,
│                          zoom/ ile aynı şekilde models.py/migrations/views.py/urls.py YOK (REST kaynağı
│                          değil, sadece diğer app'lerin import ettiği bir servis katmanı - api/v1/urls.py'de
│                          DE yer almıyor, zoom'un aksine tek bir app'e değil hiçbir app'e özel bağımlı değil)
│   ├── templates/mailer/base_email.html  (21. tur, YENİ) → tüm mail türlerinin paylaştığı tek Lunova HTML
│   │                          şablonu (logosuz, sade "Lunova" yazılı mavi başlık + paragraf/detay-kutusu/
│   │                          opsiyonel CTA butonu, tablo tabanlı basit inline-CSS)
│   └── services.py             → _dispatch() (private, EmailMultiAlternatives ile hem text hem html
│                          gövde gönderir) - "gerçekten SMTP'ye mi gidilecek yoksa konsola mı loglanacak"
│                          kararı (settings.ENVIRONMENT) SADECE burada; From ADRESİ hep EMAIL_HOST_USER
│                          (Gmail giriş kimliğiyle eşleşmek zorunda), DEFAULT_FROM_NAME="Lunova Destek"
│                          SADECE görünen etiketi değiştirir, from_name parametresiyle mail türüne göre
│                          override edilebilir. send_template_email() (senkron, base_email.html'i render
│                          eder) ve send_template_email_async() (aynısını threading.Thread ile arka planda -
│                          fail_silently'yi HER ZAMAN True zorlar, sistemi bloklamaz/bozmaz) üzerine kurulu.
│                          Tipli sarmalayıcılar: send_password_reset_email() (senkron - bu istekte mail
│                          göndermek yan etki değil asıl amaç), send_appointment_created_email()/
│                          send_appointment_confirmed_email()/send_appointment_cancellation_email() (asenkron,
│                          appointment nesnesi duck-typed, appointments/serializers.py + views.py'den
│                          çağrılır) - yeni bir mail türü eklendikçe aynı desende bir tane daha eklenir,
│                          enum/registry YOK (YAGNI, bkz. 21. tur changelog). Gmail SMTP kullanımı bilinçli
│                          bir tercih (kullanıcı harici bir servise şimdilik geçmek istemedi) - modülün
│                          kendi docstring'inde ileride gerekirse nereye bakılacağı not düşülü.
│
├── payments/                  (22. tur, YENİ) → iyzico ödeme entegrasyonu. zoom/mailer'dan farklı olarak
│   │                          TEK bir modeli var (Payment - parasal kayıt gerektirdiği için) - migrations/
│   │                          da bu yüzden mevcut, diğer "leaf" app'lerin aksine.
│   ├── models.py              → Payment (payer [on_delete=PROTECT - projenin geri kalanından bilinçli
│   │                          sapma], appointment [nullable], payment_type, flow [direct/preauth],
│   │                          status [pending/authorized/succeeded/voided/failed/refunded], amount/
│   │                          currency, conversation_id/provider_token/provider_payment_id, metadata JSON)
│   ├── services.py             → resolve_appointment_payment() (appointments'ın çağırdığı ana giriş
│   │                          noktası) + is_client_eligible_for_free_session() (ücretsiz ilk seans,
│   │                          hesaplanan - ayrı alan yok) + initiate_direct_checkout()/
│   │                          handle_checkout_callback() (DIRECT/auth-ecom, appointments akışına BAĞLI
│   │                          olan) + initiate_preauth_checkout()/capture_preauth()/void_preauth()
│   │                          (PREAUTH/preauth-ecom+postAuth+cancel, hazır ama HİÇBİR yerden çağrılmıyor)
│   ├── views.py                → AppointmentCheckoutView (POST /payments/appointments/<id>/checkout/,
│   │                          DRF) + checkout_callback (POST /payments/callback/, düz Django view -
│   │                          iyzico'nun form-POST callback'i, sonunda frontend'e redirect eder)
│   ├── admin.py                → PaymentAdmin, mark_refunded toplu aksiyonu (iade şimdilik manuel)
│   └── migrations/0001_initial.py
│
├── api/v1/urls.py            → accounts/, zoom/, appointments/, forms/, availability/, notifications/, messaging/, payments/ include'ları
├── lunova_backend/settings.py
├── requirements.txt           (Docker altyapısı eklenirken UTF-8'e çevrildi - önceki "UTF-16" notu eskiydi,
│                          bkz. kök claude.md; hâlâ kullanılmayan `rest-framework-simplejwt==0.0.2` satırı var)
├── feed_db.py                 (16. tur, YENİ) → backend kökünde tüm app'lerin feed'lerini doğru sırayla
│                          (accounts→availability→appointments→messaging→notifications→forms) çalıştıran
│                          orkestrasyon script'i (`--apps`/`--skip-forms`/`--list` argümanları var)
├── db.sqlite3
└── .github/CODEOWNERS         ← CI workflow YOK, sadece CODEOWNERS var
```

## 🔐 Authentication (doğrulanmış davranış)

```python
# accounts/authentication.py — gerçek kod
class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = self.get_raw_token(header) if header else request.COOKIES.get('access_token')
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
            if BlacklistedToken.objects.filter(token__jti=validated_token['jti']).exists():
                return None
            return self.get_user(validated_token), validated_token
        except Exception:
            return None
```

**SIMPLE_JWT gerçek değerleri** (`settings.py`) — **[2026-08-17'de güncellendi]**:
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=1),   # önceden 7 gündü; artık idle-timeout mekanizması olarak kullanılıyor
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```
✅ **`accounts/urls.py` içinde artık `token/refresh/` endpoint'i VAR** (`TokenRefreshView`, `accounts/views/views.py`). `ROTATE_REFRESH_TOKENS=True` ayarı artık gerçekten tetikleniyor: her başarılı refresh çağrısı `rest_framework_simplejwt.serializers.TokenRefreshSerializer` üzerinden eski refresh token'ı blacklist'e alıp (jti/exp/iat rotasyonuyla) yenisini üretiyor. Cookie set etme mantığı `set_auth_cookies(response, access_token, refresh_token)` adlı ortak bir helper'a taşındı (`LoginView` de artık bunu kullanıyor) — süreler `settings.SIMPLE_JWT`'den okunuyor, tek doğruluk kaynağı.

`REFRESH_TOKEN_LIFETIME`'ın 1 saat olması bilinçli bir tasarım kararı (kullanıcı talimatı): reaktif (sadece bir istek 401 aldığında tetiklenen, proaktif zamanlayıcı OLMAYAN) bir refresh stratejisiyle birleşince, bu doğal bir "1 saatlik idle timeout" oluşturuyor — kullanıcı aktifse (en az saatte bir istek atıyorsa) oturum kayan pencereyle uzar; tamamen hareketsiz kalırsa 1 saat sonra bir sonraki istekte refresh de başarısız olur, tekrar login gerekir. 1 saat spesifik olarak seçildi çünkü seanslar Zoom üzerinden yapılıyor (`appointment_duration` üst sınırı 50 dk) ve bir görüşme boyunca kullanıcı Lunova sekmesinde hiçbir istek atmıyor olabilir — 30 dk gibi daha kısa bir pencere, görüşme ortasında oturumu düşürüp kullanıcıyı tam görüşme biterken tekrar login'e zorlardı.

`POST /accounts/token/refresh/` görüntüsü: body gerekmez (cookie'den okur), başarılı yanıt `{"detail": "Oturum yenilendi."}` + yeni `access_token`/`refresh_token` cookie'leri. Refresh token eksik/geçersiz/süresi dolmuş/blacklist'teyse temiz `401 {"detail": "...", "code": "token_not_valid"}` döner (500 riski yok — `curl` ile hem eksik cookie hem "garbage" token hem rotasyonlanmış-eski-token senaryoları test edildi, hepsi doğru 401 verdi).

**Login/Logout response gerçek şekli:**
```python
# LoginView.post() — response body:
{"name": ..., "surname": ..., "email": ..., "profile_photo": ..., "gender": ...}
# access/refresh JSON'da YOK, sadece httpOnly cookie olarak set ediliyor.
# role/id de YOK.

# Cookie parametreleri (login):
access_token:  httponly=True, samesite='None', secure=True, max_age=900      (15 dk)
refresh_token: httponly=True, samesite='None', secure=True, max_age=604800   (7 gün)
# Production'da (ENVIRONMENT=Production) domain='lunova.tr' eklenir.
```

**Logout**: `POST /accounts/logout/` — cookie'deki refresh_token'ı `RefreshToken(...).blacklist()` ile blacklist'e ekler, cookie'leri siler. `IsAuthenticated` permission'ı var (yani access_token geçerli olmalı — süresi dolmuşsa logout çağrısı da 401 alabilir, bir edge-case).

### Permission sınıfları (gerçek, dağınık — tek dosyada değil)
```
accounts/permissions.py    → (mevcut ama LoginView/ProfileView çoğunlukla IsAuthenticated kullanıyor)
appointments/permissions.py → IsExpertOrClientForCreatePermission, IsAppointmentParticipantPermission,
                               IsAppointmentExpertPermission, IsAppointmentClientPermission
availability/permissions.py → IsExpertPermission, IsAvailabilityOwnerPermission, IsExpertOrAuthenticatedReadOnly
```

## 🔌 API Endpoint Referansı

Kök dizindeki [claude.md](../claude.md) dosyasında tam liste var (accounts/appointments/availability/zoom/forms — hepsi gerçek `urls.py`'lerden). Burada tekrar etmiyoruz; sadece şunu vurgulamak gerekir: **`appointments/ENDPOINTS.md` ve `appointments/README.md`, kodla neredeyse birebir örtüşüyor** — durum geçiş matrisi, query param zorunlulukları, yetki kuralları hepsi doğru. Diğer app'ler için böyle bir güven seviyesi yok (aşağıya bakın).

## 📊 Models — Gerçek Alanlar

Detaylı alan listesi için kök [claude.md](../claude.md)'deki "Data Models" bölümüne bakın. Öne çıkan noktalar:

- `bio`, `hourly_rate`, `phone_verified`, `timezone` (ExpertProfile üzerinde) gibi önceki dokümantasyonda geçen alanlar **gerçekte yok**. Gerçek karşılıkları: `about`, `session_price`+`currency`, (yok), `User.timezone`.
- `ClientProfile.expert` diye bir FK var (danışana atanan uzman) — önceki dokümanda hiç yoktu, ama `ClientListView`, `forms` view'ları ve `FormClientResponsesView` gibi birçok yerde bu ilişki üzerinden yetki kontrolü yapılıyor. Bunu bilmeden appointments/forms akışlarını anlamak zor.
- Profil fotoğrafı ayrı bir alan değil — generic `Document` modeli üzerinden `type=profile_photo` ile tutuluyor ve her istekte `Document.objects.filter(user=..., type=PROFILE_PHOTO).first()` ile ayrıca sorgulanıyor (N+1 riski — `LoginView`, `MeView` her ikisi de bunu her çağrıda yapıyor).
- `WeeklyAvailability` üzerinde **gerçek DB constraint'leri var** (`unique_expert_service_day_time`, `start_time < end_time`) — önceki raporun "constraint eksik" iddiası yanlıştı.

## ⚙️ Zorunlu Environment Variables

`.env` dosyası repo'da yok, `settings.py`'den derlenmiş liste:

```bash
DEBUG=True|False
ENVIRONMENT=Development|Production
SECRET_KEY=...
ALLOWED_HOSTS=localhost:8000,127.0.0.1:8000        # env.list, boşsa ImproperlyConfigured fırlatır
DB_URI=Lunova-lite                                   # SQLite için özel değer; başka her şey dj_database_url'e gider
FRONTEND_URLS={"expert":"http://localhost:5173","client":"http://localhost:5174","admin":"..."}
                                                       # Production'da expert/client/admin ÜÇÜ de zorunlu
STORAGE_PROVIDER=mock|supabase
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_BUCKET=...   # sadece supabase ise
ZOOM_CLIENT_ID=... ZOOM_CLIENT_SECRET=... ZOOM_ACCOUNT_ID=...         # her zaman zorunlu (env.str, default yok)
EMAIL_BACKEND=... EMAIL_HOST=... EMAIL_HOST_USER=... EMAIL_HOST_PASSWORD=...   # default'ları var, opsiyonel
IYZICO_MODE=mock|sandbox|production                                  # (22. tur, YENİ) default 'mock', ENVIRONMENT'tan bağımsız
IYZICO_SANDBOX_API_KEY=... IYZICO_SANDBOX_SECRET_KEY=...              # sadece IYZICO_MODE=sandbox iken zorunlu
IYZICO_PRODUCTION_API_KEY=... IYZICO_PRODUCTION_SECRET_KEY=...        # sadece IYZICO_MODE=production iken zorunlu
IYZICO_CALLBACK_URL=...                                               # backend'in KENDİ callback endpoint'i, mock'ta kullanılmaz
```

Development'ta CORS `["http://localhost:5173", "http://localhost:5174"]` olarak **hardcoded** — `CORS_ALLOW_ALL_ORIGINS=True` diye bir ayar **yok** (önceki dokümanın iddia ettiğinin aksine).

## 🧪 Testing

Gerçek durum:
- `accounts/tests/test_accounts_complete.py` — HTTP üzerinden çalışan, sunucunun ayakta olmasını gerektiren bir smoke-test scripti (pytest/Django TestCase değil, `requests` ile çağrı yapan bağımsız bir script). Sadece `ENVIRONMENT=Development` veya `DEBUG=true` iken çalışıyor.
- Diğer app'lerde (`appointments`, `availability`, `forms`, `zoom`) otomatik test dosyası **yok** — sadece veri besleme (`feed_*.py`) scriptleri var, bunlar test değil. **Bu hâlâ doğru** — 2026-08-17'de çalışan bir ortam kurulup profil akışı manuel `curl` ile doğrulandı, ama bu bir otomatik test paketi eklemedi; bir sonraki oturum bu app'ler için gerçek test yazmayı değerlendirebilir.
- `.github/` içinde sadece `CODEOWNERS` var, **CI workflow (test/lint otomasyonu) yok**.

```bash
venv\Scripts\python accounts/tests/test_accounts_complete.py   # sunucu ayaktayken (venv artık gerçekten mevcut, bkz. yukarıdaki "Hızlı Başlangıç")
venv\Scripts\python manage.py test                              # şu an pratikte çok az şey kapsıyor
```

## 📚 App Bazında README Güvenilirlik Notu

Kullanıcı ekibin dokümantasyonu incelemesini istediği için, her app README'sinin kodla ne kadar örtüştüğünü işaretliyoruz:

| App | README/ENDPOINTS.md durumu |
|---|---|
| `appointments/` | ✅ Çok iyi — README.md + ENDPOINTS.md kodla (durum matrisi, query param zorunlulukları, yetkiler) neredeyse birebir örtüşüyor. Diğer app'ler için şablon olarak kullanılabilir. |
| `availability/` | ⚠️ Kısmen doğru — genel akış anlatımı doğru ama endpoint path'leri yanlış (`/appointments/availability/...` yazıyor, gerçeği `/api/v1/availability/...`). `AppointmentSlot` modeli README'de hiç geçmiyor. |
| `zoom/` | ⚠️ Örnek response gövdesi (`success`, `password`, `host_email` alanları) gerçek `create_zoom_meeting()` dönüşüyle birebir uyuşmuyor — gerçek fonksiyon Zoom API'sinin ham JSON'unu döndürüyor, README'deki gibi sabit bir şekil garanti etmiyor. |
| `forms/` | ✅ Çok iyi — model alanları, skorlama tipleri, risk seviyeleri kodla birebir örtüşüyor. Önceki AI raporunun "forms app kullanılmıyor/eksik" iddiası **yanlıştı**; bu modül tam işlevsel. |
| `accounts/README.md` | ❌ Yanıltıcı başlık — "Auth docs" değil, sadece `db_feed`/seed script kullanım talimatı. Gerçek auth mimarisini (cookie akışı, permission sınıfları) hiç anlatmıyor; bu dosyanın (backend/claude.md) üstlendiği rolü README üstlenmiyor. |
| kök `README.md` | ✅ İyi — kurulum adımları, feed script yolları (`accounts/tests/feed_accounts.py` vb.) doğru; önceki AI dokümanının kullandığı `accounts/db_feed.py` yolu **yanlıştı**. |

## ⚠️ Bilinen Gerçek Sorunlar (özet, detay için kök [claude.md](../claude.md))

1. ✅ **[DÜZELTİLDİ — 2026-08-17, 5. tur]** ~~CSRF koruması muhtemelen hiç aktif değil.~~ `CookieJWTAuthentication.enforce_csrf()` eklendi + cookie'ler `SameSite=Lax` + iki frontend'de axios xsrf config. `curl` ile orijinal PoC yeniden test edildi: `205` → `403`. Detay için yukarıdaki "5. tur" changelog girişine bakın. **Tek açık nokta**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı (bkz. kök claude.md).
2. ✅ **[DÜZELTİLDİ — 2026-08-17]** ~~Access token 15 dk, refresh endpoint yok~~ — `POST /accounts/token/refresh/` eklendi, `REFRESH_TOKEN_LIFETIME` 1 saate çekildi. Detay için yukarıdaki "SIMPLE_JWT gerçek değerleri" bölümüne bakın.
3. ✅ **[DÜZELTİLDİ — 2026-08-17, 4. tur]** ~~`availability/views.py` → `AvailabilityExceptionView.delete()`, `ProfileView`'da düzeltilen "PATCH/DELETE response'u GET'ten farklı, dar bir serializer ile üretiliyor" hatasının aynısı~~ — output artık `AvailabilityExceptionSerializer` kullanıyor, `curl` ile doğrulandı. Detay için yukarıdaki "4. tur" changelog girişine bakın.
4. ✅ **[düzeltildi]** ~~`requirements.txt` UTF-16 kodlu~~ — Docker altyapısı eklenirken (2026-08-17) UTF-8'e çevrildi, bu turda `file requirements.txt` ile ASCII/UTF-8 olduğu doğrulandı. Şüpheli `rest-framework-simplejwt==0.0.2` paketi hâlâ requirements.txt'te duruyor (kullanılmıyor gibi görünüyor, temizlenebilir — düşük öncelik).
5. 🟡 **[14. turda kısaca denendi, 15. turda geri alındı]** Genel/global rate limiting yok (`django-ratelimit` requirements'ta yok, global `DEFAULT_THROTTLE_CLASSES` tanımlı değil). 14. turda `messaging/`'in gönderim endpoint'i için DRF `ScopedRateThrottle` denendi (30/hour) ama kullanıcı bunun yerine seans-bazlı bir mesaj KOTASI istedi (bkz. 15. tur) — throttle tamamen kaldırıldı, `messaging/` artık zaman-bazlı değil `messaging/services.py::get_client_remaining_quota()` ile hesaplanan bir kota kullanıyor. Diğer TÜM endpoint'ler (login, appointments, forms vb.) hâlâ herhangi bir rate limiting'e tabi değil.
6. 🟡 DRF pagination global olarak tanımlı değil; `available-experts/` gibi bazı uçlar Python içinde ağır döngüsel hesap yapıyor (asıl risk burada, appointments listesi zaten tarih aralığıyla sınırlı).
7. 🟢 CI yok, otomatik test yok (appointments hariç neredeyse hiçbir app'te) — bu turda kurulan yerel ortam bunu değiştirmedi, sadece manuel test/doğrulamayı mümkün kıldı.
8. ✅ **[DÜZELTİLDİ — 2026-08-19, 10. tur]** ~~Dev/mock ortamda `zoom_join_url`/`zoom_start_url` literal `"mock url"` string'i taşıyordu, frontend `window.open()` bunu relative path sanıp kendi 404 sayfasına düşüyordu~~ — `zoom/services.py`'ye eklenen `create_mock_zoom_meeting()` artık gerçek `https://zoom.us/j/...` formatında bir URL döndürüyor. Detay için yukarıdaki "10. tur" changelog girişine bakın. **Tek açık nokta**: gerçek tarayıcıda tıklanarak henüz doğrulanmadı.
9. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormSubmitView`, gönderilen HİÇBİR form cevabı için gerçek bir skor hesaplamıyordu — `total_score` her zaman `0.0`'da kalıyor, `risk_level`/`percentage_score` submission anındaki bu sıfıra göre hesaplanıp bir daha asla güncellenmiyordu (expert'in gördüğü risk değerlendirmesi anlamsızdı); ayrıca `AnswerSubmitSerializer`'da `numeric_answer` alanı hiç yoktu, `scale`/`number` tipi sorular (örn. SDS formu) skorlama açısından işlevsizdi~~ — `FormSubmitView.post()` artık her cevap için `Answer.calculate_score()`'u çağırıp topluyor, `FormResponse.total_score`'u gerçek toplamla tekrar `save()` ediyor; `AnswerSubmitSerializer`'a `numeric_answer` eklendi. Gerçekten çalıştırılarak (Django shell + `APIRequestFactory`) doğrulandı. Detay için yukarıdaki "11. tur" changelog girişine bakın.
10. ✅ **[DÜZELTİLDİ — 2026-08-19, 11. tur]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, bir danışan henüz bir uzmana atanmamışsa (`ClientProfile.expert=None`) HERHANGİ bir uzmanın erişmesine izin veriyordu~~ — `client_profile.expert != expert` olarak sıkılaştırıldı, artık sadece gerçekten atanmış uzman erişebiliyor.
11. 🟡 **[11. turda bulundu, bilinçli olarak kapsam dışı bırakıldı]** `forms/models.py` → `Question.next_question`, hiçbir queryset kısıtı olmadan TÜM formlardaki soruları referans alabiliyor (formlar arası çapraz link mümkün) — sadece admin panelindeki dropdown `QuestionAdmin.formfield_for_foreignkey` ile aynı forma sınırlandı (11. tur), model seviyesinde bir `clean()`/validasyon eklenmedi.
12. ✅ **[DÜZELTİLDİ — 2026-08-20, 13. tur, 🔴 KRİTİK]** ~~`forms/views.py` → `FormClientResponsesView`/`FormClientResponseDetailView`, URL'deki `client_id`'yi önce `ClientProfile.id` olarak yorumlamayı deniyordu; tek gerçek çağıran taraf (expert frontend) her zaman `User.id` gönderdiği için, `User.id` sayısal olarak alakasız bir `ClientProfile`'ın PK'sıyla çakışırsa view YANLIŞ danışan profiline eşleşiyordu — en iyi ihtimalle yanlış bir 403, en kötü ihtimalle (çakışan profil aynı expert'e aitse) bir danışanın klinik verisinin başka bir danışan adı altında gösterilmesi~~ — gerçek DB'de bu turda TEYİT EDİLDİ (gerçek bir danışan için yanlışlıkla 403 alındığı görüldü) ve düzeltildi: artık `client_id` doğrudan ve sadece `User.id` olarak yorumlanıyor. Detay için yukarıdaki "13. tur" changelog girişine bakın.
13. ✅ **[DÜZELTİLDİ — 2026-08-22, 17. tur]** ~~Belge onay akışı sadece bir `verified` boolean'ıydı - admin panelinden tek tek/toplu onaylama/reddetme aksiyonu, kullanıcıya bildirim, ve "pending" ile "hiç incelenmedi" arasında ayrım yoktu~~ — `Document.status` (pending/approved/rejected) + `accounts/services.py::review_document()` + admin toplu aksiyonları + `notifications`'a yeni `document_status` türü eklendi. Detay için yukarıdaki "17. tur" changelog girişine bakın.
14. 🟢 **[17. turda bulundu, düzeltilmedi]** `client/src/types/profile.types.ts`'deki eski `Document.filename` alanının gerçek backend alanıyla (`original_filename`) hiç eşleşmediği (sessiz `undefined` bug'ı) bu turda fark edilip client tarafında düzeltildi (bkz. `client/claude.md`). Aynı sınıf bir tutarsızlık başka bir frontend/serializer çiftinde de var olabilir - sistematik bir tarama yapılmadı, sadece bu spesifik dosya (zaten status badge'i için düzenleniyordu) düzeltildi.
15. ✅ **[DÜZELTİLDİ — 2026-08-22, 18. tur]** ~~Danışan/uzman kendi yüklediği bir belgeyi silemiyordu (`DELETE /accounts/documents/<uid>/` UI'dan hiç çağrılmıyordu, client'ta stub'du, expert'te API fonksiyonu vardı ama UI'ya hiç bağlı değildi); ayrıca var olan `DocumentDeleteView` "silme"yi gerçek bir storage silmesiyle karıştırıyordu~~ — `is_current` aktif/pasif anahtarı (önceden de vardı, kullanıcı-tetiklemeli bir akışa hiç bağlanmamıştı) artık iki frontend'de de gerçek bir silme butonuna bağlı; `storage.delete()` çağrısı kaldırıldı (dosya storage'da kalıyor). Detay için yukarıdaki "18. tur" changelog girişine bakın.
16. ✅ **[DÜZELTİLDİ — 2026-08-22, 19. tur]** ~~Onaylanmış bir belge kullanıcı tarafından silinemiyordu (deactivate edilemiyordu) - kullanıcı bunu "saçma" bulup sordu~~ — `DocumentDeleteView.perform_destroy()`'daki `status==APPROVED` engeli kaldırıldı (silme artık geri alınabilir bir deactivate olduğu için orijinal "geri dönüşsüz kaybetme" gerekçesi geçersizdi); `is_primary` engeli aynen korundu.
17. 🟢 **[25. turda bulundu, 21. turda güncel kaldı]** `settings.DEFAULT_FROM_EMAIL` tanımlı (`lunova_backend/settings.py`) ama `mailer/services.py::_dispatch()`'in gerçek gönderim yolunda kullanılmıyor — bilinçli olarak orijinal davranış (`EMAIL_HOST_USER` gönderen adresi) korundu, çünkü Gmail SMTP genelde From başlığının kimlik doğrulama hesabıyla eşleşmesini istiyor - `DEFAULT_FROM_EMAIL`'e geçmek deployment'ta sessiz bir teslim sorununa yol açabilirdi. Düşük öncelik, gerçek SMTP kimlik bilgileri/sağlayıcısı netleştiğinde tekrar değerlendirilebilir.
18. 🟡 **[21. turda bulundu, bilinçli olarak kabul edildi]** `mailer/services.py::send_template_email_async()` `threading.Thread` kullanıyor — Celery/kuyruk YOK, retry/persistence YOK. Uygulama süreci mail gönderilmeden ÖNCE çökerse/yeniden başlarsa (örn. deploy sırasında) o mail sessizce kaybolur. Kullanıcıya açıkça anlatılıp kabul edildi (mail burada ana veri kaynağı değil, sadece bir bilgilendirme yan etkisi - randevu durumu zaten DB'ye senkron yazılıyor). Hacim arttıkça ve/veya gerçek hata takibi (kullanıcının bahsettiği "hataları bir mail adresine yönlendirme" fikri) gerektiğinde Celery+Redis (ya da en azından bir `EmailLog`+retry komutu) değerlendirilebilir - şu an YAGNI gereği kurulmadı.

---
**Son Güncelleme**: 2026-08-26, 23. tur (22. turda kurulan `payments/` app'i gerçek randevu yaşam döngüsüne bağlandı. Uzman onaylayınca/randevu oluşturunca ödeme gerekiyorsa yeni `send_payment_required_email` + `payment_required` bildirimi danışana gidiyor [genel "onaylandı" mailinin yerini alıyor]; gerçek bir ödeme tamamlanınca [mock/DIRECT-callback/PREAUTH-postAuth] hem danışana hem uzmana `payment_succeeded` bildirimi [`notifications/models.py`'ye migration'lı 2 yeni tip]. `AppointmentSerializer`'a `payment_status`/`session_price`/`session_currency` eklendi - ayrı bir endpoint gerekmedi. Gerçek dev DB'ye karşı GERÇEK view'lar üzerinden [`force_authenticate`] 16 kontrol geçti, tüm test verisi temizlendi. `manage.py check` + `makemigrations --check` temiz. İki frontend'in entegrasyonu (client: yeni "Ödemeler" sayfası; expert: ödeme rozeti) aynı turda yapıldı - detay kök claude.md 29. tur, client/claude.md 23. tur, expert/claude.md 20. tur)
