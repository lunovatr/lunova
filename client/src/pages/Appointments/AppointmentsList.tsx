// src/pages/Appointments/AppointmentsList.tsx
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import AppointmentsTable from "../../components/tables/Appointments/AppointmentsTable";
import api from "../../lib/api";
import { useNavigate } from "react-router";
import type { Appointment } from "../../types/appointment";
import { useToast } from "../../hooks/useToast";
import ToastContainer from "../../components/common/ToastContainer";

export default function AppointmentsList() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 3))
      .toISOString()
      .split("T")[0],
    status: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        start_date: filters.start_date,
        end_date: filters.end_date,
      };

      if (filters.status) {
        params.status = filters.status;
      }

      console.log("Randevular getiriliyor:", params);
      const response = await api.get<Appointment[]>("/api/v1/appointments/", { params });
      console.log("Gelen randevular:", response.data);
      setAppointments(response.data);
    } catch (err: any) {
      console.error("Randevu listesi hatası:", err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message || 
        "Randevular yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    appointmentId: number,
    newStatus: "cancel_requested" | "cancelled"
  ) => {
    try {
      await api.patch(`/api/v1/appointments/${appointmentId}/status/`, {
        status: newStatus,
      });
      showToast(
        newStatus === "cancel_requested"
          ? "İptal talebiniz gönderildi."
          : "Randevu talebiniz geri çekildi.",
        "success"
      );
      await fetchAppointments();
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        "İşlem gerçekleştirilemedi.";
      showToast(message, "error");
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <PageMeta title="Randevularım" description="Kullanıcının randevularını listeleyen sayfa" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="mx-auto w-full max-w-screen-xl">
        <PageBreadCrumb pageTitle="Randevularım" />

        <div className="mt-8 space-y-6">
          {/* Filters */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Filtreler
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Durum
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="waiting_approval">Onay Bekliyor</option>
                  <option value="confirmed">Onaylandı</option>
                  <option value="cancel_requested">İptal Talep Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-4">
              <button
                onClick={() => navigate("/appointments/request")}
                className="rounded-lg bg-brand-500 px-6 py-2.5 font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                Yeni Randevu Talep Et
              </button>
              <button
                onClick={fetchAppointments}
                className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Yenile
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Appointments Table */}
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="text-center">
                <div className="mb-2 text-gray-500 dark:text-gray-400">
                  Yükleniyor...
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  Randevularınız getiriliyor
                </div>
              </div>
            </div>
          ) : (
            <AppointmentsTable
              appointments={appointments}
              onStatusChange={handleStatusChange}
              onZoomBlocked={(message) => showToast(message, "warning")}
            />
          )}
        </div>
      </div>
    </>
  );
}