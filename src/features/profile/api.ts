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
const DOCUMENT_URL = '/api/v1/accounts/documents/'

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
// GET PROFILE
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
// UPDATE PROFILE
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
// UPLOAD DOCUMENT
// ========================================================
// POST /api/v1/accounts/documents/upload/ → DocumentUploadResponse
export const uploadDocument = async (
  file: File,
  type: string
): Promise<DocumentUploadResponse> => {
  try {
    const resPreSign = await api.post(`${DOCUMENT_URL}presign-upload/`, {"type": type})

    const uploadUrl = resPreSign.data.upload.url;
    const formData = new FormData()
    formData.append('file', file)
    const resUpload = await api.put(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (resUpload.status === 200) {
      const dbSavePayload = {
        "type": type,
        "file_key": resPreSign.data.file_key,
        "original_filename": file.name,
        "is_primary": false
      }
      const resDbSave = await api.post(DOCUMENT_URL, dbSavePayload)
      if (resDbSave.status === 201) {
        toast.success('Dosya başarıyla yüklendi')
        // burada gelen veriyi global state'e ekleyebilirsin eğer kullanıyorsan
        // (şimdilik kullanmıyoruz ama)
      } else if (resDbSave.status === 401) {
        toast.success('Lütfen tekrar giriş yapın.')
      }

    } else if (resUpload.status === 400) {
      console.log('File already exists.')
    } else {
      throw new Error('File upload failed with status ' + resUpload.status);
    }

    return resPreSign.data;
  } catch (err: any) {
    handleApiError(err, 'Dosya yüklenemedi')
    throw err
  }
}

// ========================================================
// DELETE DOCUMENT
// ========================================================
export const deleteDocument = async (uid: string): Promise<any> => {
  try {
    const DELETE_URL = `${DOCUMENT_URL}${uid}/`
    const res = await api.delete(DELETE_URL)
    return res.data
  } catch (err: any) {
    handleApiError(err, 'Dosya bulunamadı.')
    throw err
  }
}
