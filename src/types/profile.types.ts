// --------------------
// Gender
// --------------------
export type Gender = 'male' | 'female' | 'other' | 'pn2s';

// --------------------
// Addiction Type
// --------------------
export interface AddictionType {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
}

export const ADDICTION_TYPES: AddictionType[] = [
  { id: 1, name: "Alkol Bağımlılığı", slug: "alkol-bagimliligi", is_active: true },
  { id: 2, name: "Madde Bağımlılığı", slug: "madde-bagimliligi", is_active: true },
  { id: 3, name: "Dijital Bağımlılık", slug: "dijital-bagimlilik", is_active: true },
  { id: 4, name: "Kumar Bağımlılığı", slug: "kumar-bagimliligi", is_active: true },
  { id: 5, name: "Yeme Bozuklukları", slug: "yeme-bozukluklari", is_active: true },
];

// --------------------
// Helpers (read)
// --------------------
export const getAddictionNamesByIds = (ids: number[]): string[] =>
  ADDICTION_TYPES
    .filter(type => ids.includes(type.id))
    .map(type => type.name);

// --------------------
// User (Response)
// --------------------
export interface User {
  id: number | string;
  email: string;
  username?: string | null;
  profile_photo?: string | null;

  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: Gender | null;
  phone_number: string | null;
  country: string;

  national_id?: string | null;
  id_number?: string | null;
  timezone: string;

  is_deleted: boolean;

  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;

  date_joined?: string;
  last_login?: string | null;
}

// --------------------
// Emergency Contact (Response)
// --------------------
export interface EmergencyContact {
  id: number;
  client_profile: number;
  name: string;
  phone_number: string;
  relationship?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// --------------------
// Documents
// --------------------
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

// --------------------
// Profile Response
// --------------------
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
