// Shared Appointment type for client frontend
export interface PersonRef {
  id: number;
  name: string;
  image?: string;
  specialty?: string;
}

export interface Appointment {
  id: number;
  expert: PersonRef;
  client?: PersonRef | number;
  date: string;
  time: string;
  duration: number;
  status: string;
  notes?: string;
  zoom_join_url?: string | null;
  zoom_meeting_id?: string | null;
}

export default Appointment;
