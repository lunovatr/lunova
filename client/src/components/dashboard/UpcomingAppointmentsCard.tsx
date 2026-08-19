import { Link } from "react-router";
import Badge from "../ui/badge/Badge";
import type { Appointment } from "../../types/appointment";
import { getZoomJoinBlockMessage } from "../../utils/zoomAccess";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../common/ToastContainer";

interface Props {
  appointments: Appointment[];
  loading: boolean;
}

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
  });
}

export default function UpcomingAppointmentsCard({ appointments, loading }: Props) {
  const { toasts, showToast, removeToast } = useToast();
  const now = new Date();
  const upcoming = appointments
    .filter((a) => {
      if (a.status === "cancelled" || a.status === "completed") return false;
      return new Date(`${a.date}T${a.time}`) >= now;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Yaklaşan Randevularım
        </h3>
        <Link
          to="/appointments"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Tümünü Gör
        </Link>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Yükleniyor...</p>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Henüz yaklaşan bir randevunuz yok.
          </p>
          <Link
            to="/appointments/request"
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Randevu Talep Et →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {upcoming.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {a.expert_name || `Uzman #${a.expert}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(a.date)} · {a.time} · {a.duration} dk
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" color={statusColors[a.status] || "light"}>
                  {statusLabels[a.status] || a.status}
                </Badge>
                {a.status === "confirmed" && a.zoom_join_url && (
                  <button
                    onClick={() => {
                      const blockMessage = getZoomJoinBlockMessage(a.date, a.time);
                      if (blockMessage) {
                        showToast(blockMessage, "warning");
                        return;
                      }
                      window.open(a.zoom_join_url!, "_blank");
                    }}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Zoom
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
