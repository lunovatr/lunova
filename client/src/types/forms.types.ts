// Shared Forms types for client frontend
//
// Backend kaynağı: backend/forms/{views,serializers}.py
// NOT: FormDetailView'ın döndürdüğü "questions[].options" şekli soru tipine
// göre değişir - single_choice/multiple_choice/yes_no'da gerçek seçenekler
// ({id, option_text, order}), diğer tiplerde (scale/number/date/textarea/text)
// sadece bir "tip tanımlayıcı" tek elemanlı dizi ({type: '...'}) döner. Bu
// yüzden render mantığı options içeriğine değil her zaman question_type'a göre
// dallanmalı.

export type QuestionType =
  | "text"
  | "yes_no"
  | "scale"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "date"
  | "textarea";

export interface FormListItem {
  id: number;
  version: number;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  instructions: string;
  disclaimer: string;
  stage: number;
  max_score: number | null;
  min_score: number | null;
  scoring_type: "none" | "binary" | "scale" | "weighted" | "custom";
  has_responded: boolean;
}

export interface QuestionOptionItem {
  id?: number;
  option_text?: string;
  order?: number;
  // scale/number/date/textarea/text tipi "tanımlayıcı" seçenek şekli:
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  format?: string;
  // yes_no fallback şekli (gerçek option kaydı yoksa):
  value?: number;
  text?: string;
}

export interface FormQuestion {
  id: number;
  question_text: string;
  question_type: QuestionType;
  order: number;
  is_required: boolean;
  options: QuestionOptionItem[];
  min_scale_value?: number;
  max_scale_value?: number;
  scale_labels?: Record<string, string> | null;
}

export interface FormDetail {
  id: number;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  has_responded: boolean;
  questions: FormQuestion[];
}

export interface AnswerSubmitPayload {
  question_id: number;
  text_answer?: string;
  numeric_answer?: number;
  selected_option_ids?: number[];
}

export interface FormSubmitPayload {
  form_id: number;
  answers: AnswerSubmitPayload[];
}

export interface FormResponseSummary {
  id: number;
  form: { id: number; title: string; stage: number };
  submitted_at: string;
}

export interface AnsweredQuestion {
  id: number;
  question_text: string;
  question_type: QuestionType;
  order: number;
  is_required: boolean;
  options: { id: number; option_text: string; order: number }[];
  min_scale_value?: number;
  max_scale_value?: number;
  scale_labels?: Record<string, string> | null;
}

export interface AnswerDetail {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  text_answer?: string;
  numeric_answer?: number;
  selected_options?: { id: number; text: string; order: number }[];
}

export interface FormResponseDetail {
  id: number;
  form: { id: number; title: string; stage: number };
  submitted_at: string;
  questions: AnsweredQuestion[];
  answers: AnswerDetail[];
}
