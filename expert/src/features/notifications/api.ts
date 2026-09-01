import api from '@/lib/api'

// Backend kaynağı: backend/notifications/{models,serializers,views}.py
// Beş üretici tür var: 'appointment_reminder' (yaklaşan, onaylanmış randevular
// için otomatik oluşturulur, appointment_id dolu olur), 'message' (messaging
// app'inden yeni bir not gönderildiğinde oluşturulur, related_user_id ilgili
// danışanın User.id'sini taşır), 'document_status' (admin bir belgeyi
// onayladığında/reddettiğinde oluşturulur - uzman kendi belgelerini
// [diploma/CV/onam formu] yüklediği için bu bildirimin alıcısı da olabilir;
// ek bir id taşımaz, tıklanınca sabit olarak kendi profil sayfasına gider), ve
// (28. tur, YENİ) 'payment_succeeded' (danışan bir seansın ödemesini
// tamamladığında uzmana da bildirilir - appointment_id dolu, notification-dropdown'daki
// genel appointment_id fallback'i zaten /reservations?appointmentId=...'e yönlendiriyor,
// ayrı bir dallanma gerekmedi). 'payment_required' danışan tarafına özgü, uzman
// tarafında hiç üretilmiyor.
// (Faz 2/8, Frontend Yapılandırması planı, YENİ) 'group_join_requested' -
// bir danışan uzmanın grup seansına katılım talebi gönderdiğinde uzmana
// gider, group_session_id taşır (tıklanınca /groups?groupSessionId=...).
// (35. tur, YENİ) Randevu yaşam döngüsü türleri - hepsi appointment_id
// taşır, notification-dropdown.tsx'teki genel appointment_id fallback'i
// zaten /reservations?appointmentId=...'e yönlendiriyor, ayrı bir dal
// gerekmedi: 'appointment_requested' (bir danışan talep gönderdi - kök
// bug'ın düzeltmesi, bu tür EN sık görülecek olan), 'appointment_confirmed'
// (uzman kendi onayladığı bir randevu için normalde bildirim almaz, AMA bu
// danışan-uzman çiftinin İLK onaylanan randevusuysa - "yeni bir danışanla
// eşleştiniz" bildirimi bu türle gelir). 'appointment_created'/
// 'appointment_cancel_requested'/'appointment_cancelled' uzman tarafında da
// oluşabilir (tip güvenliği için tanımlı, özel bir routing gerekmiyor).
// 'form_submitted' - bir danışan form gönderdiğinde (appointment_id YOK,
// aşağıdaki handler'da sabit /client-forms'a yönlendiriliyor).
export type NotificationType =
  | 'appointment_reminder'
  | 'message'
  | 'document_status'
  | 'payment_succeeded'
  | 'group_join_requested'
  | 'appointment_requested'
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancel_requested'
  | 'appointment_cancelled'
  | 'form_submitted'

export interface NotificationItem {
  id: number
  notification_type: NotificationType
  title: string
  body: string
  appointment_id: number | null
  related_user_id: number | null
  group_session_id: number | null
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

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch(`${NOTIFICATIONS_URL}mark-all-read/`)
}
