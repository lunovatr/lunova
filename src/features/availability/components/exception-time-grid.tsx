import { useState } from 'react'
import { toast } from 'sonner'
import { AvailabilityException, AvailabilitySlot, daysOfWeek, timeSlots } from '../types'
import { createAvailabilityException } from '../api'

interface ExceptionTimeGridProps {
  selectedWeek: Date[]
  weeklyAvailability: AvailabilitySlot[]
  weekAvailability: any[] // Actual week data including exceptions
  exceptions: AvailabilityException[]
  setExceptions: (exceptions: AvailabilityException[]) => void
}

interface TempException {
  date: string
  start_time: string
  end_time: string
  exception_type: 'add' | 'cancel'
  dayOfWeek: number
}

export function ExceptionTimeGrid({ 
  selectedWeek, 
  weeklyAvailability, 
  weekAvailability,
  // exceptions, 
  // setExceptions 
}: ExceptionTimeGridProps) {
  const [tempExceptions, setTempExceptions] = useState<TempException[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Format date as YYYY-MM-DD (avoiding timezone issues)
  const formatDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if user is actually available at this specific date and time (including exceptions)
  const isActuallyAvailable = (date: string, time: string) => {
    // Parse the weekAvailability data structure from the backend
    if (!weekAvailability || !(weekAvailability as any).calendar || (weekAvailability as any).calendar.length === 0) { // typescript bypass
      // Fallback to general weekly availability if no specific week data
      const dateObj = new Date(date)
      const dayOfWeek = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1 // Convert to Monday=0 format
      return isNormallyAvailable(dayOfWeek, time)
    }

    // Find the specific day in the calendar data
    const dayData = (weekAvailability as any).calendar.find((day: any) => day.date === date) // typescript bypass
    
    if (!dayData) {
      return false // If no data for this date, assume unavailable
    }

    // If there are exceptions for this day, we need to check them
    if (dayData.exceptions && dayData.exceptions.length > 0) {
      const [hour, minute] = time.split(':').map(Number)
      const timeInMinutes = hour * 60 + minute

      for (const exception of dayData.exceptions) {
        const [startHour, startMinute] = exception.start_time.split(':').map(Number)
        const startTimeInMinutes = startHour * 60 + startMinute

        const [endHour, endMinute] = exception.end_time.split(':').map(Number)
        const endTimeInMinutes = endHour * 60 + endMinute

        // Check if current time falls within an exception
        if (timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes) {
          // If it's an "add" exception, user is available
          // If it's a "cancel" exception, user is not available
          return exception.exception_type === 'add'
        }
      }
    }

    // If no exceptions apply, check weekly_availability
    if (dayData.weekly_availability) {
      const [hour, minute] = time.split(':').map(Number)
      const timeInMinutes = hour * 60 + minute

      const [startHour, startMinute] = (dayData.weekly_availability as any).start_time.split(':').map(Number) // typescript bypass
      const startTimeInMinutes = startHour * 60 + startMinute

      const [endHour, endMinute] = (dayData.weekly_availability as any).end_time.split(':').map(Number) // typescript bypass
      const endTimeInMinutes = endHour * 60 + endMinute

      return timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes
    }

    // If no weekly_availability data, the expert is NOT available at this time
    // Only show as available if there are "add" exceptions
    return false
  }

  // Check if user normally works at this time (based on weekly schedule)
  const isNormallyAvailable = (dayOfWeek: number, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;

    for (const slot of weeklyAvailability) {
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

  // Check if there's a temporary exception for this time
  const hasException = (date: string, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;
    const endTimeInMinutes = timeInMinutes + 30;
    
    const startTime = `${time}:00`;
    const endTime = `${String(Math.floor(endTimeInMinutes / 60)).padStart(2, '0')}:${String(endTimeInMinutes % 60).padStart(2, '0')}:00`;

    return tempExceptions.find(exc => 
      exc.date === date && 
      exc.start_time === startTime && 
      exc.end_time === endTime
    )
  }

  // Check if there's an existing exception from backend for this time
  const hasBackendException = (date: string, time: string) => {
    if (!weekAvailability || !(weekAvailability as any).calendar || (weekAvailability as any).calendar.length === 0) { // typescript bypass
      return null
    }

    const dayData = (weekAvailability as any).calendar.find((day: any) => day.date === date) // typescript bypass
    if (!dayData || !dayData.exceptions || dayData.exceptions.length === 0) {
      return null
    }

    const [hour, minute] = time.split(':').map(Number)
    const timeInMinutes = hour * 60 + minute

    for (const exception of dayData.exceptions) {
      const [startHour, startMinute] = exception.start_time.split(':').map(Number)
      const startTimeInMinutes = startHour * 60 + startMinute

      const [endHour, endMinute] = exception.end_time.split(':').map(Number)
      const endTimeInMinutes = endHour * 60 + endMinute

      if (timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes) {
        return exception
      }
    }

    return null
  }

  // Get the CSS class for a time slot
  const getSlotClass = (dayOfWeek: number, date: string, time: string) => {
    const tempException = hasException(date, time)
    const backendException = hasBackendException(date, time)
    const normallyAvailable = isNormallyAvailable(dayOfWeek, time)
    const actuallyAvailable = isActuallyAvailable(date, time)

    // Priority: temp exceptions (new unsaved changes)
    if (tempException) {
      if (tempException.exception_type === 'add') {
        return 'bg-blue-500' // Blue for temp add exceptions
      } else {
        return 'bg-orange-500' // Orange for temp cancel exceptions
      }
    }

    // Then check backend exceptions (existing saved exceptions)
    if (backendException) {
      if (backendException.exception_type === 'add') {
        return 'bg-blue-400 border-2 border-blue-600' // Slightly different blue for saved add exceptions
      } else {
        return 'bg-orange-400 border-2 border-orange-600' // Slightly different orange for saved cancel exceptions
      }
    }

    // Use actual availability if we have week data, otherwise fall back to normal availability
    const hasWeekData = weekAvailability && (weekAvailability as any).calendar && (weekAvailability as any).calendar.length > 0 // typescript bypass
    const available = hasWeekData ? actuallyAvailable : normallyAvailable
    return available ? 'bg-green-500' : 'bg-red-500'
  }

  // Handle clicking on a time slot
  const handleTimeSlotClick = (dayOfWeek: number, date: string, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;
    const endTimeInMinutes = timeInMinutes + 30;
    
    const startTime = `${time}:00`;
    const endTime = `${String(Math.floor(endTimeInMinutes / 60)).padStart(2, '0')}:${String(endTimeInMinutes % 60).padStart(2, '0')}:00`;

    const existingException = hasException(date, time)

    if (existingException) {
      // Remove existing exception
      setTempExceptions(prev => prev.filter(exc => 
        !(exc.date === date && exc.start_time === startTime && exc.end_time === endTime)
      ))
    } else {
      // Add new exception
      const normallyAvailable = isNormallyAvailable(dayOfWeek, time)
      const exceptionType = normallyAvailable ? 'cancel' : 'add'

      const newException: TempException = {
        date,
        start_time: startTime,
        end_time: endTime,
        exception_type: exceptionType,
        dayOfWeek
      }

      setTempExceptions(prev => [...prev, newException])
    }
  }

  // Get tooltip text for a time slot
  const getTooltipText = (dayOfWeek: number, date: string, time: string) => {
    const exception = hasException(date, time)
    const normallyAvailable = isNormallyAvailable(dayOfWeek, time)
    const dayName = daysOfWeek[dayOfWeek].name

    if (exception) {
      if (exception.exception_type === 'add') {
        return `Remove "Available" exception for ${dayName} at ${time}`
      } else {
        return `Remove "Not Available" exception for ${dayName} at ${time}`
      }
    }

    if (normallyAvailable) {
      return `Add "Not Available" exception for ${dayName} at ${time}`
    } else {
      return `Add "Available" exception for ${dayName} at ${time}`
    }
  }

  // Handle save
  const handleSave = async () => {
    if (tempExceptions.length === 0) {
      toast.info('No exceptions to save')
      return
    }

    try {
      setIsSaving(true)
      
      for (const exception of tempExceptions) {
        await createAvailabilityException({
          date: exception.date,
          start_time: exception.start_time,
          end_time: exception.end_time,
          exception_type: exception.exception_type
        })
      }

      toast.success('Exceptions saved successfully!')
      setTempExceptions([])
      
      // Refresh page after save
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      console.error('Failed to save exceptions:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save exceptions')
      setIsSaving(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setTempExceptions([])
    toast.info('Changes cancelled')
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <div className="w-full xl:w-3/4">
        <h3 className="text-lg font-bold mb-4">Exception Time Grid</h3>
        <div className="mb-4 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500"></div>
            <span>Normal availability</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500"></div>
            <span>Normal unavailability</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500"></div>
            <span>New add exception (unsaved)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500"></div>
            <span>New cancel exception (unsaved)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 border-2 border-blue-600"></div>
            <span>Saved add exception</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 border-2 border-orange-600"></div>
            <span>Saved cancel exception</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 text-sm min-w-[800px]">
          <div className="font-bold"></div>
          {selectedWeek.map((date, index) => (
            <div key={index} className="font-bold text-center text-xs">
              <div>{daysOfWeek[index].name}</div>
              <div className="text-gray-600">{date.getDate()}/{date.getMonth() + 1}</div>
            </div>
          ))}
          
          {timeSlots.map(time => (
            <>
              <div key={time} className="font-bold text-right pr-2">{time}</div>
              {selectedWeek.map((date, dayIndex) => {
                const dateStr = formatDateString(date)
                return (
                  <div
                    key={`${dateStr}-${time}`}
                    className={`h-6 border cursor-pointer hover:opacity-80 transition-opacity ${getSlotClass(dayIndex, dateStr, time)}`}
                    onClick={() => handleTimeSlotClick(dayIndex, dateStr, time)}
                    title={getTooltipText(dayIndex, dateStr, time)}
                  ></div>
                )
              })}
            </>
          ))}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-1/4 p-4 border rounded-lg xl:mt-[180px]">
        <h3 className="text-lg font-bold mb-4">Selected Exceptions</h3>
        {tempExceptions.length === 0 ? (
          <p className="text-gray-500 text-sm">No exceptions selected</p>
        ) : (
          <div className="space-y-2 mb-4">
            {tempExceptions.map((exception, index) => (
              <div key={index} className="text-sm p-2 border rounded">
                <div className="font-medium">
                  {exception.date} - {daysOfWeek[exception.dayOfWeek].name}
                </div>
                <div>{exception.start_time.substring(0, 5)} - {exception.end_time.substring(0, 5)}</div>
                <div className={`text-xs ${exception.exception_type === 'add' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {exception.exception_type === 'add' ? 'Extra availability' : 'Cancelled availability'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button 
            onClick={handleSave} 
            disabled={isSaving || tempExceptions.length === 0}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={handleCancel} 
            disabled={isSaving}
            className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}