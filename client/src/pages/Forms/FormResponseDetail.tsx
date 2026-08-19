// src/pages/Forms/FormResponseDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import api from "../../lib/api";
import type { FormResponseDetail as FormResponseDetailType } from "../../types/forms.types";

function renderAnswer(response: FormResponseDetailType, questionId: number) {
  const answer = response.answers.find((a) => a.question_id === questionId);
  if (!answer) {
    return <span className="text-gray-400 dark:text-gray-500">Cevaplanmadı</span>;
  }
  if (answer.selected_options && answer.selected_options.length > 0) {
    return (
      <span className="text-gray-700 dark:text-gray-300">
        {answer.selected_options.map((o) => o.text).join(", ")}
      </span>
    );
  }
  if (answer.numeric_answer !== undefined && answer.numeric_answer !== null) {
    return <span className="text-gray-700 dark:text-gray-300">{answer.numeric_answer}</span>;
  }
  if (answer.text_answer) {
    return <span className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{answer.text_answer}</span>;
  }
  return <span className="text-gray-400 dark:text-gray-500">Cevaplanmadı</span>;
}

export default function FormResponseDetail() {
  const { id } = useParams<{ id: string }>();
  const [response, setResponse] = useState<FormResponseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<FormResponseDetailType>(`/api/v1/forms/me/form-responses/${id}/`);
        if (!cancelled) setResponse(res.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            err.response?.data?.message ||
            "Form cevabı yüklenirken hata oluştu."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="mx-auto w-full max-w-screen-md">
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error || "Form cevabı bulunamadı."}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={response.form.title} description="Doldurulmuş form cevabı (salt okunur)" />
      <div className="mx-auto w-full max-w-screen-md">
        <PageBreadCrumb pageTitle={response.form.title} />

        <div className="mt-8 space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(response.submitted_at).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              tarihinde gönderildi. Bu cevaplar değiştirilemez.
            </p>
          </div>

          <div className="space-y-4">
            {response.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q) => (
                <div
                  key={q.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]"
                >
                  <div className="mb-2 font-medium text-gray-900 dark:text-white">
                    {q.question_text}
                  </div>
                  <div>{renderAnswer(response, q.id)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
