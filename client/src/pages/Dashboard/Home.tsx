import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import WelcomeCard from "../../components/dashboard/WelcomeCard";
import UpcomingAppointmentsCard from "../../components/dashboard/UpcomingAppointmentsCard";
import MiniCalendarCard from "../../components/dashboard/MiniCalendarCard";
import api from "../../lib/api";
import type { Appointment } from "../../types/appointment";

export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const params = {
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 1))
            .toISOString()
            .split("T")[0],
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 3))
            .toISOString()
            .split("T")[0],
        };
        const response = await api.get<Appointment[]>("/api/v1/appointments/", { params });
        setAppointments(response.data);
      } catch (err) {
        console.error("Ana panel için randevular yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return (
    <>
      <PageMeta
        title="Lunova Danışan Paneli | Lunova - Danışmanlık Platformu"
        description="Lunova danışan paneli - Danışmanlık hizmetlerinizi takip edin ve yönetin"
      />
      <div className="space-y-6">
        <WelcomeCard />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <UpcomingAppointmentsCard appointments={appointments} loading={loading} />
          <MiniCalendarCard appointments={appointments} />
        </div>
      </div>
    </>
  );
}
