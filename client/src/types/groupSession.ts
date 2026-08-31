// src/types/groupSession.ts
//
// Backend: appointments/serializers.py::GroupSessionSerializer/
// GroupSessionParticipantSerializer/MyGroupParticipationSerializer/
// GroupSessionWaitlistSerializer (Faz 1, Frontend Yapılandırması planı).

export type GroupSessionStatus = "scheduled" | "cancelled" | "completed";

export type GroupParticipantStatus = "pending_approval" | "approved" | "rejected";

export type GroupPaymentStatus = "not_applicable" | "unpaid" | "paid";

export interface GroupSessionParticipant {
  id: number;
  client: number;
  client_name: string;
  client_email: string;
  client_recovery_status: string | null;
  status: GroupParticipantStatus;
  payment_status: GroupPaymentStatus;
  joined_at: string;
  reviewed_at: string | null;
}

// GroupSessionSerializer.get_my_participation - ya bir GroupSessionParticipant
// temsili (kind alanı yok, status/payment_status'ten ayırt edilir) ya da
// bekleme listesindeki basit {id, status:'waiting', payment_status:'not_applicable'} şekli.
export type MyParticipationSummary =
  | (GroupSessionParticipant & { kind?: undefined })
  | { id: number; status: "waiting"; payment_status: "not_applicable" };

export interface GroupSession {
  id: number;
  expert: number;
  expert_name: string;
  session_offering: number;
  session_offering_name: string;
  session_type: number | null;
  session_type_name: string | null;
  variant: number | null;
  variant_label: string | null;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  status: GroupSessionStatus;
  approved_count: number;
  remaining_spots: number;
  price: string | number | null;
  currency: string | null;
  zoom_join_url: string | null;
  my_participation: MyParticipationSummary | null;
  participants: GroupSessionParticipant[];
  created_at: string;
  updated_at: string;
}

export interface GroupSessionWaitlistEntry {
  id: number;
  group_session: GroupSession;
  joined_waitlist_at: string;
  notified_at: string | null;
}

export interface MyGroupParticipation {
  id: number;
  group_session: GroupSession;
  status: GroupParticipantStatus;
  payment_status: GroupPaymentStatus;
  joined_at: string;
  reviewed_at: string | null;
}

export interface MyGroupSessionsResponse {
  participations: MyGroupParticipation[];
  waitlist: GroupSessionWaitlistEntry[];
}
