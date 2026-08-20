// src/features/messages/types.ts
//
// Backend kaynağı: backend/messaging/{models,serializers,views,services}.py
// Klasik chat DEĞİL - eşleşen uzman-danışan çifti başına tek bir not hattı.

export interface MessageItem {
  id: number
  sender_id: number
  sender_name: string
  body: string
  is_mine: boolean
  is_read: boolean
  created_at: string
}

// Danışanın seans-bazlı not hakkı - uzmanın hiçbir sınırı yok, bu obje her
// zaman "danışanın" hakkını temsil eder (bkz. backend/messaging/services.py).
export interface ClientQuota {
  remaining: number
  limit: number
}

export interface MessagesResponse {
  messages: MessageItem[]
  client_quota: ClientQuota
}

export interface ConversationSummary {
  client_id: number
  client_name: string
  last_message: {
    body: string
    created_at: string
    sender_id: number
  } | null
  unread_count: number
  client_quota: ClientQuota
}

// Uzman tarafında karakter limiti backend model üst sınırı (danışan tarafında
// 200 - bkz. client/src/types/messaging.types.ts, uzmanın kendi sınırı yok).
export const MESSAGE_MAX_LENGTH = 1000
