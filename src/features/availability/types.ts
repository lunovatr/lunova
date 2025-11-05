// ===============================
// availability.types.ts
// ===============================

// Haftanın Günleri Enum
export enum Weekday {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6,
}

export const WeekdayLabels: Record<Weekday, string> = {
  [Weekday.MONDAY]: "Pazartesi",
  [Weekday.TUESDAY]: "Salı",
  [Weekday.WEDNESDAY]: "Çarşamba",
  [Weekday.THURSDAY]: "Perşembe",
  [Weekday.FRIDAY]: "Cuma",
  [Weekday.SATURDAY]: "Cumartesi",
  [Weekday.SUNDAY]: "Pazar",
};

// ===============================
// Weekly Availability (Haftalık Müsaitlik)
// ===============================
export interface WeeklyAvailability {
  id: number;
  expert: number;
  day_of_week: number; // 0–6 (Pazartesi–Pazar)
  day_display: string; // "Pazartesi"
  start_time: string; // "09:00:00"
  end_time: string; // "17:00:00"
  service: number | null;
  service_name?: string | null;
  is_active: boolean;
  slot_minutes: number;
  capacity: number;
  created_at: string;
  updated_at: string;
}

// Yeni veya toplu işlem için kullanılacak payload
export type WeeklyAvailabilityPayload = Omit<
  WeeklyAvailability,
  "id" | "expert" | "created_at" | "updated_at"
>;

// Bulk PUT (toplu güncelleme) yanıtı
export interface WeeklyAvailabilityBulkResponse {
  added: WeeklyAvailability[];
  deleted_count: number;
  current: WeeklyAvailability[];
}

// ===============================
// Availability Exception (İstisnalar)
// ===============================
export type AvailabilityExceptionType = "cancel" | "add";

export interface AvailabilityException {
  id: number;
  expert: number;
  date: string; // "YYYY-MM-DD"
  exception_type: AvailabilityExceptionType;
  start_time?: string | null;
  end_time?: string | null;
  service?: number | null;
  service_name?: string | null;
  note?: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface AvailabilityExceptionPayload {
  id?: number; // Güncelleme için gerekli
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:mm:ss"
  end_time: string; // "HH:mm:ss"
  exception_type: 'add' | 'cancel'; // 'add' yeni kayıt için gereklidir
  service?: number; // opsiyonel
  note?: string; // opsiyonel
}

// Başarılı bir şekilde eklenen/güncellenen/silinen istisna detayı
export interface AvailabilityExceptionDetail {
  id: number;
  expert: number;
  expert_name: string;
  date: string;
  exception_type: 'add' | 'cancel' | 'update' | string;
  start_time: string;
  end_time: string;
  service: number;
  service_name: string;
  note: string;
  created_at: string; // ISO 8601 string
}

// İstisna Kaydetme (PUT) yanıt formatı
export interface AvailabilitySaveResponse {
  added: AvailabilityExceptionDetail[]; // Yeni eklenen/güncellenen istisnalar
  deleted_count: number; // Silinen istisna sayısı (opsiyonel olarak PUT'ta da dönebilir)
  current: AvailabilityExceptionDetail[]; // Güncel istisnaların listesi
  // 'errors' alanı da gelebilir, ancak şimdilik başarılı senaryo tipleri baz alındı.
}

// İstisna Silme (DELETE) yanıt formatı
export interface AvailabilityClearResponse {
  deleted_count: number; // Silinen istisna sayısı
  deleted: AvailabilityExceptionDetail[]; // Silinen istisnaların listesi
  current: AvailabilityExceptionDetail[]; // Güncel istisnaların listesi
  errors: {
    request_data: Partial<AvailabilityDeletePayload>;
    message: string;
  }[]; // Başarısız olan silme istekleri
  message: string; // Genel durum mesajı
}

// DELETE payload'ı için sadeleştirilmiş tip
export interface AvailabilityDeletePayload {
  id: number;            // Zorunlu: Silinecek istisnanın ID’si
  date: string;          // Zorunlu: YYYY-MM-DD
  start_time: string;    // Zorunlu: HH:mm:ss
  end_time: string;      // Zorunlu: HH:mm:ss
}

export interface AvailabilityExceptionResponse {
  added: AvailabilityException[];
  deleted_count: number;
  current: AvailabilityException[];
}

// ===============================
// Appointment Slot (Oluşturulmuş Slotlar)
// ===============================
export interface AppointmentSlot {
  id: number;
  expert: number;
  service: number;
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  capacity: number;
  is_available: boolean;
}

// ===============================
// My Availability Calendar (Uzmanın birleşik takvimi)
// ===============================
export interface DailyAvailability {
  date: string; // "YYYY-MM-DD"
  weekly_availability: WeeklyAvailability[];
  exceptions: AvailabilityException[];
  is_available: boolean;
}

export interface MyAvailabilityCalendarResponse {
  expert_id: number;
  start_date: string;
  end_date: string;
  calendar: DailyAvailability[];
}

// ===============================
// Available Experts By Category
// ===============================
export interface AvailableExpert {
  expert_id: number;
  name: string;
  photo?: string | null;
  about: string;
  category: string;
}

// ===============================
// Yardımcı Türler
// ===============================
export interface ApiError {
  error: string;
}

export interface DeleteResponse {
  message: string;
}

export type ViewMode = 'calendar' | 'availability' | 'exceptions';