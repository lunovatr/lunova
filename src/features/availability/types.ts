// Shared types for availability and exceptions

export interface AvailabilitySlot {
  id: number;
  expert?: number;  // Expert ID from the API response
  expert_name?: string;  // Expert name from the API response
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface WeeklyAvailability {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  service: number;
  is_active: boolean;
  slot_minutes: number;
  capacity: number;
}

export interface AvailabilityException {
  id?: number;
  date: string;
  start_time: string;
  end_time: string;
  exception_type: 'add' | 'cancel';
}

export interface BulkWeeklyAvailability {
  availabilities: WeeklyAvailability[];
}

export interface CalendarAvailability {
  expert_id: number;
  start_date: string;
  end_date: string;
}

export const daysOfWeek = [
  { name: 'Pazartesi', day_of_week: 0 },
  { name: 'Salı', day_of_week: 1 },
  { name: 'Çarşamba', day_of_week: 2 },
  { name: 'Perşembe', day_of_week: 3 },
  { name: 'Cuma', day_of_week: 4 },
  { name: 'Cumartesi', day_of_week: 5 },
  { name: 'Pazar', day_of_week: 6 },
];

export const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

export type ViewMode = 'availability' | 'exceptions';