// src/features/profile/api.ts
import api from '@/lib/api'
import { toast } from 'sonner'
import {
  ExpertProfile,
  ExpertProfileUpdatePayload,
  ClientProfile,
  ClientProfileUpdatePayload,
  ProfileApiError,
  DocumentUploadResponse,
} from './types'

const PROFILE_URL = '/api/v1/accounts/profile/'
const DOCUMENT_UPLOAD_URL = '/api/v1/accounts/documents/upload/'
const DOCUMENT_RETRIEVE_URL = '/api/v1/accounts/documents/retrieve/'

// ========================================================
// Genel hata yöneticisi
// ========================================================
const handleApiError = (error: any, message = 'İşlem başarısız oldu', showToast = true) => {
  console.error('Profile API Error:', error)

  const errorData = error.response?.data as ProfileApiError

  let detail = message
  if (errorData?.detail) {
    detail = errorData.detail
  } else if (errorData?.message) {
    detail = errorData.message
  } else if (errorData?.errors) {
    // Form validation errors
    const errorMessages = Object.entries(errorData.errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n')
    detail = errorMessages
  } else if (error.message) {
    detail = error.message
  }

  if (showToast) {
    toast.error(detail)
  }
  throw new Error(detail)
}

// ========================================================
// 1️⃣ GET PROFILE
// ========================================================
// GET /api/v1/accounts/profile/ → ExpertProfile | ClientProfile | null
export const getProfile = async (): Promise<ExpertProfile | ClientProfile | null> => {
  try {
    const res = await api.get(PROFILE_URL)
    return res.data
  } catch (err: any) {
    // 404 hatası durumunda (endpoint henüz implemente edilmemişse) toast gösterme
    if (err.response?.status === 404) {
      console.warn('Profile endpoint not found (404). Using auth data instead.')
      return null
    }
    handleApiError(err, 'Profil bilgileri alınamadı')
    throw err
  }
}

// ========================================================
// 2️⃣ UPDATE PROFILE
// ========================================================
// PATCH /api/v1/accounts/profile/ → ExpertProfile | ClientProfile
export const updateProfile = async (
  payload: ExpertProfileUpdatePayload | ClientProfileUpdatePayload
): Promise<ExpertProfile | ClientProfile> => {
  try {
    const res = await api.patch(PROFILE_URL, payload)
    toast.success('Profil başarıyla güncellendi')
    return res.data
  } catch (err: any) {
    // 404 hatası durumunda özel mesaj göster
    if (err.response?.status === 404) {
      toast.error('Profil güncelleme endpoint\'i henüz backend\'de implemente edilmemiş. Lütfen backend\'i kontrol edin.')
      throw new Error('Profile update endpoint not implemented')
    }
    handleApiError(err, 'Profil güncellenemedi')
    throw err
  }
}

// ========================================================
// 3️⃣ UPLOAD DOCUMENT
// ========================================================
// POST /api/v1/accounts/documents/upload/ → DocumentUploadResponse
export const uploadDocument = async (
  file: File,
  type: string
): Promise<DocumentUploadResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await api.post(DOCUMENT_UPLOAD_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    toast.success('Dosya başarıyla yüklendi')
    return res.data
  } catch (err: any) {
    handleApiError(err, 'Dosya yüklenemedi')
    throw err
  }
}

// ========================================================
// 4️⃣ GET DOCUMENT URL
// ========================================================
// GET /api/v1/accounts/documents/retrieve/?uid=...&type=...&filename=...
// Returns the URL to retrieve the document
export const getDocumentUrl = (uid: string, type: string, filename: string): string => {
  const params = new URLSearchParams({ uid, type, filename })
  // Return full URL with base URL from api instance
  const baseURL = api.defaults.baseURL || ''
  return `${baseURL}${DOCUMENT_RETRIEVE_URL}?${params.toString()}`
}
