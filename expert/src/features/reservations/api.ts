import api from '@/lib/api'
import { addMinutes, areIntervalsOverlapping, format, parse } from 'date-fns'

// Backend'den dönen randevu nesnesi tipi
export interface Appointment {
  id: number
  date: string // "2025-09-01"
  time: string // "10:30:00"
  duration: number // dakika
  client: number
  client_name: string
  expert: number
  expert_name: string
  status:
    | 'pending'
    | 'waiting_approval'
    | 'confirmed'
    | 'cancel_requested'
    | 'cancelled'
    | 'completed'
  notes?: string
  is_confirmed: boolean
  zoom_start_url: string
  zoom_join_url: string
  zoom_meeting_id: string
  // 'not_applicable' (henüz confirmed/completed değil), 'unpaid' (ödeme
  // bekleniyor) ya da 'paid' (ücretsiz ilk seans dahil) - backend
  // appointments/serializers.py::AppointmentSerializer.get_payment_status()'ten (28. tur).
  payment_status?: 'not_applicable' | 'unpaid' | 'paid'
  session_price?: string | number | null
  session_currency?: string | null
  // Danışanın ömür boyu bir kez hakkı olan ücretsiz ilk seansıyla mı
  // ilerlediği - true iken payment_status='unpaid' "ücretsiz seans onayı
  // bekleniyor" anlamına gelir, 'paid' ise onaylanmış/tamamlanmış demektir
  // (bkz. backend appointments/serializers.py::AppointmentSerializer, 30. tur).
  is_free_trial?: boolean
  // Faz 2/4/6 (Frontend Yapılandırması planı) - "hangi hizmet"/"hangi
  // teslimat şekli" artık serialize ediliyor; expert_earning SADECE ilgili
  // uzman kendi randevusuna baktığında dolar (backend tarafında gated).
  session_type?: number | null
  session_type_name?: string | null
  session_offering?: number | null
  session_offering_name?: string | null
  expert_earning?: string | number | null
  created_at: string
  updated_at: string
}

// API taban yolu (axios zaten baseURL içeriyor)
const APPOINTMENTS_URL = '/api/v1/appointments/'

/**
 * Randevuları tarih aralığına göre getirir
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export const getAppointments = async (
  startDate: string,
  endDate: string
): Promise<Appointment[]> => {
  try {
    const { data } = await api.get(APPOINTMENTS_URL, {
      params: { start_date: startDate, end_date: endDate },
    })
    return data
  } catch (error: any) {
    console.error('Failed to fetch appointments:', error)
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      'Randevular alınamadı.'
    throw new Error(message)
  }
}

export const getAppointmentDetail = async (id: number): Promise<Appointment> => {
  try {
    const { data } = await api.get(`${APPOINTMENTS_URL}${id}/`)
    return data
  } catch (error: any) {
    const message =
      error.response?.data?.detail || 'Randevu detayı alınamadı.'
    throw new Error(message)
  }
}

/**
 * Randevu durum güncelleme (PATCH /appointments/{id}/status/)
 */
export const updateAppointmentStatus = async (
  appointmentId: number,
  status:
    | 'pending'
    | 'waiting_approval'
    | 'confirmed'
    | 'cancel_requested'
    | 'cancelled'
    | 'completed'
): Promise<void> => {
  try {
    await api.patch(`${APPOINTMENTS_URL}${appointmentId}/status/`, { status })
  } catch (error: any) {
    console.error('Failed to update appointment status:', error)
    const message =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      'Durum güncellenemedi.'
    throw new Error(message)
  }
}

/**
 * Yeni randevu oluşturmak için tip
 */
export interface CreateAppointmentRequest {
  client: number
  expert: number
  date: string // "2025-09-01"
  time: string // "13:00:00"
  duration: number
  notes?: string
}

/**
 * Randevu oluşturma işlemi
 * Çakışma kontrolü (client-side) ve backend yanıt hatası dahil
 */
export const createAppointment = async (
  appointmentData: CreateAppointmentRequest,
  existingAppointments: Appointment[]
): Promise<Appointment> => {
  // --- ÇAKIŞMA KONTROLÜ ---
  const newStart = parse(
    `${appointmentData.date} ${appointmentData.time}`,
    'yyyy-MM-dd HH:mm:ss',
    new Date()
  )
  const newEnd = addMinutes(newStart, appointmentData.duration)

  const conflict = existingAppointments.find((a) => {
    if (a.status === 'cancelled') return false
    const start = parse(`${a.date} ${a.time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
    const end = addMinutes(start, a.duration)
    return areIntervalsOverlapping({ start: newStart, end: newEnd }, { start, end })
  })

  if (conflict) {
    const conflictTime = format(parse(conflict.time, 'HH:mm:ss', new Date()), 'HH:mm')
    throw new Error(
      `Bu zaman aralığı ${conflict.client_name} ile olan (${conflictTime}) randevunuzla çakışıyor.`
    )
  }

  // --- API İSTEĞİ ---
  try {
    const { data } = await api.post(
      '/api/v1/appointments/expert/create/',
      appointmentData
    )
    return data
  } catch (error: any) {
    console.error('Failed to create appointment:', error)

    const message =
      error.response?.data?.non_field_errors?.[0] ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      'Geçersiz veri gönderildi.'
    throw new Error(message)
  }
}
