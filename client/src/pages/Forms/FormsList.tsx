// src/pages/Forms/FormsList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import api from "../../lib/api";
import type { FormListItem, FormResponseSummary } from "../../types/forms.types";

export default function FormsList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [responses, setResponses] = useState<FormResponseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [formsRes, responsesRes] = await Promise.all([
          api.get<FormListItem[]>("/api/v1/forms/"),
          api.get<FormResponseSummary[]>("/api/v1/forms/me/form-responses/"),
        ]);
        if (cancelled) return;
        setForms(formsRes.data);
        setResponses(responsesRes.data);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Formlar yüklenirken hata oluştu."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingForms = forms.filter((f) => !f.has_responded);

  return (
    <>
      <PageMeta title="Formlar" description="Doldurulacak ve doldurulmuş formlar" />
      <div className="mx-auto w-full max-w-screen-xl">
        <PageBreadCrumb pageTitle="Formlar" />

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="text-center">
                <div className="mb-2 text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                <div className="text-sm text-gray-400 dark:text-gray-500">Formlarınız getiriliyor</div>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Doldurulacak Formlar
                </h3>
                {pendingForms.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Şu anda doldurmanız gereken bir form bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingForms.map((form) => (
                      <button
                        key={form.id}
                        onClick={() => navigate(`/forms/${form.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{form.title}</div>
                          {form.description && (
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {form.description}
                            </div>
                          )}
                        </div>
                        <Badge color="warning">Bekliyor</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Doldurduğum Formlar
                </h3>
                {responses.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Henüz doldurduğunuz bir form bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {responses.map((response) => (
                      <button
                        key={response.id}
                        onClick={() => navigate(`/forms/responses/${response.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {response.form.title}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(response.submitted_at).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <Badge color="success">Dolduruldu</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
