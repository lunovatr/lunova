import { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface AvailabilitySlot {
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

interface SelectedSlot {
  date: string;
  time: string;
  slotId: number;
}

interface AvailabilitySlotPickerProps {
  expertId: number;
  onSlotSelect: (slot: SelectedSlot) => void;
  selectedSlot: SelectedSlot | null;
}

const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const AvailabilitySlotPicker = ({ expertId, onSlotSelect, selectedSlot }: AvailabilitySlotPickerProps) => {
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/availability/expert/${expertId}/`);
      const data = await response.json();
      setAvailableSlots(data.filter((slot: AvailabilitySlot) => slot.is_active));
    } catch (error) {
      console.error('Müsaitlik verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (time: string): string => {
    return time.substring(0, 5);
  };

  const generateTimeSlots = (startTime: string, endTime: string, slotMinutes: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}:00`;
      slots.push(timeStr);
      
      currentMin += slotMinutes;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
    
    return slots;
  };

  const getSlotsForDay = (date: Date): { slot: AvailabilitySlot; times: string[] }[] => {
    const dayOfWeek = date.getDay();
    const daySlots = availableSlots.filter(slot => slot.day_of_week === dayOfWeek);
    
    return daySlots.map(slot => ({
      slot,
      times: generateTimeSlots(slot.start_time, slot.end_time, slot.slot_minutes)
    }));
  };

  const handleSlotClick = (date: Date, time: string, slotId: number) => {
    onSlotSelect({
      date: formatDate(date),
      time: time,
      slotId: slotId
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const weekDates = getWeekDates();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          aria-label="Önceki hafta"
          title="Önceki hafta"
        >
          <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" focusable="false" />
        </button>
        <h3 className="text-lg font-semibold">
          {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
        </h3>
        <button
          onClick={() => navigateWeek('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          aria-label="Sonraki hafta"
          title="Sonraki hafta"
        >
          <ChevronRightIcon className="w-5 h-5" aria-hidden="true" focusable="false" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const daySlots = getSlotsForDay(date);
          const isToday = formatDate(date) === formatDate(new Date());
          const isPast = date < new Date() && !isToday;

          return (
            <div
              key={index}
              className={`border rounded-lg p-3 ${
                isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <div className="text-center mb-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {daysOfWeek[date.getDay()]}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {date.getDate()}
                </p>
              </div>

              <div className="space-y-2">
                {daySlots.length === 0 ? (
                  <p className="text-xs text-center text-gray-400">Müsait değil</p>
                ) : (
                  daySlots.map((slotGroup, slotIndex) => (
                    <div key={slotIndex} className="space-y-1">
                      {slotGroup.times.map((time, timeIndex) => {
                        const isSelected = 
                          selectedSlot?.date === formatDate(date) && 
                          selectedSlot?.time === time;

                        return (
                          <button
                            key={timeIndex}
                            disabled={isPast}
                            onClick={() => handleSlotClick(date, time, slotGroup.slot.id)}
                            className={`w-full px-2 py-1.5 text-xs rounded transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : isPast
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            }`}
                          >
                            {formatTime(time)}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilitySlotPicker;