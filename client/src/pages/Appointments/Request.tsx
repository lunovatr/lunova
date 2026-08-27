// src/pages/Request.tsx

import { useState, useCallback } from "react";
import api from "../../lib/api";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from '../../components/common/ComponentCard';
import ToastContainer from "../../components/common/ToastContainer";
import FreeTrialBanner from "../../components/common/FreeTrialBanner";
import { useToast } from "../../hooks/useToast";
import ExpertAvailability, { ActiveSlotSelection } from "./ExpertAvailability";

// Sabitler
const categories = [
  { name: "Bilişsel Terapi", slug: "bilissel-terapi" },
  { name: "Aile Terapisi", slug: "aile-terapisi" },
  { name: "Çocuk ve Ergen", slug: "cocuk-ve-ergen" },
  { name: "Diğer", slug: "diger" },
];

export const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Yardımcı Fonksiyonlar
export const getDayOfWeek = (dateString: string): number => {
  const date = new Date(dateString);
  // Date objesi ile tarih hesaplandığında doğru gün indeksini verir
  return date.getDay(); 
};

export default function Request() {
  const { toasts, showToast, removeToast } = useToast();

  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [experts, setExperts] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  // Tüm uzmanlar arasında EN FAZLA bir slot seçili olabilsin diye ortak (tek)
  // bir state - hangi uzmanın hangi slotu seçili, burada tutuluyor. Bir uzmanın
  // slotuna tıklanınca bu state güncellenir, diğer tüm ExpertAvailability
  // bileşenleri kendi seçimlerinin artık aktif olmadığını buradan anlar.
  const [activeSelection, setActiveSelection] = useState<ActiveSlotSelection | null>(null);
  // Randevu talebi gönderilirken TÜM uzmanlardaki slot tıklamalarını devre dışı
  // bırakmak için ortak bir bayrak (görsel bir değişiklik yapmıyor, sadece
  // ExpertAvailability'deki handleSlotClick'i no-op'a çeviriyor).
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);

  // Uzmanları kategori ve tarih'e göre getir
  const fetchAvailableExperts = useCallback(async (categorySlug: string, selectedDate: string) => {
    if (!selectedDate) {
      showToast("Lütfen bir tarih seçin", "warning");
      return;
    }
    
    try {
      setGlobalLoading(true);
      const res = await api.get<any[]>(
        `/api/v1/availability/available-experts/?category=${categorySlug}&start_date=${selectedDate}&end_date=${selectedDate}`
      );
      setExperts(res.data);
      if (res.data.length === 0) {
        showToast('Bu kategoride ve tarihte müsait uzman bulunamadı', 'info');
      }
    } catch (err) {
      showToast('Uzmanlar yüklenirken bir hata oluştu', 'error');
      setExperts([]);
    } finally {
      setGlobalLoading(false);
    }
  }, [showToast]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    setCategory(slug);
    setExperts([]);
    setActiveSelection(null);
    if (slug && date) {
      fetchAvailableExperts(slug, date);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    setExperts([]);
    setActiveSelection(null);
    if (category && selectedDate) {
      fetchAvailableExperts(category, selectedDate);
    }
  };

  return (
    <>
      <PageMeta title="Randevu Talebi" description="Uzman seçimi ve randevu talebi sayfası" />
      <PageBreadcrumb pageTitle="Randevu Talebi" />

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <FreeTrialBanner className="mb-6" />

      <div className="space-y-6">
        {/* Kategori ve Tarih Seçimi */}
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
        
        {/* Uzman listesi ve Müsaitlik */}
        {globalLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : experts.length > 0 ? (
          <ComponentCard title="Uzman Seçimi">
            <div className="grid grid-cols-1 gap-4">
              {experts.map((expert) => (
                <div
                  key={expert.expert_user_id}
                  className="border border-gray-200 rounded-lg"
                >
                  <div className="p-4">
                    <h4 className="font-semibold text-lg text-gray-800 dark:text-white">
                      {expert.name}
                    </h4>
                  </div>

                  <div className="px-4 pb-4">
                    <ExpertAvailability
                      expert_user_id={expert.expert_user_id}
                      start_date={date}
                      end_date={date}
                      activeSelection={activeSelection}
                      onSelectionChange={setActiveSelection}
                      isSubmittingAppointment={isSubmittingAppointment}
                      onSubmittingAppointmentChange={setIsSubmittingAppointment}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ComponentCard>
        ) : null}
      </div>
    </>
  );
}