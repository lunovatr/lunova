import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  WeeklyAvailability,
  WeeklyAvailabilityPayload,
  WeekdayLabels,
} from "../types";
import {
  getMyWeeklyAvailability,
  saveMyWeeklyAvailability,
  deleteMyWeeklyAvailability,
} from "../api";
import { useTheme } from "@/context/theme-provider";

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
];

interface WeeklyAvailabilityCalendarProps {
  weeklyAvailability: WeeklyAvailability[] | (WeeklyAvailability | null)[][];
}

export function WeeklyAvailabilityCalendar({ weeklyAvailability }: WeeklyAvailabilityCalendarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<WeeklyAvailability[]>([]);
  const [pendingAdditions, setPendingAdditions] = useState<{ day: number; time: string }[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<{ day: number; time: string }[]>([]);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!weeklyAvailability) return;
    let cleaned: WeeklyAvailability[] = [];
    if (Array.isArray(weeklyAvailability[0])) {
      cleaned = (weeklyAvailability as (WeeklyAvailability | null)[][])
        .flat()
        .filter(Boolean) as WeeklyAvailability[];
    } else {
      cleaned = (weeklyAvailability as WeeklyAvailability[]).filter(Boolean);
    }
    setLocalAvailability(cleaned);
  }, [weeklyAvailability]);

  const findSlotsForTime = (dayOfWeek: number, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const timeInMinutes = hour * 60 + minute;

    return localAvailability.filter((slot) => {
      if (!slot.is_active || slot.day_of_week !== dayOfWeek) return false;
      const [startHour, startMinute] = slot.start_time.split(":").map(Number);
      const [endHour, endMinute] = slot.end_time.split(":").map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      return timeInMinutes >= startTime && timeInMinutes < endTime;
    });
  };

  const getCellColor = (dayOfWeek: number, time: string) => {
    const slots = findSlotsForTime(dayOfWeek, time);

    if (pendingAdditions.some((s) => s.day === dayOfWeek && s.time === time))
      return isDark ? "bg-blue-700" : "bg-blue-500";

    if (pendingDeletions.some((s) => s.day === dayOfWeek && s.time === time))
      return isDark ? "bg-red-700" : "bg-red-500";

    if (slots.length > 0)
      return isDark ? "bg-teal-700" : "bg-green-500";

    return isDark ? "bg-neutral-800 border-gray-700" : "bg-gray-100 border-gray-200";
  };

  const toggleTimeSlot = (dayOfWeek: number, time: string) => {
    const slots = findSlotsForTime(dayOfWeek, time);

    if (pendingAdditions.some((s) => s.day === dayOfWeek && s.time === time)) {
      setPendingAdditions((prev) =>
        prev.filter((s) => !(s.day === dayOfWeek && s.time === time))
      );
      return;
    }

    if (pendingDeletions.some((s) => s.day === dayOfWeek && s.time === time)) {
      setPendingDeletions((prev) =>
        prev.filter((s) => !(s.day === dayOfWeek && s.time === time))
      );
      return;
    }

    if (slots.length > 0) {
      setPendingDeletions((prev) => [...prev, { day: dayOfWeek, time }]);
    } else {
      setPendingAdditions((prev) => [...prev, { day: dayOfWeek, time }]);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingAdditions.length && !pendingDeletions.length)
      return toast.info("Değişiklik yok");

    try {
      setIsSaving(true);

      if (pendingAdditions.length) {
        const additions: WeeklyAvailabilityPayload[] = pendingAdditions.map((s) => ({
          day_of_week: s.day,
          day_display: WeekdayLabels[s.day as keyof typeof WeekdayLabels],
          start_time: `${s.time}:00`,
          end_time: `${String(Number(s.time.split(":")[0]) + 1).padStart(2, "0")}:00:00`,
          service: 1,
          is_active: true,
          slot_minutes: 60,
          capacity: 1,
        }));
        await saveMyWeeklyAvailability(additions);
      }

      if (pendingDeletions.length) {
        const deletions = pendingDeletions.map((s) => ({
          day_of_week: s.day,
          start_time: `${s.time}:00`,
          end_time: `${String(Number(s.time.split(":")[0]) + 1).padStart(2, "0")}:00:00`,
          service: 1,
        }));
        await deleteMyWeeklyAvailability({ availabilities: deletions });
      }

      const updatedData = await getMyWeeklyAvailability();
      setLocalAvailability(updatedData.filter(Boolean));
      setPendingAdditions([]);
      setPendingDeletions([]);
      toast.success("Müsaitlik takvimi güncellendi!");
    } catch (err: any) {
      toast.error(err.message || "İşlem sırasında hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-colors w-full lg:max-w-2xl ${ 
        isDark
          ? "bg-neutral-900 border-gray-700 text-gray-100"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      {/* 8 sütunlu grid yapısı korunuyor: Zaman etiketi (1) + Günler (7) */}
      <div className="grid grid-cols-8 gap-1 text-sm">
        
        {/* --- Başlık Satırı --- */}
        <div className="pt-2"></div> {/* Köşe boş */}
        
        {/* Gün Başlıkları - Mobil Görünümde Kısaltma Uygulanıyor */}
        {Object.entries(WeekdayLabels).map(([dayIndex, dayName]) => {
          // Kısaltılmış gün adını WeekdayLabels'ın yapısına göre manuel olarak oluşturuyoruz.
          // Örneğin: "Pazartesi" -> "Pzt"
          const shortName = dayName.length > 3 ? dayName.substring(0, 3) : dayName;

          return (
            <div 
              key={dayIndex} 
              className="font-bold text-center pb-2 border-b-2 border-gray-500"
            >
              {/* Mobil (varsayılan) görünümde kısaltma, Sm (Küçük) ve üzeri ekranlarda tam ad */}
              <span className="sm:hidden">{shortName}</span>
              <span className="hidden sm:inline">{dayName}</span>
            </div>
          );
        })}

        {/* --- Zaman Çizelgesi ve Slotlar --- */}
        {/* timeSlots.map'ten önceki kısmı değiştirmeden devam ediyoruz. */}
        {timeSlots.slice(0, -1).map((time) => (
          <div key={time} className="contents">
            
            {/* Saat Etiketi */}
            <div 
                className="font-bold text-right pr-2 text-xs h-6 leading-6"
                style={{ height: '2rem', marginTop: '-1rem' }} 
            >
                {time}
            </div>

            {/* Takvim Slotları */}
            {Object.entries(WeekdayLabels).map(([dayIndex]) => (
              <div
                key={`${dayIndex}-${time}`}
                className={`h-8 border border-opacity-30 cursor-pointer hover:opacity-80 transition-all duration-200 ${getCellColor(
                    Number(dayIndex),
                    time
                )}`}
                onClick={() => toggleTimeSlot(Number(dayIndex), time)}
              ></div>
            ))}
          </div>
        ))}
        
        {/* --- Bitiş Saati Etiketi --- */}
        <div 
          className="font-bold text-right pr-2 text-xs h-6 leading-6" 
          style={{ height: '1rem' }}
        >
            {timeSlots[timeSlots.length - 1]}
        </div>
        
        {/* Son saat etiketinin yanındaki boşluklar */}
        {Object.entries(WeekdayLabels).map((_, idx) => (
             <div key={`end-spacer-${idx}`} className="h-0"></div> 
        ))}


        {/* --- Kaydet Butonu --- */}
        <div className="col-span-8 flex justify-end mt-4">
          <button
            onClick={handleApplyChanges}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-white font-medium transition-colors ${
              isSaving
                ? isDark
                  ? "bg-gray-700"
                  : "bg-gray-400"
                : isDark
                ? "bg-blue-700 hover:bg-blue-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
