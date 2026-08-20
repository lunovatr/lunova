import api from '@/lib/api'
import type { ClientQuota, ConversationSummary, MessageItem, MessagesResponse } from './types'

export const getConversations = async (): Promise<ConversationSummary[]> => {
  try {
    const { data } = await api.get('/api/v1/messaging/conversations/')
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Konuşma listesi alınamadı.'
    throw new Error(message)
  }
}

export const getMessages = async (clientUserId: number): Promise<MessagesResponse> => {
  try {
    const { data } = await api.get(
      `/api/v1/messaging/conversations/${clientUserId}/messages/`
    )
    return data
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Notlar alınamadı.'
    throw new Error(message)
  }
}

export const sendMessage = async (
  clientUserId: number,
  body: string
): Promise<MessageItem & { client_quota: ClientQuota }> => {
  const { data } = await api.post(
    `/api/v1/messaging/conversations/${clientUserId}/messages/`,
    { body }
  )
  return data
}
