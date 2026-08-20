// src/features/client-forms/types.ts
//
// Backend kaynağı: backend/forms/serializers.py
// (FormResponseExpertSummarySerializer / FormResponseExpertDetailSerializer)
// Expert görünümü client görünümünden farklı olarak skor/risk/yorum/öneri
// alanlarını da içerir - backend bu ayrımı bilinçli yapıyor (bkz. kök
// CLAUDE.md, "danışan kendi skorunu göremez" kuralı).

export interface MyClient {
  id: number // ClientProfile.id
  user_id: number // User.id - forms endpoint'lerine bu geçilir
  first_name: string
  last_name: string
  email: string
}

// Danışan x form matrisinin sütun başlıkları için - GET /api/v1/forms/'un
// döndürdüğü ama burada kullanılmayan diğer alanlar (description, scoring_type
// vb.) bilinçli olarak dışarıda bırakıldı.
export interface FormSummary {
  id: number
  title: string
}

export type QuestionType =
  | 'text'
  | 'yes_no'
  | 'scale'
  | 'single_choice'
  | 'multiple_choice'
  | 'number'
  | 'date'
  | 'textarea'

export interface FormResponseSummary {
  id: number
  form: { id: number; title: string; stage: number }
  submitted_at: string
  total_score: number
  risk_level: string
  percentage_score: number | null
}

export interface ExpertAnsweredQuestion {
  id: number
  question_text: string
  question_type: QuestionType
  order: number
  is_required: boolean
  score_weight: number
  options: {
    id: number
    option_text: string
    order: number
    score_value: number
    is_correct: boolean
  }[]
  min_scale_value?: number
  max_scale_value?: number
  scale_labels?: Record<string, string> | null
}

export interface ExpertAnswerDetail {
  question_id: number
  question_text: string
  question_type: QuestionType
  answer_score: number
  text_answer?: string
  numeric_answer?: number
  selected_options?: {
    id: number
    text: string
    order: number
    score_value: number
    is_correct: boolean
  }[]
}

export interface FormResponseDetail {
  id: number
  form: { id: number; title: string; stage: number; scoring_type: string }
  submitted_at: string
  total_score: number
  risk_level: string
  percentage_score: number | null
  interpretation: string
  recommendations: string
  questions: ExpertAnsweredQuestion[]
  answers: ExpertAnswerDetail[]
  user_info: {
    id: number
    email: string
    first_name: string
    last_name: string
    full_name: string
  }
}
