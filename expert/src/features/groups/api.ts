import api from '@/lib/api'

// Backend kaynağı: backend/appointments/{models,serializers,group_views}.py
// (Faz 1/4, Frontend Yapılandırması planı) - "müsaitlik -> talep -> onay ->
// ödeme" akışı.

export type GroupParticipantStatus = 'pending_approval' | 'approved' | 'rejected'
export type GroupPaymentStatus = 'not_applicable' | 'unpaid' | 'paid'

export interface GroupSessionParticipant {
  id: number
  client: number
  client_name: string
  client_email: string
  client_recovery_status: string | null
  status: GroupParticipantStatus
  payment_status: GroupPaymentStatus
  joined_at: string
  reviewed_at: string | null
}

export interface GroupSessionWaitlistEntry {
  id: number
  client: number
  client_name: string
  client_email: string
  position: number
  joined_waitlist_at: string
  notified_at: string | null
}

export interface GroupSession {
  id: number
  expert: number
  expert_name: string
  session_offering: number
  session_offering_name: string
  session_type: number | null
  session_type_name: string | null
  variant: number | null
  variant_label: string | null
  date: string
  time: string
  duration: number
  capacity: number
  status: 'scheduled' | 'cancelled' | 'completed'
  approved_count: number
  remaining_spots: number
  price: string | number | null
  currency: string | null
  zoom_join_url: string | null
  participants: GroupSessionParticipant[]
  waitlist: GroupSessionWaitlistEntry[]
  created_at: string
  updated_at: string
}

export interface SessionOfferingVariantOption {
  id: number
  variant_key: string
  variant_label: string
}

export interface SessionOfferingOption {
  id: number
  code: string
  name: string
  category: string
  requires_multi_participant: boolean
  default_duration_minutes: number | null
  variants: SessionOfferingVariantOption[]
}

export interface SessionTypeOption {
  id: number
  name: string
}

const GROUP_SESSIONS_URL = '/api/v1/appointments/group-sessions/'

export const getGroupSessions = async (): Promise<GroupSession[]> => {
  try {
    const { data } = await api.get(GROUP_SESSIONS_URL)
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Grup seansları alınamadı.'
    throw new Error(message)
  }
}

export const getGroupSessionDetail = async (id: number): Promise<GroupSession> => {
  try {
    const { data } = await api.get(`${GROUP_SESSIONS_URL}${id}/`)
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Grup seansı detayı alınamadı.'
    throw new Error(message)
  }
}

export interface CreateGroupSessionPayload {
  session_offering: number
  session_type: number | null
  variant: number | null
  date: string
  time: string
  duration: number
  capacity: number
}

export const createGroupSession = async (
  payload: CreateGroupSessionPayload
): Promise<GroupSession> => {
  try {
    const { data } = await api.post(GROUP_SESSIONS_URL, payload)
    return data
  } catch (error: any) {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.non_field_errors?.[0] ||
      error.response?.data?.session_offering?.[0] ||
      'Grup seansı oluşturulamadı.'
    throw new Error(message)
  }
}

export const cancelGroupSession = async (id: number): Promise<void> => {
  try {
    await api.patch(`${GROUP_SESSIONS_URL}${id}/`, { status: 'cancelled' })
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Grup seansı iptal edilemedi.'
    throw new Error(message)
  }
}

export const reviewGroupParticipant = async (
  groupId: number,
  participantId: number,
  status: 'approved' | 'rejected'
): Promise<GroupSessionParticipant> => {
  try {
    const { data } = await api.patch(
      `${GROUP_SESSIONS_URL}${groupId}/participants/${participantId}/`,
      { status }
    )
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Talep güncellenemedi.'
    throw new Error(message)
  }
}

export const getGroupEligibleOfferings = async (): Promise<SessionOfferingOption[]> => {
  try {
    const { data } = await api.get('/api/v1/catalog/session-offerings/', {
      params: { group: 'true' },
    })
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Seans tipleri alınamadı.'
    throw new Error(message)
  }
}

export const getSessionTypes = async (): Promise<SessionTypeOption[]> => {
  try {
    const { data } = await api.get('/api/v1/accounts/session-types/')
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Seans türleri alınamadı.'
    throw new Error(message)
  }
}
