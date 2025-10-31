import { useState } from "react";
import api from "../../lib/api";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

interface Expert {
  expert_id: number;
  name: string;
  photo?: string | null;
  about?: string;
  category: string;
}

interface AvailabilityDetail {
  id: number;
  expert: number;
  expert_name: string;
  day_of_week: number; // 1=Monday, 7=Sunday
  day_display: string;
  start_time: string;
  end_time: string;
  service: number;
  service_name: string;
  slot_minutes: number;
  capacity: number;
}

const categories = [
  { name: "Bilişsel Terapi", slug: "bilissel-terapi" },
  { name: "Aile Terapisi", slug: "aile-terapisi" },
  { name: "Çocuk ve Ergen", slug: "cocuk-ve-ergen" },
  { name: "Diğer", slug: "diger" },
];

export default function Request() {
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [openExperts, setOpenExperts] = useState<number[]>([]);
  const [availability, setAvailability] = useState<Record<number, AvailabilityDetail[]>>({});
  const [loadingExperts, setLoadingExperts] = useState<number[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Uzmanları kategori ve tarih aralığına göre getir
  const fetchAvailableExperts = async (categorySlug: string, selectedDate: string) => {
    if (!selectedDate) return alert("Lütfen bir tarih seçin.");
    try {
      setGlobalLoading(true);
      const res = await api.get(
        `/api/v1/availability/available-experts/?category=${categorySlug}&start_date=${selectedDate}&end_date=${selectedDate}`
      );
      setExperts(res.data as Expert[]);
    } catch (err) {
      console.error("Uygun uzmanlar alınamadı:", err);
      setExperts([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Uzmanın slotlarını getir (lokal loading)
  const fetchExpertAvailability = async (expertId: number) => {
    try {
      setLoadingExperts((prev) => [...prev, expertId]);
      const res = await api.get(`/api/v1/availability/expert/${expertId}/`);
      const sorted = [...(res.data as AvailabilityDetail[])].sort((a, b) => {
        if (a.day_of_week === b.day_of_week) {
          return a.start_time.localeCompare(b.start_time);
        }
        return a.day_of_week - b.day_of_week; // Pazartesi -> Pazar sırası
      });
      setAvailability((prev) => ({ ...prev, [expertId]: sorted }));
    } catch (err) {
      console.error("Uzman müsaitliği alınamadı:", err);
      setAvailability((prev) => ({ ...prev, [expertId]: [] }));
    } finally {
      setLoadingExperts((prev) => prev.filter((id) => id !== expertId));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    setCategory(slug);
    if (slug && date) fetchAvailableExperts(slug, date);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    if (category && selectedDate) fetchAvailableExperts(category, selectedDate);
  };

  const handleExpertClick = async (expert: Expert) => {
    const { expert_id } = expert;
    const isOpen = openExperts.includes(expert_id);

    if (isOpen) {
      // Kapat
      setOpenExperts((prev) => prev.filter((id) => id !== expert_id));
    } else {
      // Aç
      setOpenExperts((prev) => [...prev, expert_id]);
      if (!availability[expert_id]) {
        await fetchExpertAvailability(expert_id);
      }
    }
  };

  return (
    <div>
      <PageMeta title="Randevu Talebi" description="Uzman seçimi ve randevu talebi sayfası" />
      <PageBreadcrumb pageTitle="Randevu Talebi" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[700px] text-center">
          <h3 className="mb-6 font-semibold text-gray-800 text-2xl dark:text-white/90">
            Uzman Seçimi
          </h3>

          {/* Kategori + tarih seçimi */}
          <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
            <select
              value={category}
              onChange={handleCategoryChange}
              className="border rounded-lg p-2 w-full md:w-1/3 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Kategori Seçiniz</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={handleDateChange}
              className="border rounded-lg p-2 w-full md:w-1/3 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Uzman listesi */}
          {globalLoading ? (
            <p>Yükleniyor...</p>
          ) : experts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 text-left">
              {experts.map((expert) => {
                const isOpen = openExperts.includes(expert.expert_id);
                const isLoading = loadingExperts.includes(expert.expert_id);
                const slots = availability[expert.expert_id] || [];

                return (
                  <div
                    key={expert.expert_id}
                    className={`border rounded-xl bg-white dark:bg-gray-800 p-4 transition-all duration-200 ${
                      isOpen ? "border-blue-500 shadow-sm" : "border-gray-200"
                    }`}
                  >
                    <div
                      onClick={() => handleExpertClick(expert)}
                      className="cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-semibold text-lg text-gray-800 dark:text-white">
                          {expert.name}
                        </h4>
                        {expert.about && (
                          <p className="text-sm text-gray-500">{expert.about}</p>
                        )}
                      </div>
                      <span
                        className={`transition-transform ${
                          isOpen ? "rotate-180" : ""
                        } text-gray-600`}
                      >
                        ▼
                      </span>
                    </div>

                    {/* Slot Listesi */}
                    <div
                      className={`transition-all duration-500 overflow-hidden ${
                        isOpen ? "max-h-[800px] opacity-100 mt-3" : "max-h-0 opacity-0"
                      }`}
                    >
                      {isLoading ? (
                        <p className="text-gray-500 text-center py-3">Yükleniyor...</p>
                      ) : slots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              className="border rounded-md p-2 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                              <div className="font-medium">{slot.day_display}</div>
                              <div>
                                {slot.start_time} - {slot.end_time}
                              </div>
                              <div className="text-xs text-gray-500">
                                {slot.service_name} ({slot.slot_minutes} dk)
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm mt-2">
                          Müsait slot bulunamadı.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            category && <p>Bu kategoride müsait uzman bulunamadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}
