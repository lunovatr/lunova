import { useAuthStore } from '@/stores/auth-store'
import { 
  AvailabilitySlot, 
  WeeklyAvailability, 
  AvailabilityException, 
  BulkWeeklyAvailability, 
  CalendarAvailability 
} from './types'

// Base URL configuration - can be easily swapped between local and production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// API endpoints
const AVAILABILITY_URL = `${API_BASE_URL}/api/v1/availability/my-availability/`
const WEEKLY_AVAILABILITY_URL = `${API_BASE_URL}/api/v1/availability/weekly/`
const EXCEPTIONS_URL = `${API_BASE_URL}/api/v1/availability/exceptions/`

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().auth.accessToken
  
  if (!token) {
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `access_token=${token}`,
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = 
        errorData.non_field_errors?.[0] || 
        errorData.detail || 
        errorData.message || 
        'Geçersiz veri gönderildi'
      throw new Error(errorMessage)
    }
    throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
  }

  return response
}

// ============ ORIGINAL AVAILABILITY API FUNCTIONS ============

// Get user's availability from backend
export const getMyAvailability = async (): Promise<AvailabilitySlot[]> => {
  console.log(`API: Fetching availability from ${AVAILABILITY_URL}`)

  const token = useAuthStore.getState().auth.accessToken

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    const response = await fetch(AVAILABILITY_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Using Cookie header as specified by the user
      credentials: 'include',
    })

    // Set cookie manually using the format specified by user
    document.cookie = `access_token=${token}; path=/`

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }

    const data: AvailabilitySlot[] = await response.json()
    console.log('Successfully fetched availability:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch availability:', error)
    throw error
  }
}

// Save availability to backend
export const saveMyAvailability = async (availability: AvailabilitySlot[]): Promise<void> => {
  console.log(`API: Saving availability to ${AVAILABILITY_URL}`)

  const token = useAuthStore.getState().auth.accessToken

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // Set cookie manually using the format specified by user
    document.cookie = `access_token=${token}; path=/`

    const response = await fetch(AVAILABILITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ availability }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
      
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = 
          errorData.non_field_errors?.[0] || 
          errorData.detail || 
          errorData.message || 
          'Geçersiz veri gönderildi'
        throw new Error(errorMessage)
      }
      
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
    }

    console.log('Successfully saved availability')
  } catch (error) {
    console.error('Failed to save availability:', error)
    throw error
  }
}

// Alternative implementation using fetch with proper Cookie header in request
export const getMyAvailabilityWithCookieHeader = async (): Promise<AvailabilitySlot[]> => {
  console.log(`API: Fetching availability from ${AVAILABILITY_URL}`)

  const token = useAuthStore.getState().auth.accessToken

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    const response = await fetch(AVAILABILITY_URL, {
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

    const data: AvailabilitySlot[] = await response.json()
    console.log('Successfully fetched availability:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch availability:', error)
    throw error
  }
}

// Alternative save implementation with Cookie header - handles both create and update
export const saveMyAvailabilityWithCookieHeader = async (availability: AvailabilitySlot[], originalAvailability: AvailabilitySlot[] = []): Promise<void> => {
  console.log(`API: Saving availability - processing ${availability.length} slots`)

  const token = useAuthStore.getState().auth.accessToken

  if (!token) {
    console.error('Authentication Error: No access token found.')
    throw new Error('Giriş yapılmamış. Lütfen giriş yapın.')
  }

  try {
    // First, find slots that were removed (exist in original but not in current)
    const currentRealIds = new Set(availability.filter(slot => slot.id > 0).map(slot => slot.id));
    const removedSlots = originalAvailability.filter(slot => slot.id > 0 && !currentRealIds.has(slot.id));
    
    // Delete removed slots from backend
    for (const removedSlot of removedSlots) {
      const deleteUrl = `${API_BASE_URL}/api/v1/availability/weekly/${removedSlot.id}/`;
      console.log(`API: Deleting removed availability slot ${removedSlot.id} from ${deleteUrl}`);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn(`Failed to delete slot ${removedSlot.id}: ${response.status}`);
        // Continue with other operations even if delete fails
      }
    }

    // Process each availability slot individually
    for (const slot of availability) {
      // Check if this is a real backend ID (positive) or a temporary ID (negative)
      const isRealId = slot.id && slot.id > 0; // Real backend IDs are positive, temporary ones are negative
      
      console.log(`Processing slot: ID=${slot.id}, isRealId=${isRealId}, day=${slot.day_of_week}, ${slot.start_time}-${slot.end_time}`)
      
      if (isRealId) {
        // Update existing availability slot using PUT
        const updateUrl = `${API_BASE_URL}/api/v1/availability/weekly/${slot.id}/`
        console.log(`API: Updating availability slot ${slot.id} to ${updateUrl}`)
        
        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `access_token=${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time
          }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
          }
          
          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = 
              errorData.non_field_errors?.[0] || 
              errorData.detail || 
              errorData.message || 
              'Geçersiz veri gönderildi'
            throw new Error(errorMessage)
          }
          
          throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
        }
      } else {
        // Create new availability slot using POST
        const createUrl = `${API_BASE_URL}/api/v1/availability/weekly/`
        console.log(`API: Creating new availability slot to ${createUrl}`)
        
        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `access_token=${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            service: 1, // Default service id
            is_active: true,
            slot_minutes: 30, // Default slot minutes
            capacity: 1 // Default capacity
          }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
          }
          
          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = 
              errorData.non_field_errors?.[0] || 
              errorData.detail || 
              errorData.message || 
              'Geçersiz veri gönderildi'
            throw new Error(errorMessage)
          }
          
          throw new Error(`API Hatası: ${response.status} - ${response.statusText}`)
        }
      }
    }

    console.log('Successfully saved all availability slots')
  } catch (error) {
    console.error('Failed to save availability:', error)
    throw error
  }
}

// ============ WEEKLY AVAILABILITY API FUNCTIONS ============

// GET /appointments/availability/weekly/
export const getWeeklyAvailabilities = async (): Promise<WeeklyAvailability[]> => {
  console.log(`API: Fetching weekly availabilities from ${WEEKLY_AVAILABILITY_URL}`)
  
  try {
    const response = await makeAuthenticatedRequest(WEEKLY_AVAILABILITY_URL)
    const data: WeeklyAvailability[] = await response.json()
    console.log('Successfully fetched weekly availabilities:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch weekly availabilities:', error)
    throw error
  }
}

// POST /appointments/availability/weekly/
export const createWeeklyAvailability = async (availability: Omit<WeeklyAvailability, 'id'>): Promise<WeeklyAvailability> => {
  console.log(`API: Creating weekly availability to ${WEEKLY_AVAILABILITY_URL}`)
  
  try {
    const response = await makeAuthenticatedRequest(WEEKLY_AVAILABILITY_URL, {
      method: 'POST',
      body: JSON.stringify(availability),
    })
    const data: WeeklyAvailability = await response.json()
    console.log('Successfully created weekly availability:', data)
    return data
  } catch (error) {
    console.error('Failed to create weekly availability:', error)
    throw error
  }
}

// GET /appointments/availability/weekly/{id}/
export const getWeeklyAvailabilityById = async (id: number): Promise<WeeklyAvailability> => {
  console.log(`API: Fetching weekly availability ${id} from ${WEEKLY_AVAILABILITY_URL}${id}/`)
  
  try {
    const response = await makeAuthenticatedRequest(`${WEEKLY_AVAILABILITY_URL}${id}/`)
    const data: WeeklyAvailability = await response.json()
    console.log('Successfully fetched weekly availability:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch weekly availability:', error)
    throw error
  }
}

// PUT /appointments/availability/weekly/{id}/
export const updateWeeklyAvailability = async (id: number, availability: Partial<WeeklyAvailability>): Promise<WeeklyAvailability> => {
  console.log(`API: Updating weekly availability ${id} to ${WEEKLY_AVAILABILITY_URL}${id}/`)
  
  try {
    const response = await makeAuthenticatedRequest(`${WEEKLY_AVAILABILITY_URL}${id}/`, {
      method: 'PUT',
      body: JSON.stringify(availability),
    })
    const data: WeeklyAvailability = await response.json()
    console.log('Successfully updated weekly availability:', data)
    return data
  } catch (error) {
    console.error('Failed to update weekly availability:', error)
    throw error
  }
}

// DELETE /appointments/availability/weekly/{id}/
export const deleteWeeklyAvailability = async (id: number): Promise<void> => {
  console.log(`API: Deleting weekly availability ${id} from ${WEEKLY_AVAILABILITY_URL}${id}/`)
  
  try {
    await makeAuthenticatedRequest(`${WEEKLY_AVAILABILITY_URL}${id}/`, {
      method: 'DELETE',
    })
    console.log('Successfully deleted weekly availability')
  } catch (error) {
    console.error('Failed to delete weekly availability:', error)
    throw error
  }
}

// POST /appointments/availability/weekly/bulk/
export const createBulkWeeklyAvailability = async (bulkData: BulkWeeklyAvailability): Promise<WeeklyAvailability[]> => {
  console.log(`API: Creating bulk weekly availability to ${WEEKLY_AVAILABILITY_URL}bulk/`)
  
  try {
    const response = await makeAuthenticatedRequest(`${WEEKLY_AVAILABILITY_URL}bulk/`, {
      method: 'POST',
      body: JSON.stringify(bulkData),
    })
    const data: WeeklyAvailability[] = await response.json()
    console.log('Successfully created bulk weekly availability:', data)
    return data
  } catch (error) {
    console.error('Failed to create bulk weekly availability:', error)
    throw error
  }
}

// ============ AVAILABILITY EXCEPTIONS API FUNCTIONS ============

// GET /appointments/availability/exceptions/
export const getAvailabilityExceptions = async (): Promise<AvailabilityException[]> => {
  console.log(`API: Fetching availability exceptions from ${EXCEPTIONS_URL}`)
  
  try {
    const response = await makeAuthenticatedRequest(EXCEPTIONS_URL)
    const data: AvailabilityException[] = await response.json()
    console.log('Successfully fetched availability exceptions:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch availability exceptions:', error)
    throw error
  }
}

// POST /appointments/availability/exceptions/
export const createAvailabilityException = async (exception: Omit<AvailabilityException, 'id'>): Promise<AvailabilityException> => {
  console.log(`API: Creating availability exception to ${EXCEPTIONS_URL}`)
  console.log('Exception payload:', exception)
  
  try {
    const response = await makeAuthenticatedRequest(EXCEPTIONS_URL, {
      method: 'POST',
      body: JSON.stringify(exception),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP ${response.status}: ${errorText}`)
      throw new Error(`Failed to create exception: ${response.status} - ${errorText}`)
    }
    
    const data: AvailabilityException = await response.json()
    console.log('Successfully created availability exception:', data)
    return data
  } catch (error) {
    console.error('Failed to create availability exception:', error)
    throw error
  }
}

// GET /appointments/availability/exceptions/{id}/
export const getAvailabilityExceptionById = async (id: number): Promise<AvailabilityException> => {
  console.log(`API: Fetching availability exception ${id} from ${EXCEPTIONS_URL}${id}/`)
  
  try {
    const response = await makeAuthenticatedRequest(`${EXCEPTIONS_URL}${id}/`)
    const data: AvailabilityException = await response.json()
    console.log('Successfully fetched availability exception:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch availability exception:', error)
    throw error
  }
}

// PUT /appointments/availability/exceptions/{id}/
export const updateAvailabilityException = async (id: number, exception: Partial<AvailabilityException>): Promise<AvailabilityException> => {
  console.log(`API: Updating availability exception ${id} to ${EXCEPTIONS_URL}${id}/`)
  
  try {
    const response = await makeAuthenticatedRequest(`${EXCEPTIONS_URL}${id}/`, {
      method: 'PUT',
      body: JSON.stringify(exception),
    })
    const data: AvailabilityException = await response.json()
    console.log('Successfully updated availability exception:', data)
    return data
  } catch (error) {
    console.error('Failed to update availability exception:', error)
    throw error
  }
}

// DELETE /appointments/availability/exceptions/{id}/
export const deleteAvailabilityException = async (id: number): Promise<void> => {
  console.log(`API: Deleting availability exception ${id} from ${EXCEPTIONS_URL}${id}/`)
  
  try {
    await makeAuthenticatedRequest(`${EXCEPTIONS_URL}${id}/`, {
      method: 'DELETE',
    })
    console.log('Successfully deleted availability exception')
  } catch (error) {
    console.error('Failed to delete availability exception:', error)
    throw error
  }
}

// POST /appointments/availability/exceptions/bulk/
export const createBulkAvailabilityExceptions = async (exceptions: Omit<AvailabilityException, 'id'>[]): Promise<AvailabilityException[]> => {
  console.log(`API: Creating bulk availability exceptions to ${EXCEPTIONS_URL}bulk/`)
  
  try {
    // TODO: This endpoint is not yet completed on the backend
    // When implemented, uncomment the following code:
    
    // const response = await makeAuthenticatedRequest(`${EXCEPTIONS_URL}bulk/`, {
    //   method: 'POST',
    //   body: JSON.stringify({ exceptions }),
    // })
    // const data: AvailabilityException[] = await response.json()
    // console.log('Successfully created bulk availability exceptions:', data)
    // return data
    
    throw new Error('Bulk exceptions endpoint is not yet implemented on the backend')
  } catch (error) {
    console.error('Failed to create bulk availability exceptions:', error)
    throw error
  }
}

// GET /api/v1/availability/expert/{my_id}/calendar/?start_date={start_date}&end_date={end_date}
// This endpoint returns actual availability for a specific date range including exceptions
export const getExpertCalendarAvailability = async (expertId: number, startDate: string, endDate: string): Promise<any> => {
  const url = `${API_BASE_URL}/api/v1/availability/expert/${expertId}/calendar/?start_date=${startDate}&end_date=${endDate}`
  console.log(`API: Fetching expert calendar availability from ${url}`)
  
  try {
    const response = await makeAuthenticatedRequest(url)
    
    if (!response.ok) {
      console.error(`API returned ${response.status}: ${response.statusText}`)
      // If the endpoint doesn't exist, return empty calendar data
      if (response.status === 404 || response.status === 500) {
        console.log('Calendar endpoint not available, returning empty data')
        return { calendar: [] }
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Successfully fetched expert calendar availability:', data)
    return data
  } catch (error) {
    console.error('Failed to fetch expert calendar availability:', error)
    // Return empty calendar data instead of throwing
    console.log('Returning empty calendar data due to error')
    return { calendar: [] }
  }
}

// Get current user's ID and fetch calendar availability
export const getMyWeekCalendarAvailability = async (startDate: string, endDate: string, expertId?: number | null): Promise<any> => {
  // If expertId is provided, use it; otherwise fall back to user ID
  if (expertId) {
    console.log(`Using provided expert ID: ${expertId}`)
    return getExpertCalendarAvailability(expertId, startDate, endDate)
  }
  
  const { auth } = useAuthStore.getState()
  
  if (!auth.user?.id) {
    throw new Error('User ID not found')
  }
  
  console.log(`Using fallback user ID: ${auth.user.id}`)
  return getExpertCalendarAvailability(auth.user.id, startDate, endDate)
}