// Shared Notification type for client frontend
//
// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// İki üretici tür var: 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur, appointment_id dolu olur) ve 'message' (messaging
// app'inden yeni bir not gönderildiğinde oluşturulur, related_user_id ilgili
// konuşmanın karşı tarafını taşır).
export type NotificationType = "appointment_reminder" | "message";

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
