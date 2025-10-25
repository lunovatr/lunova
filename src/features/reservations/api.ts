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
  status: 'pending' | 'confirmed' | 'rejected'
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
const USER_APPOINTMENTS_URL = API_BASE_URL + '/api/v1/appointments/user/'
const ACCOUNTS_ME_URL = API_BASE_URL + '/api/v1/accounts/me/'

// Helper function to get clean token (remove quotes if present)
const getCleanToken = (): string => {
  const token = useAuthStore.getState().auth.accessToken
  // Token JSON stringify edilmiş olabilir, tırnak işaretlerini temizle
  return token ? token.replace(/^"(.*)"$/, '$1') : ''
}

// User interface for /api/v1/accounts/me/ response
export interface CurrentUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  // Diğer alanlar varsa buraya eklenebilir
}

// Current user bilgilerini getir
export const getCurrentUser = async (): Promise<CurrentUser> => {
  console.log(`API: Fetching current user from ${ACCOUNTS_ME_URL}`)

  const token = getCleanToken()

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(ACCOUNTS_ME_URL, {
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

    const data: CurrentUser = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    throw error
  }
}

// Kullanıcının randevularını getir (expert ID'sini almak için)
export const getUserAppointments = async (): Promise<Appointment[]> => {
  console.log(`API: Fetching user appointments from ${USER_APPOINTMENTS_URL}`)

  const token = getCleanToken()

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(USER_APPOINTMENTS_URL, {
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
    console.error('Failed to fetch user appointments:', error)
    throw error
  }
}

// Expert ID'sini /api/v1/accounts/me/ endpoint'inden al
export const getExpertIdFromUserAppointments = async (): Promise<number | null> => {
  try {
    const currentUser = await getCurrentUser()
    return currentUser.id
  } catch (error) {
    console.error('Failed to get expert ID:', error)
    return null
  }
}

export const getAppointmentsByExpertId = async (
  _expertId: number
): Promise<Appointment[]> => {
  console.log(`API: Fetching appointments from ${USER_APPOINTMENTS_URL}`)

  const token = getCleanToken()

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(USER_APPOINTMENTS_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${token}`,
      },
      credentials: 'include',
    })

    // 4. Adım: Cevabı kontrol et.
    // Eğer cevap başarılı değilse (örn: 401 Unauthorized, 403 Forbidden, 500 Server Error)
    if (!response.ok) {
      // Eğer token süresi dolduysa (401), daha spesifik bir hata dönebiliriz.
      if (response.status === 401) {
        // Burada kullanıcıyı login sayfasına yönlendirme gibi bir mantık kurulabilir.
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }

    // 5. Adım: Cevap başarılıysa, JSON verisini component'in beklediği tipe dönüştür.
    // Backend'den dönen veri ile Appointment interface'imiz uyumlu olduğu için direkt return edebiliriz.
    const data: Appointment[] = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
    // Hatanın hook tarafından yakalanabilmesi için tekrar fırlatıyoruz.
    throw error
  }
}

// Randevu onaylama işlemi
export const confirmAppointment = async (appointmentId: number): Promise<void> => {
  const token = getCleanToken()

  if (!token) {
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}/confirm/`, {
      method: 'POST',
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
  } catch (error) {
    console.error('Failed to confirm appointment:', error)
    throw error
  }
}

// Randevu reddetme işlemi
export const rejectAppointment = async (appointmentId: number): Promise<void> => {
  const token = getCleanToken()

  if (!token) {
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie before request
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}/cancel-request/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${token}`,
        },
        credentials: 'include',
      },
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }
  } catch (error) {
    console.error('Failed to reject appointment:', error)
    throw error
  }
}

// Randevu oluşturma için interface
export interface CreateAppointmentRequest {
  expert: number
  client: number
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
    // Sadece aynı uzman için ve 'rejected' olmayan randevuları kontrol et
    if (
      existingApp.expert !== appointmentData.expert ||
      existingApp.status === 'rejected'
    ) {
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