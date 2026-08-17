// src/components/ExpertAvailability.tsx

import React, { useCallback, useEffect, useState } from 'react';
import api from "../../lib/api";
import AppointmentForm from './AppointmentForm';
import { 
    daysOfWeek,
    getDayOfWeek 
} from './Request'; 
import { useToast } from "../../hooks/useToast";

// --- TİP TANIMLAMALARI ---

interface ProcessedSlot extends AvailabilityDetail {
    slot_id: string; 
    unique_key: string; 
}

export interface AvailabilityDetail {
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
    date: string; 
    exception_type?: string;
    note?: string;
}

interface CalendarDay {
    date: string;
    weekly_availability: AvailabilityDetail[];
    exceptions: ExceptionDetail[];
    is_available: boolean;
}

interface ExceptionDetail {
    id: number;
    expert: number;
    expert_name: string;
    date: string;
    exception_type: string;
    start_time: string;
    end_time: string;
    service: number;
    service_name: string;
    note: string;
    created_at: string;
}

interface AvailabilityResponse {
    expert_id: number;
    start_date: string;
    end_date: string;
    calendar: CalendarDay[];
}

interface ExpertAvailabilityProps {
    expert_user_id: number;
    start_date: string;
    end_date: string;
}

// GÜNCELLENDİ: Slotları daima 1 saatlik dilimlere böler
function splitAvailabilityIntoSlots(slot: AvailabilityDetail): AvailabilityDetail[] {
    const slots: AvailabilityDetail[] = [];
    
    const [startH, startM] = slot.start_time.split(":").map(Number);
    const [endH, endM] = slot.end_time.split(":").map(Number);

    let current = new Date(`${slot.date}T${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}:00`);
    const end = new Date(`${slot.date}T${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}:00`);

    // --- DEĞİŞİKLİK BURADA ---
    // Hizmet süresinden bağımsız olarak slot süresini 60 dakika (1 saat) sabitliyoruz.
    const FIXED_DURATION_MINUTES = 60; 
    const slotDurationMs = FIXED_DURATION_MINUTES * 60 * 1000;

    while (current.getTime() < end.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + slotDurationMs);

        // Eğer oluşturulacak 1 saatlik slot, müsaitlik bitiş süresini aşıyorsa döngüyü kır.
        // Örneğin: Müsaitlik 16:00-16:30 ise, 1 saatlik slot sığmayacağı için hiç slot oluşmaz.
        if (slotEnd.getTime() > end.getTime()) {
            break; 
        }

        const startHh = slotStart.getHours().toString().padStart(2, "0");
        const startMm = slotStart.getMinutes().toString().padStart(2, "0");
        const endHh = slotEnd.getHours().toString().padStart(2, "0");
        const endMm = slotEnd.getMinutes().toString().padStart(2, "0");

        slots.push({
            ...slot,
            start_time: `${startHh}:${startMm}`,
            end_time: `${endHh}:${endMm}`,
            // Görünen süreyi de 60 dk olarak güncelliyoruz
            slot_minutes: FIXED_DURATION_MINUTES, 
        });

        // Bir sonraki slot için zamanı 1 saat ileri al
        current.setTime(slotEnd.getTime()); 
    }
    
    return slots;
}

// --- ANA BİLEŞEN ---

const ExpertAvailability: React.FC<ExpertAvailabilityProps> = ({
    expert_user_id,
    start_date,
    end_date,
}) => {
    const { showToast } = useToast();

    // State Yönetimi
    const [loading, setLoading] = useState<boolean>(false);
    const [slots, setSlots] = useState<ProcessedSlot[]>([]);
    
    // Seçim State'leri
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [selectedSlotDetails, setSelectedSlotDetails] = useState<ProcessedSlot | null>(null);
    
    // Notlar
    const [notes, setNotes] = useState("");

    // Veri Çekme ve İşleme Fonksiyonu
    const fetchAvailability = useCallback(async () => {
        if (!start_date || !end_date) return;

        setLoading(true);
        try {
            const res = await api.get<AvailabilityResponse>(`/api/v1/availability/`, {
                params: {
                    expert_user_id: expert_user_id,
                    start_date,
                    end_date,
                },
            });

            const { calendar } = res.data;

            // 1. Haftalık Müsaitlikleri İşle
            const weeklySlots: ProcessedSlot[] = calendar.flatMap((day: CalendarDay) => {
                return day.weekly_availability.flatMap((slot) => {
                    const slotWithDate = { ...slot, date: day.date };
                    // splitAvailabilityIntoSlots artık sabit 60dk kullanıyor
                    return splitAvailabilityIntoSlots(slotWithDate).map((splitSlot, index) => ({
                        ...splitSlot,
                        slot_id: `weekly-${splitSlot.id}-${index}`,
                        unique_key: `weekly-${splitSlot.id}-${index}-${splitSlot.date}-${splitSlot.start_time}`,
                        exception_type: undefined
                    }));
                });
            });

            // 2. İstisnaları (Exceptions) Al
            const exceptions = calendar.flatMap((day) => day.exceptions);

            // 3. "Cancel" İstisnalarını Uygula
            const availableSlots = weeklySlots.filter((slot) => {
                const cancelExceptions = exceptions.filter(
                    (exc) => exc.date === slot.date && exc.exception_type === "cancel"
                );

                const isCancelled = cancelExceptions.some((exc) => {
                    // İptal edilen aralığın başlangıç/bitiş saatlerini kontrol et
                    return (
                        slot.start_time < exc.end_time.substring(0, 5) &&
                        slot.end_time > exc.start_time.substring(0, 5)
                    );
                });

                return !isCancelled;
            });

            // 4. "Add" İstisnalarını Ekle
            const addSlots: ProcessedSlot[] = exceptions
                .filter((exc) => exc.exception_type === "add")
                .flatMap((exception) => {
                    const exceptionAsSlot: AvailabilityDetail = {
                        ...exception,
                        day_of_week: getDayOfWeek(exception.date),
                        day_display: daysOfWeek[getDayOfWeek(exception.date)],
                        slot_minutes: 0, // splitAvailabilityIntoSlots bunu 60 yapacak
                        capacity: 1,
                        is_active: true,
                        date: exception.date
                    };
                    return splitAvailabilityIntoSlots(exceptionAsSlot).map((splitSlot, index) => ({
                        ...splitSlot,
                        slot_id: `exception-${splitSlot.id}-${index}`,
                        unique_key: `exception-${splitSlot.id}-${index}-${splitSlot.date}-${splitSlot.start_time}`,
                        exception_type: "add"
                    }));
                });

            // 5. Birleştir ve Sırala
            const finalSlots = [...availableSlots, ...addSlots].sort((a, b) => {
                const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateComparison !== 0) return dateComparison;
                return a.start_time.localeCompare(b.start_time);
            });

            setSlots(finalSlots);

        } catch (error) {
            showToast("Müsaitlik verisi yüklenirken hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    }, [expert_user_id, start_date, end_date, showToast]);

    // OTOMATİK YÜKLEME: Bileşen mount olduğunda veriyi çek
    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    // Slot Seçimi
    const handleSlotClick = (slot: ProcessedSlot) => {
        if (selectedSlotId === slot.slot_id) {
            setSelectedSlotId(null);
            setSelectedSlotDetails(null);
        } else {
            setSelectedSlotId(slot.slot_id);
            setSelectedSlotDetails(slot);
            showToast(`${slot.start_time} - ${slot.end_time} seçildi.`, "success");
        }
    };

    return (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3 animate-fade-in">
            {loading ? (
                <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            ) : slots.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot) => {
                        const isSelected = selectedSlotId === slot.slot_id;

                        return (
                            <div
                                key={slot.unique_key}
                                onClick={() => handleSlotClick(slot)}
                                className={`cursor-pointer rounded-md border p-3 transition-all duration-200 ${
                                    isSelected
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500"
                                        : "border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-900/30 dark:border-gray-700 dark:hover:bg-gray-800"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {slot.start_time} - {slot.end_time}
                                    </span>
                                    {/* Kullanıcıya daima 60 dk veya 1 Saat olarak görünür */}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                        1 Saat
                                    </span>
                                </div>
                                <p className={`text-xs mt-1 ${isSelected ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                                    {isSelected ? "✓ Seçildi" : "Seçmek için tıklayın"}
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                       Bu tarihte uygun saat bulunmamaktadır.
                    </p>
                </div>
            )}

            {/* --- RANDEVU FORMU --- */}
            {selectedSlotDetails && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 animate-slide-down">
                    <AppointmentForm
                        expertId={expert_user_id}
                        selectedDate={selectedSlotDetails.date}
                        startTime={selectedSlotDetails.start_time}
                        endTime={selectedSlotDetails.end_time}
                        slotMinutes={60} 
                        notes={notes}
                        setNotes={setNotes}
                        navigate={() => {}} 
                    />
                </div>
            )}
        </div>
    );
};

export default ExpertAvailability;