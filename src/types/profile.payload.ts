import { Gender } from './profile.types';

// --------------------
// User Update Payload
// --------------------
export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  email: string;
  birth_date?: string | null;
  gender?: Gender | null;
  phone_number?: string | null;
  country?: string;
  timezone?: string;
}

// --------------------
// Emergency Contact Payload
// --------------------
export interface EmergencyContactPayload {
  name: string;
  phone_number: string;
  relationship?: string | null;
  is_primary?: boolean;
}

// --------------------
// Profile Update Payload
// --------------------
export interface ProfileUpdatePayload {
  support_goal?: string | null;
  received_service_before?: boolean;
  onboarding_complete?: boolean;
  is_active_in_treatment?: boolean;

  substances_used?: number[];

  emergency_contacts?: EmergencyContactPayload[];
  user: UserUpdateData;
}
