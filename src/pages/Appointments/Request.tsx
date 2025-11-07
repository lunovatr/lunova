import { useState } from "react";
import api from "../../lib/api";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router";

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
  const navigate = useNavigate();
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

  // Tarihin hangi gün olduğunu hesapla (1=Pazartesi, 7=Pazar)
  const getDayOfWeek = (dateString: string): number => {
    const date = new Date(dateString);
    const day = date.getDay(); // 0=Pazar, 1=Pazartesi, ...
    return day === 0 ? 7 : day; // 0'ı 7 yap (Pazar)
  };

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
        return a.day_of_week - b.day_of_week;
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
    setSelectedSlot(null); // Tarih değiştiğinde seçimi sıfırla
    if (category && selectedDate) fetchAvailableExperts(category, selectedDate);
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
    setSelectedSlot({ expertId, slotId });
  };

  const handleSubmitAppointment = async () => {
    if (!selectedSlot || !date) {
      alert("Lütfen bir slot seçin ve tarih belirtin.");
      return;
    }

    const slot = availability[selectedSlot.expertId]?.find(
      (s) => s.id === selectedSlot.slotId
    );

    if (!slot) {
      alert("Seçilen slot bulunamadı.");
      return;
    }

    // Seçilen tarihin gün kontrolü
    const selectedDayOfWeek = getDayOfWeek(date);
    if (selectedDayOfWeek !== slot.day_of_week) {
      alert(
        `Bu slot ${slot.day_display} günü için geçerlidir. Lütfen uygun bir tarih seçin.`
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
      duration: Number(slot.slot_minutes),
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
      alert("Randevu talebiniz başarıyla gönderildi!");
      navigate("/appointments");
    } catch (err: any) {
      console.error("Tam hata objesi:", err.response?.data);

      let errorMessage = "Randevu talebi gönderilemedi.\n\n";

      if (err.response?.data) {
        const errorData = err.response.data;

        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          errorMessage += errorData.non_field_errors.join("\n");
        } else if (errorData.detail) {
          errorMessage += errorData.detail;
        } else if (errorData.message) {
          errorMessage += errorData.message;
        } else {
          const errors = Object.entries(errorData)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            })
            .join("\n");
          errorMessage += errors || "Bilinmeyen hata";
        }
      }

      alert(errorMessage);
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
    <div>
      <PageMeta title="Randevu Talebi" description="Uzman seçimi ve randevu talebi sayfası" />
      <PageBreadcrumb pageTitle="Randevu Talebi" />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[900px]">
          <h3 className="mb-6 text-center font-semibold text-2xl text-gray-800 dark:text-white/90">
            Uzman Seçimi ve Randevu Oluşturma
          </h3>

          {/* Kategori + tarih seçimi */}
          <div className="mb-8 flex flex-col justify-center gap-4 md:flex-row">
            <select
              value={category}
              onChange={handleCategoryChange}
              className="w-full rounded-lg border p-2 dark:bg-gray-800 dark:text-white md:w-1/3"
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
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border p-2 dark:bg-gray-800 dark:text-white md:w-1/3"
            />
          </div>

          {date && (
            <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Seçilen Tarih:{" "}
              {new Date(date).toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}

          {/* Uzman listesi */}
          {globalLoading ? (
            <p className="text-center">Yükleniyor...</p>
          ) : experts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {experts.map((expert) => {
                const isOpen = openExperts.includes(expert.expert_id);
                const isLoading = loadingExperts.includes(expert.expert_id);
                const allSlots = availability[expert.expert_id] || [];
                const filteredSlots = getFilteredSlots(allSlots);

                return (
                  <div
                    key={expert.expert_id}
                    className={`rounded-xl border bg-white p-4 transition-all duration-200 dark:bg-gray-800 ${
                      isOpen ? "border-blue-500 shadow-sm" : "border-gray-200"
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
                          <p className="text-sm text-gray-500">{expert.about}</p>
                        )}
                      </div>
                      <span
                        className={`text-gray-600 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>

                    {/* Slot Listesi */}
                    <div
                      className={`overflow-hidden transition-all duration-500 ${
                        isOpen ? "mt-3 max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {isLoading ? (
                        <p className="py-3 text-center text-gray-500">Yükleniyor...</p>
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
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                    : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/30 dark:hover:bg-gray-700"
                                }`}
                              >
                                <div className="font-medium">{slot.day_display}</div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  {slot.start_time} - {slot.end_time}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {slot.service_name} ({slot.slot_minutes} dk)
                                </div>
                                {isSelected && (
                                  <div className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    ✓ Seçildi
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          {date
                            ? "Seçtiğiniz tarih için müsait slot bulunamadı. Lütfen başka bir tarih seçin."
                            : "Müsait slot bulunamadı."}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            category && <p className="text-center">Bu kategoride müsait uzman bulunamadı.</p>
          )}

          {/* Randevu Oluşturma Formu */}
          {selectedSlot && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                Randevu Detayları
              </h4>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notlar (İsteğe Bağlı)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Randevu ile ilgili notlarınızı buraya yazabilirsiniz..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmitAppointment}
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? "Gönderiliyor..." : "Randevu Talep Et"}
                </button>
                <button
                  onClick={() => {
                    setSelectedSlot(null);
                    setNotes("");
                  }}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}