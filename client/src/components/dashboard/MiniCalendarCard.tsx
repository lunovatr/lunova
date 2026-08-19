import { useMemo } from "react";
import { useNavigate } from "react-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import trLocale from "@fullcalendar/core/locales/tr";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { Appointment } from "../../types/appointment";

interface Props {
  appointments: Appointment[];
}

const statusToColor: Record<string, string> = {
  pending: "#f59e0b",
  waiting_approval: "#f59e0b",
  confirmed: "#12b76a",
  cancel_requested: "#f97316",
  cancelled: "#f04438",
  completed: "#98a2b3",
};

const legendItems: { label: string; color: string }[] = [
  { label: "Onay Bekliyor", color: statusToColor.pending },
  { label: "Onaylandı", color: statusToColor.confirmed },
  { label: "İptal Talebi", color: statusToColor.cancel_requested },
  { label: "Tamamlandı", color: statusToColor.completed },
];

export default function MiniCalendarCard({ appointments }: Props) {
  const navigate = useNavigate();

  const events: EventInput[] = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "cancelled")
        .map((a) => ({
          id: String(a.id),
          title: a.expert_name || `Uzman #${a.expert}`,
          date: a.date,
          backgroundColor: statusToColor[a.status] || "#98a2b3",
          borderColor: statusToColor[a.status] || "#98a2b3",
        })),
    [appointments]
  );

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    navigate("/appointments");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Randevu Takvimi
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mini-calendar text-gray-800 dark:text-white/90">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev", center: "title", right: "next" }}
          height="auto"
          events={events}
          eventClick={handleEventClick}
          dayMaxEvents={2}
          locale={trLocale}
        />
      </div>
    </div>
  );
}
