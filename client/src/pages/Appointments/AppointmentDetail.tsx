// src/pages/Appointments/AppointmentDetail.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import api from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";
import { getZoomJoinBlockMessage } from "../../utils/zoomAccess";
import type { Appointment } from "../../types/appointment";

const statusColors: Record<string, "success" | "warning" | "error" | "light"> = {
  pending: "warning",
  waiting_approval: "warning",
  confirmed: "success",
  cancel_requested: "error",
  cancelled: "error",
  completed: "light",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  waiting_approval: "Onay Bekliyor",
  confirmed: "Onaylandı",
  cancel_requested: "İptal Talep Edildi",
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
};

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<Appointment>(`/api/v1/appointments/${id}/`);
        if (!cancelled) setAppointment(res.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            err.response?.data?.error ||
            "Randevu bulunamadı."
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

  const handleStatusChange = async (newStatus: "cancel_requested" | "cancelled") => {
    if (!appointment) return;
    setSubmitting(true);
    try {
      const res = await api.patch<Appointment>(`/api/v1/appointments/${appointment.id}/status/`, {
        status: newStatus,
      });
      setAppointment(res.data);
      showToast(
        newStatus === "cancel_requested"
          ? "İptal talebiniz gönderildi."
          : "Randevu talebiniz geri çekildi.",
        "success"
      );
    } catch (err: any) {
      showToast(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "İşlem gerçekleştirilemedi.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleZoomJoin = () => {
    if (!appointment?.zoom_join_url) return;
    const blockMessage = getZoomJoinBlockMessage(appointment.date, appointment.time);
    if (blockMessage) {
      showToast(blockMessage, "warning");
      return;
    }
    window.open(appointment.zoom_join_url, "_blank");
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

  if (error || !appointment) {
    return (
      <div className="mx-auto w-full max-w-screen-md">
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error || "Randevu bulunamadı."}
        </div>
      </div>
    );
  }

  const formattedDate = new Date(appointment.date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageMeta title="Randevu Detayı" description="Randevu detay bilgileri" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-md">
        <PageBreadCrumb
          pageTitle="Randevu Detayı"
          items={[{ label: "Randevularım", to: "/appointments" }]}
        />

        <div className="mt-8 space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {appointment.expert_name || `Uzman #${appointment.expert}`}
              </h3>
              <Badge size="sm" color={statusColors[appointment.status] || "light"}>
                {statusLabels[appointment.status] || appointment.status}
              </Badge>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Tarih</dt>
                <dd className="text-gray-900 dark:text-white">{formattedDate}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Saat</dt>
                <dd className="text-gray-900 dark:text-white">{appointment.time}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Süre</dt>
                <dd className="text-gray-900 dark:text-white">{appointment.duration} dk</dd>
              </div>
              {appointment.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Notlar</dt>
                  <dd className="text-gray-900 dark:text-white">{appointment.notes}</dd>
                </div>
              )}
            </dl>

            {appointment.status === "cancel_requested" && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                İptal talebiniz uzmana iletildi, onay bekleniyor.
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {appointment.status === "confirmed" && appointment.zoom_join_url && (
                <Button onClick={handleZoomJoin}>Zoom'a Katıl</Button>
              )}
              {appointment.status === "confirmed" && (
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleStatusChange("cancel_requested")}
                >
                  İptal Talebi Gönder
                </Button>
              )}
              {appointment.status === "waiting_approval" && (
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleStatusChange("cancelled")}
                >
                  Talebi Geri Çek
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/appointments")}>
                Randevularıma Dön
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
