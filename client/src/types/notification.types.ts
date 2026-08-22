// Shared Notification type for client frontend
//
// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// Üç üretici tür var: 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur, appointment_id dolu olur), 'message' (messaging
// app'inden yeni bir not gönderildiğinde oluşturulur, related_user_id ilgili
// konuşmanın karşı tarafını taşır) ve 'document_status' (admin bir belgeyi
// onayladığında/reddettiğinde oluşturulur - hiçbir ek id taşımaz, tıklanınca
// sabit olarak kullanıcının kendi profil sayfasına yönlendirilir).
export type NotificationType = "appointment_reminder" | "message" | "document_status";

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
