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
// (Faz 2/8, Frontend Yapılandırması planı, YENİ) 'group_join_requested' -
// SADECE uzman tarafında görünür (bkz. expert/features/notifications), client
// tarafı sadece 'group_payment_required'/'group_join_rejected'/
// 'group_waitlist_spot_available' türlerini alır - hepsi group_session_id taşır.
// (Admin Panel Dokümantasyon/Güvenlik turu, YENİ) 'group_session_cancelled' -
// bir grup seansı iptal edildiğinde HEM onaylı katılımcılara HEM bekleme
// listesindekilere gider; 'group_participant_reassigned' - admin panelinden
// başka bir gruba aktarıldığında - ikisi de group_session_id taşır, aynı
// "Grup Seanslarım" sayfasına yönlendirir.
// (35. tur, YENİ) Randevu yaşam döngüsü türleri - hepsi appointment_id
// taşır, özel bir routing dalı gerekmez (aşağıdaki genel appointment_id
// fallback'i zaten randevu detayına yönlendirir): 'appointment_created'
// (uzman doğrudan bir randevu oluşturdu), 'appointment_confirmed' (uzman
// onayladı - ilk eşleşmedeyse metin uzman atandığını da belirtir),
// 'appointment_cancel_requested'/'appointment_cancelled' - bu ikisi client
// tarafında NORMALDE görünmez (cancel_requested uzmana, cancelled genelde
// karşı tarafa gider) ama tip güvenliği için tanımlı. 'form_submitted'
// SADECE uzman tarafında görünür (danışan kendi form gönderimi için
// bildirim almıyor).
export type NotificationType =
  | "appointment_reminder"
  | "message"
  | "document_status"
  | "payment_required"
  | "payment_succeeded"
  | "free_trial_ready"
  | "group_join_requested"
  | "group_payment_required"
  | "group_join_rejected"
  | "group_waitlist_spot_available"
  | "group_session_cancelled"
  | "group_participant_reassigned"
  | "appointment_requested"
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_cancel_requested"
  | "appointment_cancelled"
  | "form_submitted";

export interface NotificationItem {
  id: number;
  notification_type: NotificationType;
  title: string;
  body: string;
  appointment_id: number | null;
  related_user_id: number | null;
  group_session_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
