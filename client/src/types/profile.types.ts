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
export type DocumentTypes = 'profile_photo' | 'consent_form' | 'cv' | 'degree' | 'recovery_proof' | 'other';

// İkili yapı (Değer - Türkçe Etiket eşleşmesi)
export const DOCUMENT_TYPE_LABELS: Record<DocumentTypes, string> = {
  profile_photo: 'Profil Fotoğrafı',
  consent_form: 'Aydınlatma Metni / Onam Formu',
  cv: 'Özgeçmiş (CV)',
  degree: 'Diploma / Sertifika',
  // Faz 4 (Seans Tipi Kataloğu planı) - ex-user grup terapisi uygunluğu bu
  // belge onaylanınca otomatik işaretlenir (bkz. backend/claude.md).
  recovery_proof: 'İyileşme Durumu Belgesi',
  other: 'Diğer Belge',
};

// Backend kaynağı: accounts/models.py::DocumentStatus - 'verified' boolean'ı
// artık türetilmiş/salt-okunur bir alan, asıl kaynak `status`.
export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected';

export const DOCUMENT_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export interface Document {
  is_current: boolean; // BooleanField
  is_primary: boolean;
  uid: string;
  type: DocumentTypes;
  // Backend alanı `original_filename` (DocumentSerializer) - önceden burada
  // yanlışlıkla `filename` yazıyordu, bu yüzden UserDocumentsCard.tsx'te
  // dosya adı satırı hep `undefined` gösteriyordu (sessiz bir bug).
  original_filename: string;
  access_url: string;
  uploaded_at: string;
  updated_at: string;
  status: DocumentReviewStatus;
  verified: boolean;
  verified_at: string | null;
  file: string | null; // hata dönüşlerinde bu var. şimdilik devam.
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
  // Faz 2/6 (Frontend Yapılandırması planı) - RECOVERY_PROOF belgesi admin
  // tarafından onaylanınca otomatik 'in_recovery' olur (accounts/services.py::
  // apply_recovery_status_effect), ex-user-only grup seanslarına katılım
  // uygunluğunu belirler.
  recovery_status: "in_recovery" | "active_treatment" | "not_applicable" | null;

  substances_used: AddictionType[];
  emergency_contacts?: EmergencyContact[];

  expert?: {
    id: number;
    full_name: string;
    title: string | null;
  } | null;

  documents: Document[];
}
