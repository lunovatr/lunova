// src/pages/Payments/Payments.tsx
//
// Faz 5 (Frontend Yapılandırması planı) - bu sayfa artık SADECE bireysel
// randevu ödemelerini değil, onaylanmış-ama-ödenmemiş grup seansı
// katılımlarını da tek bir "ödeme" yüzeyinde topluyor (GroupSessions.tsx
// kasıtlı olarak kendi ödeme akışını tekrarlamıyor, buraya yönlendiriyor).
// Faz 3 - indirim kodu girişi onay modalına eklendi (sadece ücretsiz ilk
// seans DIŞINDAKİ akışlarda).
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ToastContainer from "../../components/common/ToastContainer";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import { useModal } from "../../hooks/useModal";
import type { Appointment } from "../../types/appointment";
import type { MyGroupParticipation, MyGroupSessionsResponse } from "../../types/groupSession";

interface CheckoutResponse {
  payment_id: number;
  status: string;
  token: string;
  checkout_form_content: string | null;
  payment_page_url: string | null;
  mock?: boolean;
}

// Bireysel randevu ve grup seansı katılımını TEK bir listede göstermek için
// ortak bir zarf tipi - `kind` ayırıcı alan.
type PendingItem =
  | { kind: "appointment"; id: number; appointment: Appointment }
  | { kind: "group"; id: number; participation: MyGroupParticipation };

function formatDateTime(date: string, time: string) {
  return `${date} ${time.slice(0, 5)}`;
}

function formatPrice(amount: string | number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return "Fiyat belirtilmemiş";
  return `${amount} ${currency ?? "TRY"}`;
}

export default function Payments() {
  const { toasts, showToast, removeToast } = useToast();
  const confirmModal = useModal();
  const [searchParams] = useSearchParams();
  const highlightedAppointmentId = searchParams.get("appointmentId");
  const highlightedGroupParticipantId = searchParams.get("groupParticipantId");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupParticipations, setGroupParticipations] = useState<MyGroupParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 3))
          .toISOString()
          .split("T")[0],
      };
      const [appointmentsRes, groupsRes] = await Promise.all([
        api.get<Appointment[]>("/api/v1/appointments/", { params }),
        api.get<MyGroupSessionsResponse>("/api/v1/appointments/group-sessions/mine/"),
      ]);
      setAppointments(appointmentsRes.data);
      setGroupParticipations(groupsRes.data.participations);
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
    fetchAll();
  }, []);

  const pending: PendingItem[] = useMemo(() => {
    const fromAppointments: PendingItem[] = appointments
      .filter((a) => a.payment_status === "unpaid")
      .map((a) => ({ kind: "appointment" as const, id: a.id, appointment: a }));
    const fromGroups: PendingItem[] = groupParticipations
      .filter((p) => p.status === "approved" && p.payment_status === "unpaid")
      .map((p) => ({ kind: "group" as const, id: p.id, participation: p }));
    return [...fromAppointments, ...fromGroups];
  }, [appointments, groupParticipations]);

  const history: PendingItem[] = useMemo(() => {
    const fromAppointments: PendingItem[] = appointments
      .filter((a) => a.payment_status === "paid")
      .map((a) => ({ kind: "appointment" as const, id: a.id, appointment: a }));
    const fromGroups: PendingItem[] = groupParticipations
      .filter((p) => p.status === "approved" && p.payment_status === "paid")
      .map((p) => ({ kind: "group" as const, id: p.id, participation: p }));
    return [...fromAppointments, ...fromGroups];
  }, [appointments, groupParticipations]);

  const isHighlighted = (item: PendingItem) =>
    (item.kind === "appointment" && highlightedAppointmentId === String(item.id)) ||
    (item.kind === "group" && highlightedGroupParticipantId === String(item.id));

  const openConfirm = (item: PendingItem) => {
    setSelected(item);
    setDiscountCode("");
    confirmModal.openModal();
  };

  const closeConfirm = () => {
    if (submitting) return;
    confirmModal.closeModal();
    setSelected(null);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);

    if (selected.kind === "appointment" && selected.appointment.is_free_trial) {
      // Ücretsiz ilk seans: kart bilgisi/iyzico yok, sadece "Devam Et" onayı.
      try {
        await api.post(`/api/v1/payments/appointments/${selected.id}/confirm-free-trial/`);
        showToast("Seansınız onaylandı, bağlantınız hazırlanıyor.", "success");
        confirmModal.closeModal();
        setSelected(null);
        await fetchAll();
      } catch (err: any) {
        const message = err.response?.data?.detail || "İşlem başarısız.";
        showToast(message, "error");
        await fetchAll();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const url =
      selected.kind === "appointment"
        ? `/api/v1/payments/appointments/${selected.id}/checkout/`
        : `/api/v1/payments/group-sessions/participants/${selected.id}/checkout/`;

    try {
      const response = await api.post<CheckoutResponse>(url, {
        discount_code: discountCode.trim() || undefined,
      });
      const result = response.data;

      if (result.payment_page_url) {
        window.location.href = result.payment_page_url;
        return;
      }

      showToast("Ödemeniz alındı, seans bağlantınız hazırlanıyor.", "success");
      confirmModal.closeModal();
      setSelected(null);
      await fetchAll();
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

  const renderItemHeader = (item: PendingItem) => {
    if (item.kind === "appointment") {
      return {
        title: item.appointment.expert_name ?? "Uzman",
        subtitle: formatDateTime(item.appointment.date, item.appointment.time),
        priceLine: !item.appointment.is_free_trial
          ? formatPrice(item.appointment.session_price, item.appointment.session_currency)
          : null,
        isFreeTrial: !!item.appointment.is_free_trial,
      };
    }
    const group = item.participation.group_session;
    return {
      title: `${group.session_offering_name} (Grup) · ${group.expert_name}`,
      subtitle: formatDateTime(group.date, group.time),
      priceLine: formatPrice(group.price, group.currency),
      isFreeTrial: false,
    };
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
                    {pending.map((item) => {
                      const info = renderItemHeader(item);
                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                            isHighlighted(item)
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                              : "border-gray-200 dark:border-white/[0.05]"
                          }`}
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {info.title}
                              {item.kind === "group" && (
                                <span className="ml-2">
                                  <Badge size="sm" color="info">Grup</Badge>
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {info.subtitle}
                              {info.priceLine && <> · {info.priceLine}</>}
                            </div>
                            {info.isFreeTrial && (
                              <div className="mt-1">
                                <Badge size="sm" color="success" variant="light">
                                  Ücretsiz İlk Seans
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Button onClick={() => openConfirm(item)}>
                            {info.isFreeTrial ? "Devam Et" : "Öde"}
                          </Button>
                        </div>
                      );
                    })}
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
                    {history.map((item) => {
                      const info = renderItemHeader(item);
                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {info.title}
                              {item.kind === "group" && (
                                <span className="ml-2">
                                  <Badge size="sm" color="info">Grup</Badge>
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{info.subtitle}</div>
                          </div>
                          {info.isFreeTrial ? (
                            <Badge size="sm" color="success" variant="solid">
                              Ücretsiz İlk Seans
                            </Badge>
                          ) : (
                            <Badge size="sm" color="success" variant="light">
                              Ödendi
                            </Badge>
                          )}
                        </div>
                      );
                    })}
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
            {selected?.kind === "appointment" && selected.appointment.is_free_trial
              ? "Ücretsiz İlk Seansınızı Onaylayın"
              : "Ödemeyi Onayla"}
          </h4>
          {selected && (
            <>
              {(() => {
                const info = renderItemHeader(selected);
                if (info.isFreeTrial) {
                  return (
                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                      {info.title} ile {info.subtitle} tarihli seansınız, ömür boyu 1 kez hakkınız olan{" "}
                      <span className="font-medium">ücretsiz ilk seans</span> hakkınızla planlandı. Kart
                      bilgisi girmenize gerek yok - devam ederek seansı onaylayabilirsiniz.
                    </p>
                  );
                }
                return (
                  <>
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                      {info.title} için {info.subtitle} tarihli{" "}
                      <span className="font-medium">{info.priceLine}</span> tutarında ödeme yapılacak.
                    </p>
                    <div className="mb-6">
                      <Label htmlFor="discount_code">İndirim Kodu (opsiyonel)</Label>
                      <Input
                        id="discount_code"
                        type="text"
                        placeholder="Varsa indirim kodunuzu girin"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </>
                );
              })()}
            </>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeConfirm} disabled={submitting}>
              Vazgeç
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting
                ? "Yönlendiriliyor..."
                : selected?.kind === "appointment" && selected.appointment.is_free_trial
                ? "Devam Et"
                : "Ödemeyi Tamamla"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
