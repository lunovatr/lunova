// src/features/dashboard/api.ts
import { useAuthStore } from '@/stores/auth-store'
import { addMinutes, areIntervalsOverlapping, format, parse } from 'date-fns'
// Not : eğer dolu bir saate randevu almaya çalışırsan toast hatasında geçersiz veri diyor , onun içine apiden dönen response'un içindeki object>non_field_errors'ı yazdırmalıyız
// Backend'den gelecek randevu verisinin tipi. Veritabanı şemasıyla uyumlu.
export interface Appointment {
  id: number
  date: string // "2025-09-01"
  time: string // "10:30:00"
  duration: number // dakika
  client: number
  client_name: string
  expert: number
  expert_name: string
  status: 'pending' | 'waiting_approval' | 'confirmed' | 'cancel_requested' | 'cancelled' | 'completed'
  notes?: string
  is_confirmed: boolean
  zoom_start_url: string
  zoom_join_url: string
  zoom_meeting_id: string
  created_at: string
  updated_at: string
}

// API endpoint'ini bir değişkene atamak daha temiz bir yöntemdir.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const APPOINTMENTS_URL = API_BASE_URL + '/api/v1/appointments/'

// Helper function to get clean token (remove quotes if present)
const getCleanToken = (): string => {
  const token = useAuthStore.getState().auth.accessToken
  // Token JSON stringify edilmiş olabilir, tırnak işaretlerini temizle
  return token ? token.replace(/^"(.*)"$/, '$1') : ''
}

// Randevuları tarih aralığına göre getir
// Backend artık tarih aralığı parametresi zorunlu kıldı (max 4 ay)
export const getAppointments = async (
  startDate: string,
  endDate: string
): Promise<Appointment[]> => {
  const url = `${APPOINTMENTS_URL}?start_date=${startDate}&end_date=${endDate}`
  console.log(`API: Fetching appointments from ${url}`)

  const token = getCleanToken()

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${token}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }

    const data: Appointment[] = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
    throw error
  }
}

// Randevu durum güncelleme işlemi
// Yeni unified endpoint kullanıyor: PATCH /api/v1/appointments/{id}/status/
export const updateAppointmentStatus = async (
  appointmentId: number,
  status: 'pending' | 'waiting_approval' | 'confirmed' | 'cancel_requested' | 'cancelled' | 'completed'
): Promise<void> => {
  const token = getCleanToken()

  if (!token) {
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}/status/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }

      if (response.status === 400) {
        const errorMessage = errorData.error || errorData.detail || 'Geçersiz durum geçişi.'
        throw new Error(errorMessage)
      }

      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }
  } catch (error) {
    console.error('Failed to update appointment status:', error)
    throw error
  }
}

// Randevu oluşturma için interface
export interface CreateAppointmentRequest {
  client: number
  expert: number
  date: string // "2025-09-01"
  time: string // "13:00:00"
  duration: number
  notes?: string
}

// Randevu oluşturma işlemi
export const createAppointment = async (
  appointmentData: CreateAppointmentRequest,
  existingAppointments: Appointment[]
): Promise<Appointment> => {
  // --- ÇAKIŞMA KONTROLÜ (CLIENT-SIDE) ---
  const newAppointmentStart = parse(
    `${appointmentData.date} ${appointmentData.time}`,
    'yyyy-MM-dd HH:mm:ss',
    new Date()
  )
  const newAppointmentEnd = addMinutes(
    newAppointmentStart,
    appointmentData.duration
  )

  const conflict = existingAppointments.find((existingApp) => {
    // 'cancelled' olmayan randevuları kontrol et (expert ID artık backend tarafından yönetiliyor)
    if (existingApp.status === 'cancelled') {
      return false
    }

    const existingAppointmentStart = parse(
      `${existingApp.date} ${existingApp.time}`,
      'yyyy-MM-dd HH:mm:ss',
      new Date()
    )
    const existingAppointmentEnd = addMinutes(
      existingAppointmentStart,
      existingApp.duration
    )

    return areIntervalsOverlapping(
      { start: newAppointmentStart, end: newAppointmentEnd },
      { start: existingAppointmentStart, end: existingAppointmentEnd },
      { inclusive: false } // Bitiş ve başlangıç saatleri aynıysa çakışma sayma
    )
  })

  if (conflict) {
    const conflictTime = format(
      parse(conflict.time, 'HH:mm:ss', new Date()),
      'HH:mm'
    )
    throw new Error(
      `Bu zaman aralığı, ${conflict.client_name} ile olan randevunuzla (${conflictTime}) çakışıyor.`
    )
  }
  // --- ÇAKIŞMA KONTROLÜ BİTTİ ---

  const token = getCleanToken()

  if (!token) {
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    console.log('Sending appointment data to API:', appointmentData)

    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/expert/create/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(appointmentData),
      }
    )

    // Response body'yi oku (hata durumunda da gerekli olabilir)
    const responseData = await response.json()

    if (!response.ok) {
      console.error('API Error Response:', responseData)
      
      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      
      if (response.status === 400) {
        // Backend'den gelen hata mesajını kullan
        const errorMessage =
          responseData.non_field_errors?.[0] ||
          responseData.detail ||
          responseData.message ||
          'Geçersiz veri gönderildi'
        throw new Error(errorMessage)
      }

      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }

    return responseData
  } catch (error) {
    console.error('Failed to create appointment:', error)
    throw error
  }
}