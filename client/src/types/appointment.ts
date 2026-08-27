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
// bekleniyor - ücretsiz ilk seans onayı bekleyenler de 'unpaid' sayılır,
// ayırt etmek için is_free_trial'a bakın) ya da 'paid' (ücretsiz ilk seans
// dahil) - backend appointments/serializers.py::AppointmentSerializer.
// get_payment_status()'ten.
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
  // Danışanın ömür boyu bir kez hakkı olan ücretsiz ilk seansıyla mı
  // ilerlediği - true iken payment_status='unpaid' "Devam Et" (ücretsiz
  // onay) anlamına gelir, 'paid' ise onay tamamlanmış demektir (30. tur).
  is_free_trial?: boolean;
}

export default Appointment;
