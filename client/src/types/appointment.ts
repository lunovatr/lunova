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
}

export default Appointment;
