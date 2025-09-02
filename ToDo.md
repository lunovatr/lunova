## Yapılacaklar
### Backend'den client adlarını alma kodu geldiği gibi randevu oluşturma kısmında hepsi sıralanacak (yer : src/features/dashboard/components/create-appointment-modal.tsx)
### dashboard/api.ts şuan sadece localhost'a istek atıyor. Prod'a alınacağı zaman burası güncellenecek.
### saatlik randevuların üstüne tıklandığında detay görme ve update edebilme kısmı olmalı
---------
## Yapılmışlar
- Saatlik takvim oluşturuldu , otomatik olarak mevcut gün seçiliyor.Randevu uzunluğuna göre ayarlanıyor , boş olan saatler gösterilmiyor.
- Bekleyen randevular component'i oluşturuldu.status "pending" olan tüm randevular listeleniyor.Randevu kabul etme kısmı çalışıyor.Reddetme kısmı backend'deki 403 forbidden hatasından dolayı çalışmıyor.Ama frontend kodu sıkıntısız , orası düzeldiği gibi çalışıcak.
- Geçmiş randevular componenti oluşturuldu. Eğer randevu kabul edilmiş ve tarihi geçmiş ise tamamlandı olarak , eğer expert tarafından reddedildi ise reddedildi olarak gözüküyor.
- Randevu oluşturma componenti oluşturuldu. şimdilik el ile client id giriliyor , backend mimarisi değiştiği gibi buraya client isimleri gelicek. Mevcut kullanıcının expert id si otomatik , diğer bilgiler expert'in kendisi tarafından giriliyor.
- Auth store'a id eklendi
- Giriş çıkış yapıldığında tüm eski tokenler'ın birikip onlarca istek atılmasına sebep olan hata giderildi , artık her yeni gelen access token bir öncekinin yerini alıyor , birikmiyor
