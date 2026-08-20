// src/pages/Forms/FormFill.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import type {
  AnswerSubmitPayload,
  FormDetail,
  FormQuestion,
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
function isAnswered(question: FormQuestion, a: AnswerState | undefined) {
  if (!a) return false;
  if (requiresText(question.question_type)) return !!a.text_answer?.trim();
  if (requiresNumeric(question.question_type)) return a.numeric_answer !== undefined;
  if (requiresOptions(question.question_type)) return !!a.selected_option_ids?.length;
  return false;
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
  const [missingQuestions, setMissingQuestions] = useState<FormQuestion[]>([]);
  const missingModal = useModal();
  const confirmModal = useModal();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      // Form değişince (aynı bileşen yeniden mount olmadan farklı bir
      // formun id'sine geçilse bile) önceki formdan kalan cevaplar taşınmasın.
      setAnswers({});
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

  // Çoklu seçim (checkbox) toggle'ı bilerek fonksiyonel setState kullanıyor:
  // `next` her zaman en güncel state'ten türetiliyor, render sırasında
  // yakalanmış (potansiyel olarak bayat) bir değişkenden değil - bu sayede
  // bir seçeneği işaretlemek diğer seçili seçenekleri asla ezmez.
  const toggleOption = (questionId: number, optionId: number) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_option_ids ?? [];
      const next = current.includes(optionId)
        ? current.filter((existingId) => existingId !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: { ...prev[questionId], selected_option_ids: next } };
    });
  };

  const handleSubmitClick = () => {
    if (!form) return;

    const missing = form.questions.filter((q) => !isAnswered(q, answers[q.id]));
    if (missing.length > 0) {
      setMissingQuestions(missing.slice().sort((a, b) => a.order - b.order));
      missingModal.openModal();
      return;
    }

    confirmModal.openModal();
  };

  const handleConfirmSubmit = async () => {
    confirmModal.closeModal();
    if (!form) return;

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
        <PageBreadCrumb
          pageTitle={form.title}
          items={[{ label: "Formlar", to: "/forms" }]}
        />

        <div className="mt-8 space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {form.description && (
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{form.description}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Bu form bir kez doldurulur, gönderdikten sonra değiştirilemez. Tüm sorular zorunludur.
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
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  {(q.question_type === "yes_no" ||
                    q.question_type === "single_choice") && (
                    <div className="space-y-2">
                      {q.options.map((opt, idx) => {
                        // Backend, gerçek bir QuestionOption kaydı yoksa (bkz.
                        // FormDetailView'ın yes_no fallback dalı) `id`'siz,
                        // sadece `value`/`text` içeren bir yer tutucu döner.
                        // `opt.id` bu durumda TÜM seçenekler için `undefined`
                        // olur - ham `opt.id` ile karşılaştırmak hepsini aynı
                        // anda "seçili" gösterip native radio davranışıyla
                        // sessizce son seçeneğe kilitlenmesine yol açıyordu.
                        // `idx` her zaman benzersiz olduğu için son çare.
                        const optionKey = opt.id ?? opt.value ?? idx;
                        const checked =
                          answers[q.id]?.selected_option_ids?.[0] === optionKey;
                        return (
                          <label
                            key={optionKey}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={checked}
                              onChange={() => setAnswer(q.id, { selected_option_ids: [optionKey] })}
                              className="h-4 w-4"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {opt.option_text ?? opt.text}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const checked =
                          answers[q.id]?.selected_option_ids?.includes(opt.id!) ?? false;
                        return (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOption(q.id, opt.id!)}
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
            <Button onClick={handleSubmitClick} disabled={submitting}>
              {submitting ? "Gönderiliyor..." : "Formu Gönder"}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={missingModal.isOpen}
        onClose={missingModal.closeModal}
        className="max-w-[500px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Eksik sorular var
          </h4>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Formu gönderebilmek için lütfen aşağıdaki soruları yanıtlayınız:
          </p>
          <ul className="mb-6 max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-gray-700 dark:text-gray-300">
            {missingQuestions.map((q) => (
              <li key={q.id}>{q.question_text}</li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={missingModal.closeModal}>Tamam</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.closeModal}
        className="max-w-[440px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Formu Gönder
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Formunuzu göndereceksiniz, emin misiniz? Gönderdikten sonra cevaplarınızı
            değiştiremezsiniz.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={confirmModal.closeModal} disabled={submitting}>
              Vazgeç
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={submitting}>
              {submitting ? "Gönderiliyor..." : "Evet, Gönder"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
