// src/pages/Payments/Payments.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ToastContainer from "../../components/common/ToastContainer";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { useModal } from "../../hooks/useModal";
import type { Appointment } from "../../types/appointment";

interface CheckoutResponse {
  payment_id: number;
  status: string;
  token: string;
  checkout_form_content: string | null;
  payment_page_url: string | null;
  mock?: boolean;
}

function formatDateTime(date: string, time: string) {
  return `${date} ${time.slice(0, 5)}`;
}

function formatPrice(appointment: Appointment) {
  if (appointment.session_price == null) return "Fiyat belirtilmemiş";
  return `${appointment.session_price} ${appointment.session_currency ?? "TRY"}`;
}

export default function Payments() {
  const { toasts, showToast, removeToast } = useToast();
  const confirmModal = useModal();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get("appointmentId");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        // Backend appointments/views.py::AppointmentListView, admin olmayanlar
        // için start_date..end_date aralığını en fazla 4 ay ile sınırlıyor -
        // AppointmentsList.tsx'teki AYNI -1ay/+3ay aralığı (tam 4 ay) burada
        // da kullanılıyor. Önceden +4 ay kullanılıyordu (toplam 5 ay), bu her
        // zaman backend'den 400 döndürüyordu.
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 3))
          .toISOString()
          .split("T")[0],
      };
      const response = await api.get<Appointment[]>("/api/v1/appointments/", { params });
      setAppointments(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Ödemeler yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const pending = useMemo(
    () => appointments.filter((a) => a.payment_status === "unpaid"),
    [appointments]
  );
  const history = useMemo(
    () => appointments.filter((a) => a.payment_status === "paid"),
    [appointments]
  );

  const openConfirm = (appointment: Appointment) => {
    setSelected(appointment);
    confirmModal.openModal();
  };

  const closeConfirm = () => {
    if (submitting) return;
    confirmModal.closeModal();
    setSelected(null);
  };

  const handlePay = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const response = await api.post<CheckoutResponse>(
        `/api/v1/payments/appointments/${selected.id}/checkout/`
      );
      const result = response.data;

      if (result.payment_page_url) {
        // Gerçek (sandbox/production) mod: iyzico'nun hosted ödeme sayfasına yönlendir.
        window.location.href = result.payment_page_url;
        return;
      }

      // mock mod: ödeme anında tamamlanıyor, yönlendirmeye gerek yok.
      showToast("Ödemeniz alındı, seans bağlantınız hazırlanıyor.", "success");
      confirmModal.closeModal();
      setSelected(null);
      await fetchAppointments();
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Ödeme başlatılamadı.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Ödemeler" description="Seans ödemelerinizi yönetin" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-xl">
        <PageBreadCrumb pageTitle="Ödemeler" />

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
                <div className="text-sm text-gray-400 dark:text-gray-500">Ödemeleriniz getiriliyor</div>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Bekleyen Ödemeler
                </h3>
                {pending.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bekleyen bir ödemeniz yok.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                          highlightedId === String(appointment.id)
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                            : "border-gray-200 dark:border-white/[0.05]"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {appointment.expert_name ?? "Uzman"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(appointment.date, appointment.time)} · {formatPrice(appointment)}
                          </div>
                        </div>
                        <Button onClick={() => openConfirm(appointment)}>Öde</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Ödeme Geçmişi
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Henüz tamamlanmış bir ödemeniz yok.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {appointment.expert_name ?? "Uzman"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(appointment.date, appointment.time)}
                          </div>
                        </div>
                        <span className="inline-flex w-fit items-center rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-500">
                          Ödendi
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={confirmModal.isOpen} onClose={closeConfirm} className="max-w-[440px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900">
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Ödemeyi Onayla
          </h4>
          {selected && (
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {selected.expert_name ?? "Uzman"} ile {formatDateTime(selected.date, selected.time)} tarihli
              seansınız için <span className="font-medium">{formatPrice(selected)}</span> tutarında ödeme
              yapılacak.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeConfirm} disabled={submitting}>
              Vazgeç
            </Button>
            <Button onClick={handlePay} disabled={submitting}>
              {submitting ? "Yönlendiriliyor..." : "Ödemeyi Tamamla"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
