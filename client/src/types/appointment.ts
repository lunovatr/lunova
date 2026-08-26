// Shared Appointment type for client frontend
//
// NOT: backend'in AppointmentSerializer'ı (appointments/serializers.py) "expert" ve
// "client" alanlarını iç içe nesne olarak DEĞİL, düz User.id (sayı) olarak döner;
// isimler ayrıca "expert_name"/"client_name" alanlarında gelir. Önceden bu tip
// "expert: PersonRef" (nesne) olarak tanımlıydı ve bu yüzden AppointmentsTable.tsx
// içinde "appointment.expert?.id ?? (appointment as any).expert" gibi savunmacı
// (defensive) kod yazılmak zorunda kalınmıştı - tip burada gerçeğe uyduruldu.
export type AppointmentStatus =
  | "pending"
  | "waiting_approval"
  | "confirmed"
  | "cancel_requested"
  | "cancelled"
  | "completed";

// 'not_applicable' (henüz confirmed/completed değil), 'unpaid' (ödeme
// bekleniyor) ya da 'paid' (ücretsiz ilk seans dahil) - backend
// appointments/serializers.py::AppointmentSerializer.get_payment_status()'ten.
export type PaymentStatus = "not_applicable" | "unpaid" | "paid";

export interface Appointment {
  id: number;
  expert: number;
  expert_name?: string;
  client: number;
  client_name?: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  zoom_join_url?: string | null;
  zoom_meeting_id?: string | null;
  payment_status?: PaymentStatus;
  session_price?: string | number | null;
  session_currency?: string | null;
}

export default Appointment;
