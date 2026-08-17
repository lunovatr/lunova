// ===============================
// profile.types.ts
// ===============================

// Document Interface
export interface ProfileDocument {
  uid: string;
  type: string;
  original_filename: string;
  is_primary: boolean;
  access_url: string;
  uploaded_at: string;
  updated_at: string;
  verified: boolean;
  verified_at: string | null;
}

// User Data Interface
export interface UserData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  country: string;
  birth_date: string;
  gender: string;
  phone_number: string;
  timezone: string;
  id_number: string;
}

// Expert Profile Response (GET)
export interface ExpertProfile {
  user: UserData;
  about: string | null;
  title: string | null;
  experience_years: number | null;
  license_number: string | null;
  institution: string | null;
  university: string | null;
  degree_level: string | null;
  major: string | null;
  services: string[];
  specializations: string[];
  languages: string[];
  approach_methods: string[];
  target_groups: string[];
  session_types: string[];
  session_price: string;
  currency: string;
  appointment_duration: number;
  free_first_session: boolean;
  video_intro_url: string | null;
  availability_status: string;
  approval_status: boolean;
  rating_average: number;
  rating_count: number;
  documents: ProfileDocument[];
  created_at: string;
  updated_at: string;
}

// Expert Profile Update Payload (PATCH)
export interface ExpertProfileUpdatePayload {
  about?: string
  title?: string
  experience_years?: number
  license_number?: string
  institution?: string
  services?: number[]
  specializations?: number[]
  languages?: (string | undefined)[]
  approach_methods?: number[]
  target_groups?: number[]
  session_types?: number[]
  session_price?: string
  currency?: string
  appointment_duration?: number
  free_first_session?: boolean
  video_intro_url?: string
  availability_status?: string
  university?: number
  degree_level?: number
  major?: number
  user_data?: Partial<UserData>
}

// Client Profile (for completeness)
export interface ClientProfile {
  user_data: UserData
  documents: ProfileDocument[]
}

// Client Profile Update Payload
export interface ClientProfileUpdatePayload {
  user_data?: Partial<UserData>
}

// Document Upload Response
export interface DocumentUploadResponse {
  uid: string
  type: string
  filename: string
  message?: string
}

// API Error
export interface ProfileApiError {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
}
