// Gender Choices
export type Gender = 'male' | 'female' | 'other' | 'pn2s';
export const ADDICTION_TYPES: AddictionType[] = [
  { id: 1, name: "Alkol Bağımlılığı", slug: "alkol-bagimliligi", is_active: true },
  { id: 2, name: "Madde Bağımlılığı", slug: "madde-bagimliligi", is_active: true },
  { id: 3, name: "Dijital Bağımlılık", slug: "dijital-bagimlilik", is_active: true },
  { id: 4, name: "Kumar Bağımlılığı", slug: "kumar-bagimliligi", is_active: true },
  { id: 5, name: "Yeme Bozuklukları", slug: "yeme-bozukluklari", is_active: true },
];

export const getAddictionNamesByIds = (ids: number[]): string[] => {
  return ADDICTION_TYPES.filter(type => ids.includes(type.id)).map(type => type.name);
};

// Base User Interface (Django AbstractUser + custom fields)
export interface User {
  id: number | string;
  email: string;                 // read-only
  username?: string | null;
  profile_photo?: string | null;

  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: Gender | null;
  phone_number: string | null;
  country: string;

  national_id?: string | null;   // read-only
  id_number?: string | null;     // TC – read-only
  timezone: string;

  is_deleted: boolean;

  // AbstractUser flags (genelde admin için)
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;

  date_joined?: string;
  last_login?: string | null;
}


// Addiction Type
export interface AddictionType {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
}

// Client Profile
export interface ClientProfile {
  id: number;
  user: number; // User ID
  expert?: number | null; // ExpertProfile ID
  substances_used: AddictionType[];
  support_goal?: string | null;
  received_service_before: boolean;
  onboarding_complete: boolean;
  is_active_in_treatment: boolean;
  emergency_contacts?: EmergencyContact[];
}

// Emergency Contact
export interface EmergencyContact {
  id: number;
  client_profile: number; // ClientProfile ID
  name: string;
  phone_number: string;
  relationship?: string | null;
  is_primary: boolean;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export type DocumentType = 'profile_photo' | 'consent_form' | 'cv' | 'degree' | 'other';

export interface UserDocument {
  uid: string;
  type: DocumentType;
  filename: string;
  access_url: string;
  updated_at: string;
  verified: boolean;
  verified_at: string | null;
}

export interface UserData {
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: Gender | null; // Daha önce tanımladığın Gender tipini kullanır
  phone_number: string | null;
  country: string;
}

export interface ProfileResponse {
  id: number;

  user: User;

  support_goal: string | null;
  received_service_before: boolean;
  onboarding_complete: boolean;
  is_active_in_treatment: boolean;

  substances_used: AddictionType[];
  emergency_contacts?: EmergencyContact[];

  expert?: {
    id: number;
    full_name: string;
    title: string | null;
  } | null;

  documents: UserDocument[];
}

// update modelleri

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: Gender | null;
  phone_number?: string | null;
  country?: string;
}

export interface EmergencyContactPayload {
  name: string;
  phone_number: string;
  relationship?: string | null;
  is_primary?: boolean;
}

export interface ProfileUpdatePayload {
  support_goal?: string | null;
  received_service_before?: boolean;
  onboarding_complete?: boolean;
  is_active_in_treatment?: boolean;
  emergency_contacts?: EmergencyContactPayload[];
  substances_used?: number[]; // AddictionType ID listesi

  user_data?: UserUpdateData;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  first_name: string;
  last_name: string;
  password_confirmation: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}