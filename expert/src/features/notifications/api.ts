import api from '@/lib/api'

// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// Şu an tek üretici tür 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur) ama backend modeli ileride başka türler
// (örn. 'message') için de genel bırakıldı - appointment_id sadece randevu
// kaynaklı bildirimlerde dolu olur.
export type NotificationType = 'appointment_reminder'

export interface NotificationItem {
  id: number
  notification_type: NotificationType
  title: string
  body: string
  appointment_id: number | null
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
