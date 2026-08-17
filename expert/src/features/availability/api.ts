// src/availability/api.ts
import api from '@/lib/api'
import { toast } from 'sonner'
import {
  WeeklyAvailability,
  WeeklyAvailabilityPayload,
  WeeklyAvailabilityBulkResponse,
  AvailabilityException,
  AvailabilityDeletePayload,
  AvailabilityClearResponse,
  AvailabilitySaveResponse,
  AvailabilityExceptionPayload,
  MyAvailabilityCalendarResponse,
} from './types'

const PREFIX = '/api/v1/availability'
const MY_AVAILABILITY_URL = `${PREFIX}/`
const WEEKLY_URL = `${PREFIX}/weekly/`
const EXCEPTIONS_URL = `${PREFIX}/exceptions/`

// ========================================================
// Genel hata yöneticisi
// ========================================================
const handleApiError = (error: any, message = 'İşlem başarısız oldu') => {
  console.error('API Error:', error)
  const detail =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    message
  toast.error(detail)
  throw new Error(detail)
}

// ========================================================
// 1️⃣ HAFTALIK MÜSAİTLİK (WEEKLY AVAILABILITY)
// ========================================================

// GET /api/v1/availability/weekly/  → WeeklyAvailability[]
export const getMyWeeklyAvailability = async (): Promise<WeeklyAvailability[]> => {
  try {
    const res = await api.get(WEEKLY_URL)
    return res.data
  } catch (err) {
    handleApiError(err, 'Haftalık müsaitlikler alınamadı')
    return []
  }
}

// PUT /api/v1/availability/weekly/  → WeeklyAvailabilityBulkResponse
export const saveMyWeeklyAvailability = async (
  availabilities: WeeklyAvailabilityPayload[]
): Promise<WeeklyAvailabilityBulkResponse> => {
  try {
    const payload = { availabilities }
    const res = await api.put(WEEKLY_URL, payload)
    toast.success('Müsaitlikler başarıyla kaydedildi')
    return res.data
  } catch (err) {
    handleApiError(err, 'Müsaitlikler kaydedilemedi')
    throw err
  }
}

// DELETE /api/v1/availability/weekly/
export const deleteMyWeeklyAvailability = async (
  payload: {
    availabilities: {
      day_of_week: number
      start_time: string
      end_time: string
      service: number
    }[]
  }
): Promise<void> => {
  try {
    console.log("Deleting with payload:", payload);
    await api.delete(WEEKLY_URL, {
      data: payload,
      withCredentials: true,
    })
    toast.success('Seçilen haftalık müsaitlikler silindi')
  } catch (err) {
    handleApiError(err, 'Müsaitlikler silinemedi')
  }
}


// ========================================================
// 2️⃣ İSTİSNALAR (EXCEPTIONS)
// ========================================================

// GET /api/v1/availability/exceptions/ → AvailabilityException[]
export const getAvailabilityExceptions = async (): Promise<AvailabilityException[]> => {
  try {
    const res = await api.get(EXCEPTIONS_URL, { withCredentials: true })
    return res.data
  } catch (err) {
    handleApiError(err, 'İstisnalar alınamadı')
    return []
  }
}

/**
 * PUT /api/v1/availability/exceptions/
 * Belirtilen istisnaları (add/update/cancel) kaydeder/günceller.
 * Yeni İstek Payload'u: { exceptions: AvailabilityExceptionPayload[] }
 * Yanıt: AvailabilitySaveResponse
 */
export const updateAvailabilityExceptions = async (
  exceptions: AvailabilityExceptionPayload[]
): Promise<AvailabilitySaveResponse> => {
  try {
    // İstek formatına uygun payload oluşturma: { "exceptions": [...] }
    const payload = { exceptions };

    const res = await api.put(EXCEPTIONS_URL, payload);
    
    // Yanıt tipini yeni formata göre güncelledik (AvailabilitySaveResponse)
    const responseData: AvailabilitySaveResponse = res.data; 

    // Başarı mesajını yanıt içeriğine göre özelleştirebilirsiniz (isteğe bağlı)
    const addedCount = responseData.added?.length || 0;
    toast.success(`İstisnalar başarıyla kaydedildi (${addedCount} yeni kayıt).`);

    return responseData;
  } catch (err) {
    handleApiError(err, 'İstisnalar kaydedilemedi');
    throw err; // Hata durumunda çağırıcıya iletilmeli
  }
};

/**
 * DELETE /api/v1/availability/exceptions/
 * Belirtilen istisnaları (date, start_time, end_time eşleşmesine göre) siler.
 * Yeni İstek Payload'u: { exceptions: AvailabilityDeletePayload[] }
 * Yanıt: AvailabilityClearResponse
 * NOT: Fonksiyon adı 'clear' yerine 'delete' veya 'remove' olarak da düşünülebilir,
 * ancak mevcut adı koruyup işlevini spesifik silme olarak değiştirdik.
 */
export const deleteAvailabilityExceptions = async (
  exceptionsToDelete: AvailabilityDeletePayload[]
): Promise<AvailabilityClearResponse> => {
  try {
    // İstek formatına uygun payload oluşturma: { "exceptions": [...] }
    const payload = { exceptions: exceptionsToDelete };
    
    // DELETE isteği atılırken body'nin gönderilmesi gerekebilir.
    // Axios'ta DELETE isteği için 'data' alanı veya 'config' objesi içinde
    // 'data' property'si kullanılır. 'api.delete(url, config)' yapısını kullanıyoruz.
    const res = await api.delete(EXCEPTIONS_URL, { 
      data: payload // DELETE isteğinde body göndermek için data anahtarı kullanılır.
    });
    
    // Yanıt tipini yeni formata göre güncelledik (AvailabilityClearResponse)
    const responseData: AvailabilityClearResponse = res.data;

    // Başarı mesajını silinen sayısına göre özelleştirdik
    const deletedCount = responseData.deleted_count || 0;
    toast.success(`${deletedCount} adet istisna başarıyla silindi.`);

    return responseData;
  } catch (err) {
    handleApiError(err, 'İstisnalar silinemedi');
    throw err; // Hata durumunda çağırıcıya iletilmeli
  }
};

// ========================================================
// 3️⃣ BİRLEŞİK TAKVİM (KENDİM) 
// GET /api/v1/availability/?start_date=...&end_date=...
// ========================================================
export const getMyCombinedCalendar = async (
  startDate: string,
  endDate: string
): Promise<MyAvailabilityCalendarResponse> => {
  try {
    const res = await api.get(MY_AVAILABILITY_URL, {
      params: { start_date: startDate, end_date: endDate }
    })
    return res.data
  } catch (err) {
    handleApiError(err, 'Birleşik takvim alınamadı')
    return { expert_id: 0, start_date: startDate, end_date: endDate, calendar: [] }
  }
}
