// Backend kaynağı: backend/messaging/{models,serializers,views,services}.py
//
// Klasik chat DEĞİL - eşleşen uzman-danışan çifti başına tek bir not hattı.
// Client tarafında her zaman tek bir karşı taraf (kendi uzmanı) olduğu için
// bir "konuşma listesi" kavramı yok, tek bir MessageItem[] akışı yeterli.
export interface MessageItem {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  is_mine: boolean;
  is_read: boolean;
  created_at: string;
}

// Danışanın seans-bazlı not hakkı - iki seans arası toplam CLIENT_MESSAGE_LIMIT
// kadar, her seans (randevu) tamamlandığında yeniden dolar. Uzmanın hiçbir
// sınırı yok - bu obje her zaman "danışanın" hakkını temsil eder.
export interface ClientQuota {
  remaining: number;
  limit: number;
}

export interface MessagesResponse {
  messages: MessageItem[];
  client_quota: ClientQuota;
}

// Danışan tarafında karakter limiti backend'de 200 - uzman 1000'e kadar
// yazabiliyor (bkz. backend/messaging/services.py -> CLIENT_MESSAGE_MAX_LENGTH).
export const CLIENT_MESSAGE_MAX_LENGTH = 200;
