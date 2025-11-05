import React, { useEffect, useState } from "react";
import {
  MyAvailabilityCalendarResponse,
  DailyAvailability,
  WeeklyAvailability,
  AvailabilityException,
  WeekdayLabels,
} from "../types";
import { useTheme } from "@/context/theme-provider";

// Saat aralıklarını saat başı olarak tutmaya devam ediyoruz, ancak görsel olarak aralığa denk gelecek.
const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
];

interface CombinedCalendarProps {
  calendar: MyAvailabilityCalendarResponse | null;
}

interface GridCell {
  type: "weekly" | "exception_add" | "exception_cancel" | "empty";
  service_name?: string | null;
}

export const CombinedCalendar: React.FC<CombinedCalendarProps> = ({ calendar }) => {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Ekstra: Gün adları ve tarihlerini tutmak için state
  const [dayHeaders, setDayHeaders] = useState<string[]>([]);
  
  useEffect(() => {
    if (!calendar) return;

    const newGrid: GridCell[][] = timeSlots.map(() =>
      Array(calendar.calendar.length).fill({ type: "empty" })
    );

    // Gün başlıklarını (gün adı ve tarih) oluştur
    const headers = calendar.calendar.map((day: DailyAvailability) => {
        const dateObj = new Date(day.date);
        const weekdayIndex = (dateObj.getDay() + 6) % 7; // Pazartesi'yi hafta başı yapar.
        // Pazartesi (JS’de 1) bizim sistemde “Salı (1)” olarak etiketleniyor. bunu düzelttik.
        const dayLabel = WeekdayLabels[weekdayIndex as keyof typeof WeekdayLabels];
        const date = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        return `${dayLabel} (${date})`;
    });
    setDayHeaders(headers);


    calendar.calendar.forEach((day: DailyAvailability, day_idx: number) => {
      // dayIndex'i kullanmak yerine, map döngüsündeki sırasını (day_idx) kullanacağız
      const mappedIndex = day_idx; 

      // Haftalık uygunluk
      const weeklySlots: WeeklyAvailability[] = day.weekly_availability || [];
      weeklySlots.forEach((slot) => {
        const startTime = slot.start_time.slice(0, 5);
        const endTime = slot.end_time.slice(0, 5);

        timeSlots.forEach((time, timeIndex) => {
          if (time >= startTime && time < endTime) {
            newGrid[timeIndex][mappedIndex] = {
              type: "weekly",
              service_name: slot.service_name ?? null,
            };
          }
        });
      });

      // İstisnalar
      const exceptions: AvailabilityException[] = day.exceptions || [];
      exceptions.forEach((exc) => {
        const startTime = exc.start_time?.slice(0, 5) ?? "00:00";
        const endTime = exc.end_time?.slice(0, 5) ?? "23:59";

        timeSlots.forEach((time, timeIndex) => {
          if (time >= startTime && time < endTime) {
            if (exc.exception_type === "cancel") {
                // İptal (Cancel) istisnaları, haftalık slotların üzerine yazar
                newGrid[timeIndex][mappedIndex] = {
                    type: "exception_cancel",
                    service_name: null,
                };
            } else if (exc.exception_type === "add") {
                // Ekleme (Add) istisnaları, boş slotları doldurur
                // Eğer burada "weekly" slot varsa, mantıken onu ezmemeli, 
                // ancak mevcut kodda exception_add'in weekly'i ezdiği varsayılmıştır. 
                // Eğer logic eklenen slotun sadece boş yere eklenmesi ise bu kısım biraz daha kompleks olabilir.
                // Mevcut mantıkla devam ediyoruz:
                newGrid[timeIndex][mappedIndex] = {
                    type: "exception_add",
                    service_name: exc.service_name ?? null,
                };
            }
          }
        });
      });
    });

    setGrid(newGrid);
  }, [calendar]);


  // Calendar rendering
return (
  <div
    className={`p-4 rounded-xl border transition-colors w-full lg:max-w-2xl ${
      isDark
        ? "bg-neutral-900 border-gray-700 text-gray-100"
        : "bg-white border-gray-200 text-gray-900"
    }`}
  >
    <div className="grid" style={{ gridTemplateColumns: `auto repeat(${calendar?.calendar.length ?? 7}, 1fr)` }}>
      
      {/* Başlık Satırı */}
      <div className="pt-2"></div> {/* Köşe boş */}
      {dayHeaders.map((header, idx) => {
          const [dayLabel, date] = header.split(' ');
          // Gün adını kısalt (ilk 3 karakter)
          const shortDayLabel = dayLabel.length > 3 ? dayLabel.substring(0, 3) : dayLabel;
          return (
              <div key={idx} className="font-bold text-center pb-2 border-b-2 border-gray-500">
                  {/* Mobil görünümde kısaltma, sm ve üzeri ekranlarda tam ad */}
                  <div>
                    <span className="sm:hidden">{shortDayLabel}</span>
                    <span className="hidden sm:inline">{dayLabel}</span>
                  </div>
                  <div className="text-xs font-normal opacity-75">{date.replace(/[\(\)]/g, '')}</div> 
              </div>
          );
      })}
      
      {/* Zaman Çizelgesi ve Slotlar */}
      {timeSlots.slice(0, -1).map((time, timeIndex) => (
        <React.Fragment key={time}>
          {/* Saat Etiketi */}
          <div 
              className="font-bold text-right pr-2 text-xs h-6 leading-6"
              style={{ height: '3rem', marginTop: '-1.5rem' }}
          >
              {time}
          </div>
          
          {/* Takvim Slotları */}
          {grid[timeIndex]?.map((cell, dayIndex) => {
            let bgColor =
              isDark ? "bg-neutral-800 border-gray-700" : "bg-gray-100 border-gray-200";

            if (cell.type === "weekly") {
              bgColor = isDark ? "bg-green-700 border-green-600" : "bg-green-400 border-green-500";
            } else if (cell.type === "exception_add") {
              bgColor = isDark ? "bg-emerald-800 border-emerald-700" : "bg-emerald-500 border-emerald-600";
            } else if (cell.type === "exception_cancel") {
              bgColor = isDark ? "bg-red-800 border-red-700" : "bg-red-500 border-red-600";
            }
            return (
              <div
                key={`${dayIndex}-${timeIndex}`}
                className={`h-10 border border-opacity-30 ${bgColor} transition-all duration-200 relative`}
                title={cell.service_name ?? ""}
              >
                {/* Hizmet adını hücre içinde göstermek isterseniz */}
                {/* {cell.service_name && <span className={`absolute top-1 left-1 text-xs ${textColor}`}>{cell.service_name}</span>} */}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      
      {/* Bitiş Saati Etiketi */}
      <div className="font-bold text-right pr-2 text-xs h-6 leading-6" style={{ height: '1.5rem' }}>
          {timeSlots[timeSlots.length - 1]}
      </div>
      
      {/* Son saat etiketinin yanındaki boşluklar */}
      {Array(calendar?.calendar.length ?? 7).fill(null).map((_, idx) => (
           <div key={`end-spacer-${idx}`} className="h-0"></div>
      ))}
    </div>
  </div>
);};