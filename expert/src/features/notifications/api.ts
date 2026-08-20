import api from '@/lib/api'

// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// İki üretici tür var: 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur, appointment_id dolu olur) ve 'message' (messaging
// app'inden yeni bir not gönderildiğinde oluşturulur, related_user_id ilgili
// danışanın User.id'sini taşır).
export type NotificationType = 'appointment_reminder' | 'message'

export interface NotificationItem {
  id: number
  notification_type: NotificationType
  title: string
  body: string
  appointment_id: number | null
  related_user_id: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

const NOTIFICATIONS_URL = '/api/v1/notifications/'

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await api.get<NotificationItem[]>(NOTIFICATIONS_URL)
  return response.data
}

export const markNotificationRead = async (id: number): Promise<NotificationItem> => {
  const response = await api.patch<NotificationItem>(`${NOTIFICATIONS_URL}${id}/read/`)
  return response.data
}
