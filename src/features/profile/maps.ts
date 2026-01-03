// ===============================
// profile.maps.ts
// Dummy data - gerçek veriler backend'den gelecek
// ===============================

// Üniversiteler
export const UNIVERSITIES: Record<number, string> = {
  1: 'İstanbul Üniversitesi',
  2: 'Ankara Üniversitesi',
  3: 'Ege Üniversitesi',
  4: 'Hacettepe Üniversitesi',
  5: 'Boğaziçi Üniversitesi',
  6: 'Ondokuz Mayıs Üniversitesi',
  // 7: 'İTÜ',
  // 8: 'Marmara Üniversitesi',
}

// Derece Seviyeleri
export const DEGREE_LEVELS: Record<number, string> = {
  1: 'Lisans',
  2: 'Yüksek Lisans',
  3: 'Doktora',
  4: 'Önlisans',
  // 5: 'Profesör',
}

// Bölümler/Majör
export const MAJORS: Record<number, string> = {
  1: 'Psikoloji',
  2: 'Psikiyatri',
  3: 'Sosyal Hizmetler',
  4: 'Rehberlik ve Psikolojik Danışmanlık',
  // 5: 'Çocuk ve Ergen Ruh Sağlığı',
  // 6: 'Nöropsikoloji',
}

// Hizmetler
export const SERVICES: Record<number, string> = {
  1: 'Bilişsel Terapi',
  2: 'Bireysel Danışmanlık',
  3: 'Çift Terapisi',
  4: 'Grup Terapisi',
  5: 'Grup Supervizyon',
  // 6: 'Online Terapi',
  // 7: 'Psikolojik Değerlendirme',
}

// Uzmanlık Alanları
export const SPECIALIZATIONS: Record<number, string> = {
  1: 'Bağımlılık Terapisi',
  2: 'Travma Odaklı Terapi',
  3: 'Çift ve Aile Terapisi',
  4: 'Cinsel Terapi',
  // 5: 'Kişilik Bozuklukları',
  // 6: 'Yeme Bozuklukları',
  // 7: 'Bağımlılık',
  // 8: 'İlişki Sorunları',
  // 9: 'Yas ve Kayıp',
  // 10: 'Stres Yönetimi',
}

// Yaklaşım Metodları
export const APPROACH_METHODS: Record<number, string> = {
  1: 'Bilişsel Davranışçı Terapi (BDT)',
  2: 'Psikanalitik Terapi',
  3: 'Hümanistik Terapi',
  4: 'EMDR',
  // 5: 'Şema Terapi',
  // 6: 'Kabul ve Kararlılık Terapisi (ACT)',
  // 7: 'Diyalektik Davranış Terapisi (DBT)',
  // 8: 'Gestalt Terapi',
}

// Hedef Gruplar
export const TARGET_GROUPS: Record<number, string> = {
  1: 'Ergen',
  2: 'Yetişkin',
  3: 'Aile',
  4: 'Çocuk',
  // 5: 'LGBTQ+ Bireyler',
  // 6: 'Kadınlar',
  // 7: 'Erkekler',
}

// Seans Tipleri
export const SESSION_TYPES: Record<number, string> = {
  1: 'Online',
  2: 'Yüz Yüze',
  3: 'Karma'
}

// Dil Kodları
export const LANGUAGES: Record<string, string> = {
  tr: 'Türkçe',
  en: 'İngilizce',
  de: 'Almanca',
  // fr: 'Fransızca',
  // ar: 'Arapça',
  // ru: 'Rusça',
  // es: 'İspanyolca',
}

// Müsaitlik Durumları
export const AVAILABILITY_STATUS: Record<string, { label: string; color: string }> = {
  available: { label: 'Müsait', color: 'green' },
  busy: { label: 'Meşgul', color: 'red' },
  limited: { label: 'Sınırlı Müsaitlik', color: 'orange' },
}

// Para Birimleri
export const CURRENCIES: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

// Cinsiyet
export const GENDERS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
  pn2s: 'Belirtmek İstemiyorum',
}

export const STATUS_CONFIG = {
  available: { label: "Müsait", variant: "default" as const }, 
  active: { label: "Aktif", variant: "outline" as const },
  busy: { label: "Meşgul", variant: "destructive" as const },
  away: { label: "Tatilde", variant: "secondary" as const },
}

// Helper fonksiyonlar
export const getUniversityName = (id: number | null): string => {
  if (!id) return '-'
  return UNIVERSITIES[id] || `Üniversite #${id}`
}

export const getDegreeLevelName = (id: number | null): string => {
  if (!id) return '-'
  return DEGREE_LEVELS[id] || `Derece #${id}`
}

export const getMajorName = (id: number | null): string => {
  if (!id) return '-'
  return MAJORS[id] || `Bölüm #${id}`
}

export const getServiceNames = (ids: number[]): string[] => {
  return ids.map(id => SERVICES[id] || `Hizmet #${id}`)
}

export const getSpecializationNames = (ids: number[]): string[] => {
  return ids.map(id => SPECIALIZATIONS[id] || `Uzmanlık #${id}`)
}

export const getApproachMethodNames = (ids: number[]): string[] => {
  return ids.map(id => APPROACH_METHODS[id] || `Yaklaşım #${id}`)
}

export const getTargetGroupNames = (ids: number[]): string[] => {
  return ids.map(id => TARGET_GROUPS[id] || `Grup #${id}`)
}

export const getSessionTypeNames = (ids: number[]): string[] => {
  return ids.map(id => SESSION_TYPES[id] || `Seans Tipi #${id}`)
}

export const getLanguageNames = (codes: string[]): string[] => {
  return codes.map(code => LANGUAGES[code] || code.toUpperCase())
}

export const getAvailabilityStatus = (status: string) => {
  return AVAILABILITY_STATUS[status] || { label: status, color: 'gray' }
}

export const getCurrencySymbol = (code: string): string => {
  return CURRENCIES[code] || code
}

export const getGenderName = (code: string): string => {
  return GENDERS[code] || code
}
