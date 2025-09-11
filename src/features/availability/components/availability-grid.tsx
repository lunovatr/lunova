import { useState } from 'react'
import { toast } from 'sonner'
import { AvailabilitySlot, daysOfWeek, timeSlots } from '../types'
import { saveMyAvailabilityWithCookieHeader } from '../api'

interface AvailabilityGridProps {
  availability: AvailabilitySlot[]
  setAvailability: (availability: AvailabilitySlot[]) => void
  originalAvailability: AvailabilitySlot[]
  setOriginalAvailability: (availability: AvailabilitySlot[]) => void
}

export function AvailabilityGrid({ 
  availability, 
  setAvailability, 
  originalAvailability,
  setOriginalAvailability 
}: AvailabilityGridProps) {
  const [isSaving, setIsSaving] = useState(false)

  const isAvailable = (dayOfWeek: number, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;

    for (const slot of availability) {
      if (slot.day_of_week === dayOfWeek) {
        const [startHour, startMinute] = slot.start_time.split(':').map(Number);
        const startTimeInMinutes = startHour * 60 + startMinute;

        const [endHour, endMinute] = slot.end_time.split(':').map(Number);
        const endTimeInMinutes = endHour * 60 + endMinute;

        if (timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes) {
          return true;
        }
      }
    }
    return false;
  }

  const toggleTimeSlot = (dayOfWeek: number, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;
    const endTimeInMinutes = timeInMinutes + 30; // 30-minute slot
    
    const endTime = `${String(Math.floor(endTimeInMinutes / 60)).padStart(2, '0')}:${String(endTimeInMinutes % 60).padStart(2, '0')}:00`;
    const startTime = `${time}:00`;

    // Check if this time slot is currently available
    const currentlyAvailable = isAvailable(dayOfWeek, time);
    
    if (currentlyAvailable) {
      // Remove or split existing slot
      const updatedAvailability = availability.reduce((acc: AvailabilitySlot[], slot) => {
        if (slot.day_of_week !== dayOfWeek) {
          acc.push(slot);
          return acc;
        }

        const [slotStartHour, slotStartMinute] = slot.start_time.split(':').map(Number);
        const slotStartInMinutes = slotStartHour * 60 + slotStartMinute;
        const [slotEndHour, slotEndMinute] = slot.end_time.split(':').map(Number);
        const slotEndInMinutes = slotEndHour * 60 + slotEndMinute;

        // If the clicked time is within this slot
        if (timeInMinutes >= slotStartInMinutes && timeInMinutes < slotEndInMinutes) {
          // Split the slot if necessary
          if (slotStartInMinutes < timeInMinutes) {
            // Add the part before the clicked time
            acc.push({
              ...slot,
              end_time: startTime
            });
          }
          if (endTimeInMinutes < slotEndInMinutes) {
            // Add the part after the clicked time
            acc.push({
              id: -Math.abs(Date.now() + Math.random()), // Negative ID for temporary slots
              day_of_week: dayOfWeek,
              start_time: endTime,
              end_time: slot.end_time
            });
          }
        } else {
          acc.push(slot);
        }
        return acc;
      }, []);
      
      setAvailability(updatedAvailability);
    } else {
      // Add new 30-minute slot
      const newSlot: AvailabilitySlot = {
        id: -Math.abs(Date.now() + Math.random()), // Negative ID for temporary slots
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime
      };
      
      // Merge with adjacent slots if possible
      const mergedAvailability = mergeAdjacentSlots([...availability, newSlot]);
      setAvailability(mergedAvailability);
    }
  }

  const mergeAdjacentSlots = (slots: AvailabilitySlot[]) => {
    const sortedSlots = slots.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      const [aHour, aMinute] = a.start_time.split(':').map(Number);
      const [bHour, bMinute] = b.start_time.split(':').map(Number);
      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
    });

    const merged: AvailabilitySlot[] = [];
    
    for (const slot of sortedSlots) {
      if (merged.length === 0) {
        merged.push(slot);
        continue;
      }

      const lastSlot = merged[merged.length - 1];
      
      // Check if slots are on the same day and adjacent
      if (lastSlot.day_of_week === slot.day_of_week && lastSlot.end_time === slot.start_time) {
        // Merge slots
        lastSlot.end_time = slot.end_time;
      } else {
        merged.push(slot);
      }
    }

    return merged;
  }

  const handleTimeChange = (id: number, field: 'start_time' | 'end_time', value: string) => {
    const updatedAvailability = availability.map(slot => 
      slot.id === id ? { ...slot, [field]: `${value}:00` } : slot
    );
    setAvailability(updatedAvailability);
  };

  const addSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      id: -Math.abs(Date.now()), // Negative ID for temporary slots
      day_of_week: dayOfWeek,
      start_time: '09:00:00',
      end_time: '17:00:00',
    };
    setAvailability([...availability, newSlot]);
  };

  const removeSlot = (id: number) => {
    const updatedAvailability = availability.filter(slot => slot.id !== id);
    setAvailability(updatedAvailability);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveMyAvailabilityWithCookieHeader(availability, originalAvailability);
      toast.success('Müsaitlik takvimi başarıyla kaydedildi!');
      setOriginalAvailability(JSON.parse(JSON.stringify(availability)));
      
      // Refresh the page after successful save
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Wait 1.5 seconds to show the success toast
      
    } catch (error) {
      console.error('Failed to save availability:', error);
      toast.error(error instanceof Error ? error.message : 'Müsaitlik takvimini kaydederken hata oluştu.');
      setIsSaving(false); // Only reset loading state on error
    }
    // Note: Don't reset setIsSaving(false) on success since page will reload
  };

  const handleCancel = () => {
    setAvailability(JSON.parse(JSON.stringify(originalAvailability)));
    toast.info('Değişiklikler geri alındı.');
  };

  const groupedByDay = daysOfWeek.map(day => ({
    ...day,
    slots: availability.filter(slot => slot.day_of_week === day.day_of_week),
  }));

  return (
    <div className="p-4 flex gap-4">
      <div className="w-1/3 p-4 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Set Availability</h2>
        <div className="space-y-4">
          {groupedByDay.map(day => (
            <div key={day.day_of_week}>
              <h3 className="font-bold">{day.name}</h3>
              {day.slots.map(slot => (
                <div key={slot.id} className="flex items-center gap-2 mt-2">
                  <input 
                    type="time" 
                    value={slot.start_time.substring(0, 5)} 
                    onChange={(e) => handleTimeChange(slot.id, 'start_time', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <span>-</span>
                  <input 
                    type="time" 
                    value={slot.end_time.substring(0, 5)} 
                    onChange={(e) => handleTimeChange(slot.id, 'end_time', e.target.value)}
                    className="border rounded px-2 py-1"
                  />
                  <button onClick={() => removeSlot(slot.id)} className="text-red-500">Remove</button>
                </div>
              ))}
              <button onClick={() => addSlot(day.day_of_week)} className="text-blue-500 mt-2">+ Add slot</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button 
            onClick={handleCancel} 
            disabled={isSaving}
            className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            İptal
          </button>
        </div>
      </div>
      <div className="w-2/3">
        <h1 className="text-2xl font-bold mb-4">Availability Preview</h1>
        <div className="grid grid-cols-8 gap-1 text-sm">
          <div className="font-bold"></div>
          {daysOfWeek.map(day => (
            <div key={day.day_of_week} className="font-bold text-center">{day.name}</div>
          ))}
          {timeSlots.map(time => (
            <>
              <div key={time} className="font-bold text-right pr-2">{time}</div>
              {daysOfWeek.map(day => (
                <div
                  key={`${day.day_of_week}-${time}`}
                  className={`h-6 border cursor-pointer hover:opacity-80 transition-opacity ${isAvailable(day.day_of_week, time) ? 'bg-green-500' : 'bg-red-500'}`}
                  onClick={() => toggleTimeSlot(day.day_of_week, time)}
                  title={`Click to ${isAvailable(day.day_of_week, time) ? 'remove' : 'add'} availability for ${day.name} at ${time}`}
                ></div>
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}