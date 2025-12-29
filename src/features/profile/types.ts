// ===============================
// profile.types.ts
// ===============================

// Document Interface
export interface ProfileDocument {
  uid: string
  type: string
  filename: string
  access_url: string
  updated_at: string
  verified: boolean
  verified_at: string | null
}

// User Data Interface
export interface UserData {
  first_name: string
  last_name: string
  birth_date: string
  gender: string
  phone_number: string
  country: string
}

// Expert Profile Response (GET)
export interface ExpertProfile {
  about: string | null
  title: string | null
  experience_years: number | null
  license_number: string | null
  institution: string | null
  services: number[]
  specializations: number[]
  languages: string[]
  approach_methods: number[]
  target_groups: number[]
  session_types: number[]
  session_price: string
  currency: string
  appointment_duration: number
  free_first_session: boolean
  video_intro_url: string | null
  availability_status: string
  university: number | null
  degree_level: number | null
  major: number | null
  documents: ProfileDocument[]
  user_data: UserData
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
  languages?: string[]
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
