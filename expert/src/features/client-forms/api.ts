import api from '@/lib/api'
import type { MyClient, FormResponseSummary, FormResponseDetail } from './types'

/**
 * Uzmana atanmış danışanları getirir (GET /accounts/clients/).
 * Backend zaten sadece `expert=kendisi` olan ClientProfile'ları döner - ek bir
 * filtreleme gerekmez.
 */
export const getMyClients = async (): Promise<MyClient[]> => {
  try {
    const { data } = await api.get('/api/v1/accounts/clients/')
    return data
  } catch (error: any) {
    const message =
      error.response?.data?.detail || 'Danışan listesi alınamadı.'
    throw new Error(message)
  }
}

export const getClientFormResponses = async (
  clientUserId: number
): Promise<FormResponseSummary[]> => {
  try {
    const { data } = await api.get(
      `/api/v1/forms/clients/${clientUserId}/form-responses/`
    )
    return data
  } catch (error: any) {
    const message =
      error.response?.data?.detail || 'Danışanın form cevapları alınamadı.'
    throw new Error(message)
  }
}

export const getClientFormResponseDetail = async (
  clientUserId: number,
  responseId: number
): Promise<FormResponseDetail> => {
  try {
    const { data } = await api.get(
      `/api/v1/forms/clients/${clientUserId}/form-responses/${responseId}/`
    )
    return data
  } catch (error: any) {
    const message =
      error.response?.data?.detail || 'Form cevabı detayı alınamadı.'
    throw new Error(message)
  }
}
