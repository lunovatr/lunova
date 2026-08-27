// Shared Notification type for client frontend
//
// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// Beş üretici tür var: 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur, appointment_id dolu olur), 'message' (messaging
// app'inden yeni bir not gönderildiğinde oluşturulur, related_user_id ilgili
// konuşmanın karşı tarafını taşır), 'document_status' (admin bir belgeyi
// onayladığında/reddettiğinde oluşturulur - hiçbir ek id taşımaz, tıklanınca
// sabit olarak kullanıcının kendi profil sayfasına yönlendirilir), ve (28. tur,
// YENİ) 'payment_required' (randevu onaylandı ama ödeme bekleniyor, appointment_id
// dolu - tıklanınca /payments?appointmentId=... sayfasına gider) ile
// 'payment_succeeded' (ödeme tamamlandı, appointment_id dolu - tıklanınca
// randevu detayına gider, appointment_reminder ile aynı genel appointment_id
// yönlendirmesini paylaşır). (30. tur, YENİ) 'free_trial_ready' -
// payment_required'ın ücretsiz ilk seans karşılığı (randevu onaylandı, danışanın
// ücretsiz hakkı var, "Devam Et" onayı bekleniyor) - appointment_id dolu,
// payment_required ile AYNI /payments?appointmentId=... hedefine gider.
export type NotificationType =
  | "appointment_reminder"
  | "message"
  | "document_status"
  | "payment_required"
  | "payment_succeeded"
  | "free_trial_ready";

export interface NotificationItem {
  id: number;
  notification_type: NotificationType;
  title: string;
  body: string;
  appointment_id: number | null;
  related_user_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
