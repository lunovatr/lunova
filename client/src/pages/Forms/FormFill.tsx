// src/pages/Forms/FormFill.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import type {
  AnswerSubmitPayload,
  FormDetail,
  FormResponseSummary,
  QuestionType,
} from "../../types/forms.types";

type AnswerState = {
  text_answer?: string;
  numeric_answer?: number;
  selected_option_ids?: number[];
};

function requiresText(type: QuestionType) {
  return type === "text" || type === "textarea" || type === "date";
}
function requiresNumeric(type: QuestionType) {
  return type === "scale" || type === "number";
}
function requiresOptions(type: QuestionType) {
  return type === "yes_no" || type === "single_choice" || type === "multiple_choice";
}

export default function FormFill() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const detailRes = await api.get<FormDetail>(`/api/v1/forms/${id}/`);
        if (cancelled) return;

        if (detailRes.data.has_responded) {
          // Form zaten doldurulmuş - revizyon yok, kayıtlı cevaba yönlendir.
          const responsesRes = await api.get<FormResponseSummary[]>(
            "/api/v1/forms/me/form-responses/"
          );
          if (cancelled) return;
          const existing = responsesRes.data.find((r) => r.form.id === Number(id));
          navigate(existing ? `/forms/responses/${existing.id}` : "/forms", { replace: true });
          return;
        }

        setForm(detailRes.data);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Form yüklenirken hata oluştu."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const setAnswer = (questionId: number, value: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }));
  };

  const handleSubmit = async () => {
    if (!form) return;

    const missing = form.questions.filter((q) => {
      if (!q.is_required) return false;
      const a = answers[q.id];
      if (!a) return true;
      if (requiresText(q.question_type)) return !a.text_answer?.trim();
      if (requiresNumeric(q.question_type)) return a.numeric_answer === undefined;
      if (requiresOptions(q.question_type)) return !a.selected_option_ids?.length;
      return false;
    });

    if (missing.length > 0) {
      showToast("Lütfen zorunlu tüm soruları cevaplayın.", "warning");
      return;
    }

    const payloadAnswers: AnswerSubmitPayload[] = form.questions
      .filter((q) => answers[q.id])
      .map((q) => {
        const a = answers[q.id];
        const base: AnswerSubmitPayload = { question_id: q.id };
        if (requiresText(q.question_type)) base.text_answer = a.text_answer;
        if (requiresNumeric(q.question_type)) base.numeric_answer = a.numeric_answer;
        if (requiresOptions(q.question_type)) base.selected_option_ids = a.selected_option_ids;
        return base;
      });

    setSubmitting(true);
    try {
      const res = await api.post<{ response_id: number }>("/api/v1/forms/submit/", {
        form_id: form.id,
        answers: payloadAnswers,
      });
      showToast("Form başarıyla gönderildi.", "success");
      navigate(`/forms/responses/${res.data.response_id}`, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Form gönderilirken bir hata oluştu.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="mx-auto w-full max-w-screen-md">
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error || "Form bulunamadı."}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={form.title} description={form.description} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-md">
        <PageBreadCrumb pageTitle={form.title} />

        <div className="mt-8 space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {form.description && (
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{form.description}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Bu form bir kez doldurulur, gönderdikten sonra değiştirilemez.
            </p>
          </div>

          <div className="space-y-4">
            {form.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q) => (
                <div
                  key={q.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]"
                >
                  <label className="mb-3 block font-medium text-gray-900 dark:text-white">
                    {q.question_text}
                    {q.is_required && <span className="ml-1 text-red-500">*</span>}
                  </label>

                  {(q.question_type === "yes_no" ||
                    q.question_type === "single_choice") && (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={answers[q.id]?.selected_option_ids?.[0] === opt.id}
                            onChange={() => setAnswer(q.id, { selected_option_ids: [opt.id!] })}
                            className="h-4 w-4"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            {opt.option_text ?? opt.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = answers[q.id]?.selected_option_ids ?? [];
                        const checked = selected.includes(opt.id!);
                        return (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? selected.filter((id) => id !== opt.id)
                                  : [...selected, opt.id!];
                                setAnswer(q.id, { selected_option_ids: next });
                              }}
                              className="h-4 w-4"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {opt.option_text}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === "scale" && (
                    <div>
                      <input
                        type="range"
                        min={q.min_scale_value ?? 0}
                        max={q.max_scale_value ?? 4}
                        step={1}
                        value={answers[q.id]?.numeric_answer ?? q.min_scale_value ?? 0}
                        onChange={(e) => setAnswer(q.id, { numeric_answer: Number(e.target.value) })}
                        className="w-full"
                      />
                      <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        {Object.entries(q.scale_labels ?? {}).map(([value, label]) => (
                          <span key={value}>{label}</span>
                        ))}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Seçilen: {answers[q.id]?.numeric_answer ?? q.min_scale_value ?? 0}
                      </div>
                    </div>
                  )}

                  {q.question_type === "number" && (
                    <input
                      type="number"
                      value={answers[q.id]?.numeric_answer ?? ""}
                      onChange={(e) =>
                        setAnswer(q.id, {
                          numeric_answer: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  )}

                  {q.question_type === "date" && (
                    <input
                      type="date"
                      value={answers[q.id]?.text_answer ?? ""}
                      onChange={(e) => setAnswer(q.id, { text_answer: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  )}

                  {q.question_type === "text" && (
                    <input
                      type="text"
                      value={answers[q.id]?.text_answer ?? ""}
                      onChange={(e) => setAnswer(q.id, { text_answer: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  )}

                  {q.question_type === "textarea" && (
                    <textarea
                      value={answers[q.id]?.text_answer ?? ""}
                      onChange={(e) => setAnswer(q.id, { text_answer: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  )}
                </div>
              ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Gönderiliyor..." : "Formu Gönder"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
