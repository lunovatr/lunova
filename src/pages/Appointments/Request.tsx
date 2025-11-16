import { useState } from "react";
import { useNavigate } from 'react-router';
import api from "../../lib/api";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from '../../components/common/ComponentCard';
import ToastContainer from "../../components/common/ToastContainer";
import { useToast } from "../../hooks/useToast";

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
  day_of_week: number;
  day_display: string;
  start_time: string;
  end_time: string;
  service: number;
  service_name: string;
  slot_minutes: number;
  capacity: number;
  is_active: boolean;
}

const categories = [
  { name: "Bilişsel Terapi", slug: "bilissel-terapi" },
  { name: "Aile Terapisi", slug: "aile-terapisi" },
  { name: "Çocuk ve Ergen", slug: "cocuk-ve-ergen" },
  { name: "Diğer", slug: "diger" },
];

const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Tarihin hangi gün olduğunu hesapla (0=Pazar, 1=Pazartesi)
const getDayOfWeek = (dateString: string): number => {
  const date = new Date(dateString);
  return date.getDay();
};

export default function Request() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [openExperts, setOpenExperts] = useState<number[]>([]);
  const [availability, setAvailability] = useState<Record<number, AvailabilityDetail[]>>({});
  const [loadingExperts, setLoadingExperts] = useState<number[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    expertId: number;
    slotId: number;
  } | null>(null);
  const [notes, setNotes] = useState("");

  // Uzmanları kategori ve tarih'e göre getir
  const fetchAvailableExperts = async (categorySlug: string, selectedDate: string) => {
    if (!selectedDate) {
      showToast("Lütfen bir tarih seçin", "warning");
      return;
    }
    
    try {
      setGlobalLoading(true);
      const res = await api.get<Expert[]>(
        `/api/v1/availability/available-experts/?category=${categorySlug}&start_date=${selectedDate}&end_date=${selectedDate}`
      );
      setExperts(res.data);
      
      if (res.data.length === 0) {
        showToast('Bu kategoride ve tarihte müsait uzman bulunamadı', 'info');
      }
    } catch (err: any) {
      console.error("Uygun uzmanlar alınamadı:", err);
      showToast('Uzmanlar yüklenirken bir hata oluştu', 'error');
      setExperts([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Uzmanın tüm müsaitliklerini getir
  const fetchExpertAvailability = async (expertId: number) => {
    try {
      setLoadingExperts((prev) => [...prev, expertId]);
      const res = await api.get<AvailabilityDetail[]>(`/api/v1/availability/expert/${expertId}/`);
      
      // Sadece aktif slotları filtrele ve sırala
      const activeSlots = res.data
        .filter(slot => slot.is_active)
        .sort((a, b) => {
          if (a.day_of_week === b.day_of_week) {
            return a.start_time.localeCompare(b.start_time);
          }
          return a.day_of_week - b.day_of_week;
        });
      
      setAvailability((prev) => ({ ...prev, [expertId]: activeSlots }));
    } catch (err) {
      console.error("Uzman müsaitliği alınamadı:", err);
      showToast('Uzman müsaitliği yüklenirken bir hata oluştu', 'error');
      setAvailability((prev) => ({ ...prev, [expertId]: [] }));
    } finally {
      setLoadingExperts((prev) => prev.filter((id) => id !== expertId));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    setCategory(slug);
    setExperts([]);
    setOpenExperts([]);
    setAvailability({});
    setSelectedSlot(null);
    
    if (slug && date) {
      fetchAvailableExperts(slug, date);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    setSelectedSlot(null);
    setExperts([]);
    setOpenExperts([]);
    setAvailability({});
    
    if (category && selectedDate) {
      fetchAvailableExperts(category, selectedDate);
    }
  };

  const handleExpertClick = async (expert: Expert) => {
    const { expert_id } = expert;
    const isOpen = openExperts.includes(expert_id);

    if (isOpen) {
      setOpenExperts((prev) => prev.filter((id) => id !== expert_id));
    } else {
      setOpenExperts((prev) => [...prev, expert_id]);
      if (!availability[expert_id]) {
        await fetchExpertAvailability(expert_id);
      }
    }
  };

  const handleSlotSelect = (expertId: number, slotId: number) => {
    // Slot seçildiğinde tarih kontrolü yap
    if (!date) {
      showToast("Önce bir tarih seçmelisiniz", "warning");
      return;
    }

    const slot = availability[expertId]?.find(s => s.id === slotId);
    if (slot) {
      const selectedDayOfWeek = getDayOfWeek(date);
      
      if (selectedDayOfWeek !== slot.day_of_week) {
        showToast(
          `❌ DİKKAT: Bu slot ${slot.day_display} günü için geçerlidir. Seçtiğiniz tarih ise ${daysOfWeek[selectedDayOfWeek]} günüdür. Lütfen ${slot.day_display} günü olan bir tarih seçin.`,
          "error"
        );
        return;
      }
    }

    setSelectedSlot({ expertId, slotId });
    showToast("✓ Slot başarıyla seçildi", "success");
  };

  const handleSubmitAppointment = async () => {
    if (!selectedSlot || !date) {
      showToast("Lütfen bir slot seçin ve tarih belirtin", "warning");
      return;
    }

    const slot = availability[selectedSlot.expertId]?.find(
      (s) => s.id === selectedSlot.slotId
    );

    if (!slot) {
      showToast("Seçilen slot bulunamadı", "error");
      return;
    }

    // Son kez gün kontrolü
    const selectedDayOfWeek = getDayOfWeek(date);
    if (selectedDayOfWeek !== slot.day_of_week) {
      showToast(
        `Bu slot ${slot.day_display} günü için geçerlidir. Seçtiğiniz tarih ${daysOfWeek[selectedDayOfWeek]} günüdür. Lütfen uygun bir tarih seçin.`,
        "error"
      );
      return;
    }

    // Time'ı HH:MM:SS formatına çevir
    let formattedTime = slot.start_time;
    if (formattedTime.split(":").length === 2) {
      formattedTime = `${formattedTime}:00`;
    }

    const appointmentData = {
      expert: Number(selectedSlot.expertId),
      date: date,
      time: formattedTime,
      duration: Number(slot.slot_minutes), // Slot'un kendi süresini kullan
      notes: notes || "Danışan tarafından randevu talebi",
    };

    console.log("Gönderilecek veri:", appointmentData);

    try {
      setSubmitting(true);
      const response = await api.post(
        "/api/v1/appointments/client/request/",
        appointmentData
      );
      
      console.log("Başarılı response:", response.data);
      showToast('🎉 Randevu talebiniz başarıyla gönderildi!', 'success');
      
      setTimeout(() => {
        navigate("/appointments");
      }, 2000);
    } catch (err: any) {
      console.error("Tam hata objesi:", err.response?.data);

      let errorMessage = "Randevu talebi gönderilemedi.";

      if (err.response?.data) {
        const errorData = err.response.data;

        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage = errorData.non_field_errors.join(" ");
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          const errors = Object.entries(errorData)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            })
            .join(" ");
          errorMessage = errors || "Bilinmeyen hata";
        }
      }

      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Slotları filtreleyerek sadece seçili tarihe uygun olanları göster
  const getFilteredSlots = (slots: AvailabilityDetail[]) => {
    if (!date) return slots;
    const selectedDayOfWeek = getDayOfWeek(date);
    return slots.filter((slot) => slot.day_of_week === selectedDayOfWeek);
  };

  return (
    <>
      <PageMeta title="Randevu Talebi" description="Uzman seçimi ve randevu talebi sayfası" />
      <PageBreadcrumb pageTitle="Randevu Talebi" />
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="space-y-6">
        <ComponentCard title="Kategori ve Tarih Seçimi">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori
              </label>
              <select
                id="category"
                aria-label="Kategori"
                value={category}
                onChange={handleCategoryChange}
                className="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Kategori Seçiniz</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tarih
              </label>
              <input
                id="date"
                type="date"
                title="Tarih seçimi"
                placeholder="YYYY-MM-DD"
                value={date}
                onChange={handleDateChange}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {date && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Seçilen Tarih:</span>{" "}
                {new Date(date).toLocaleDateString("tr-TR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ℹ️ Sadece bu güne ait slotlar listelenecektir
              </p>
            </div>
          )}
        </ComponentCard>

        {/* Uzman listesi */}
        {globalLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : experts.length > 0 ? (
          <ComponentCard title="Uzman Seçimi">
            <div className="grid grid-cols-1 gap-4">
              {experts.map((expert) => {
                const isOpen = openExperts.includes(expert.expert_id);
                const isLoading = loadingExperts.includes(expert.expert_id);
                const allSlots = availability[expert.expert_id] || [];
                const filteredSlots = getFilteredSlots(allSlots);

                return (
                  <div
                    key={expert.expert_id}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      isOpen ? "border-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div
                      onClick={() => handleExpertClick(expert)}
                      className="flex cursor-pointer items-center justify-between"
                    >
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                          {expert.name}
                        </h4>
                        {expert.about && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{expert.about}</p>
                        )}
                      </div>
                      <svg
                        className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Slot Listesi */}
                    <div
                      className={`overflow-hidden transition-all duration-500 ${
                        isOpen ? "mt-3 max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : filteredSlots.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          {filteredSlots.map((slot) => {
                            const isSelected =
                              selectedSlot?.expertId === expert.expert_id &&
                              selectedSlot?.slotId === slot.id;

                            return (
                              <div
                                key={slot.id}
                                onClick={() => handleSlotSelect(expert.expert_id, slot.id)}
                                className={`cursor-pointer rounded-md border p-3 transition ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500"
                                    : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/30 dark:hover:bg-gray-700"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {slot.day_display}
                                  </span>
                                  {isSelected && (
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  {slot.start_time} - {slot.end_time}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {slot.service_name} ({slot.slot_minutes} dk)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            ⚠️ {date
                              ? `Seçtiğiniz tarih (${daysOfWeek[getDayOfWeek(date)]}) için müsait slot bulunamadı. Lütfen başka bir tarih seçin.`
                              : "Müsait slot bulunamadı."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ComponentCard>
        ) : null}

        {/* Randevu Detayları */}
        {selectedSlot && (
          <ComponentCard title="Randevu Detayları">
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Slot Seçildi</p>
                    <p className="text-lg font-semibold text-green-900 dark:text-green-200 mt-1">
                      {date && new Date(date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      <span className="font-medium">Saat:</span>{" "}
                      {availability[selectedSlot.expertId]?.find(s => s.id === selectedSlot.slotId)?.start_time} - 
                      {availability[selectedSlot.expertId]?.find(s => s.id === selectedSlot.slotId)?.end_time}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <span className="font-medium">Süre:</span>{" "}
                      {availability[selectedSlot.expertId]?.find(s => s.id === selectedSlot.slotId)?.slot_minutes} dakika
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notlar (İsteğe Bağlı)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Randevunuzla ilgili not ekleyebilirsiniz..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmitAppointment}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Gönderiliyor...
                    </>
                  ) : (
                    'Randevu Talebini Gönder'
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedSlot(null);
                    setNotes("");
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </ComponentCard>
        )}
      </div>
    </>
  );
}