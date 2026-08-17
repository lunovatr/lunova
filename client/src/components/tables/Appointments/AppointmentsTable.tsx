// src/components/tables/Appointments/AppointmentsTable.tsx
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Badge from "../../ui/badge/Badge";
import type { Appointment } from "../../../types/appointment";

interface AppointmentsTableProps {
  appointments: Appointment[];
  // Bir randevunun durumunu güncellemek için çağrılır (ör. iptal talebi / talebi geri çekme).
  // Backend'in desteklediği geçişler: confirmed -> cancel_requested (danışan iptal talebi),
  // waiting_approval -> cancelled (danışan kendi onaylanmamış talebini geri çeker).
  onStatusChange?: (appointmentId: number, status: "cancel_requested" | "cancelled") => Promise<void>;
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

export default function AppointmentsTable({
  appointments,
  onStatusChange,
}: AppointmentsTableProps) {
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  const handleAction = async (id: number, status: "cancel_requested" | "cancelled") => {
    if (!onStatusChange) return;
    setPendingActionId(id);
    try {
      await onStatusChange(id, status);
    } finally {
      setPendingActionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Uzman
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Tarih
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Saat
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Süre
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Durum
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Notlar
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                İşlemler
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Henüz randevunuz bulunmamaktadır.
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="px-5 py-4 text-start sm:px-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {appointment.expert_name || `Uzman #${appointment.expert}`}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {formatDate(appointment.date)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {appointment.time}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {appointment.duration} dk
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    <Badge size="sm" color={statusColors[appointment.status] || "light"}>
                      {statusLabels[appointment.status] || appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {appointment.notes || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      {appointment.status === "confirmed" && appointment.zoom_join_url && (
                        <button
                          onClick={() => window.open(appointment.zoom_join_url!, "_blank")}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-theme-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          Zoom'a Katıl
                        </button>
                      )}

                      {/* Onaylanmış randevu: danışan iptal talebi gönderebilir (backend: confirmed -> cancel_requested) */}
                      {appointment.status === "confirmed" && onStatusChange && (
                        <button
                          onClick={() => handleAction(appointment.id, "cancel_requested")}
                          disabled={pendingActionId === appointment.id}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-theme-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {pendingActionId === appointment.id ? "Gönderiliyor..." : "İptal Talebi Gönder"}
                        </button>
                      )}

                      {/* Henüz uzman onayı almamış kendi talebi: danışan geri çekebilir (backend: waiting_approval -> cancelled) */}
                      {appointment.status === "waiting_approval" && onStatusChange && (
                        <button
                          onClick={() => handleAction(appointment.id, "cancelled")}
                          disabled={pendingActionId === appointment.id}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {pendingActionId === appointment.id ? "Gönderiliyor..." : "Talebi Geri Çek"}
                        </button>
                      )}

                      {appointment.status === "cancel_requested" && (
                        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                          İptal talebiniz uzmana iletildi, onay bekleniyor
                        </span>
                      )}

                      {!(appointment.status === "confirmed" && appointment.zoom_join_url) &&
                        appointment.status !== "confirmed" &&
                        appointment.status !== "waiting_approval" &&
                        appointment.status !== "cancel_requested" && (
                          <span className="text-theme-sm text-gray-400 dark:text-gray-600">—</span>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}