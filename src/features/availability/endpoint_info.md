
Aşağıda tüm endpointlerin kısa açıklamaları yer almaktadır:
Tüm isteklerde Cookie adında bir header olmalı ve key'i : " access_token={access_token}" olmalı

- GET /appointments/availability/weekly/  
  Haftalık müsaitlikleri listeler.
  herhangi bir body gerekmiyor

- POST /appointments/availability/weekly/  
  Yeni haftalık müsaitlik ekler.
  örnek bir body:
  {
  "day_of_week": 0,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "service": 1,
  "is_active": true,
  "slot_minutes": 50,
  "capacity": 1
}


- GET /appointments/availability/weekly/{id}/  
  Belirli bir haftalık müsaitliği getirir.
  herhangi bir body gerekmiyor

- PUT /appointments/availability/weekly/{id}/  
  Haftalık müsaitliği günceller.
  örnek bir body : 
  {
  "day_of_week": 2,
  "start_time": "10:00:00",
  "end_time": "16:00:00"
}

- DELETE /appointments/availability/weekly/{id}/  
  Haftalık müsaitliği siler.
  herhangi bir body gerekmiyor

- GET /appointments/availability/exceptions/  
  İstisnaları listeler.
  herhangi bir body gerekmiyor

- POST /appointments/availability/exceptions/  
  Yeni istisna ekler.
  örnek bir body : 
  {
  "date": "2025-09-2",
  "start_time": "13:00:00",
  "end_time": "15:00:00",
  "exception_type": "add"
}

- GET /appointments/availability/exceptions/{id}/  
  Belirli bir istisnayı getirir.
  herhangi bir body gerekmiyor

- PUT /appointments/availability/exceptions/{id}/  
  İstisnayı günceller.
  örnek bir body : 
  {
  "date": "2025-09-11",
  "start_time": "14:00:00",
  "end_time": "16:00:00"
}

- DELETE /appointments/availability/exceptions/{id}/  
  İstisnayı siler.
  herhangi bir body gerekmiyor

- POST /appointments/availability/weekly/bulk/  
  Toplu haftalık müsaitlik ekler.
  örnek bir body : 
    {
  "availabilities": [
    {
      "day_of_week": 0,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "service": 1,
      "is_active": true,
      "slot_minutes": 50,
      "capacity": 1
    }
  ]
}

- POST /appointments/availability/exceptions/bulk/  
  Toplu istisna ekler.
  (Henüz tamamlanmadı , bundan bahseden bir fonksiyon yaz ama içi yorum satırı olsun)


- GET /appointments/availability/my-availability/  
  Kendi müsaitliklerini döner.
  herhangi bir body gerekmiyor

- GET /api/v1/availability/expert/{{my_id}}/calendar/?start_date={{start_date}}&end_date={{end_date}}
 Belirli bir tarihteki kendi müsaitliklerini döner (haftalık + istisnalar dahil).
 start_date = {start_date} (YYYY-MM-DD formatında)
 end_date = {end_date} (YYYY-MM-DD formatında)
 parametrelerini alır
 Bu endpoint hem haftalık müsaitlikleri hem de o tarihteki istisnaları birleştirip döner.