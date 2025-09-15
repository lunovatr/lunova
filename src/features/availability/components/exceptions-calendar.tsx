import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { AvailabilityException, AvailabilitySlot } from '../types'
import { ExceptionTimeGrid } from './exception-time-grid'
import { getMyWeekCalendarAvailability } from '../api'
import { toast } from 'sonner'

interface ExceptionsCalendarProps {
  weeklyAvailability: AvailabilitySlot[]
}

export function ExceptionsCalendar({ weeklyAvailability }: ExceptionsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<Date[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [weekAvailability, setWeekAvailability] = useState<any[]>([])
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)

  // Get start and end of week for a given date
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDates.push(date)
    }
    return weekDates
  }

  // Format date as YYYY-MM-DD (avoiding timezone issues)
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Handle calendar date selection
  const handleDateClick = async (date: Date) => {
    setSelectedDate(date)
    const weekDates = getWeekDates(date)
    setSelectedWeek(weekDates)
    
    // Fetch availability for this specific week
    await fetchWeekAvailability(weekDates)
  }

  // Fetch availability for a specific week (including exceptions)
  const fetchWeekAvailability = async (weekDates: Date[]) => {
    if (weekDates.length === 0) return
    
    try {
      setIsLoadingWeek(true)
      const startDate = formatDate(weekDates[0])
      const endDate = formatDate(weekDates[6])
      
      console.log('=== CALENDAR API DEBUG ===')
      console.log('INPUT - Week dates:', weekDates)
      console.log('INPUT - Start date:', startDate)
      console.log('INPUT - End date:', endDate)
      console.log(`Fetching availability for week: ${startDate} to ${endDate}`)
      
      // Extract expert ID from weeklyAvailability data
      const expertId = weeklyAvailability.length > 0 ? weeklyAvailability[0].expert || weeklyAvailability[0].id : null
      console.log('INPUT - Expert ID extracted from weeklyAvailability:', expertId)
      console.log('INPUT - Weekly availability data:', weeklyAvailability)
      
      const data = await getMyWeekCalendarAvailability(startDate, endDate, expertId)
      
      console.log('OUTPUT - Raw API response:', data)
      console.log('OUTPUT - Calendar array:', data?.calendar)
      console.log('OUTPUT - Calendar length:', data?.calendar?.length)
      if (data?.calendar?.length > 0) {
        console.log('OUTPUT - First calendar item:', data.calendar[0])
        console.log('OUTPUT - Sample exceptions:', data.calendar[0]?.exceptions)
      }
      console.log('=== END CALENDAR API DEBUG ===')
      
      setWeekAvailability(data)
      console.log('Week availability data:', data)
      
    } catch (error) {
      console.error('Failed to fetch week availability:', error)
      toast.error('Failed to load week availability')
      setWeekAvailability([])
    } finally {
      setIsLoadingWeek(false)
    }
  }

  // Format week range for display
  const formatWeekRange = (weekDates: Date[]) => {
    if (weekDates.length === 0) return ''
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`
  }

  // Custom calendar tile content to show selected week
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && selectedWeek.length > 0) {
      const isInSelectedWeek = selectedWeek.some(weekDate => 
        weekDate.toDateString() === date.toDateString()
      )
      if (isInSelectedWeek) {
        return 'selected-week-tile'
      }
    }
    return null
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Select Week for Exceptions</h2>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-shrink-0">
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  handleDateClick(value)
                }
              }}
              value={selectedDate}
              tileClassName={tileClassName}
              className="border rounded-lg"
              calendarType="iso8601"
              showWeekNumbers={false}
            />
          </div>
          <div className="flex-1">
            {selectedWeek.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Selected Week:</h3>
                <p className="text-lg mb-4">{formatWeekRange(selectedWeek)}</p>
                <div className="space-y-2">
                  {selectedWeek.map((date, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-20 text-sm font-medium">
                        {date.toLocaleDateString('tr-TR', { weekday: 'long' })}
                      </span>
                      <span className="text-sm text-gray-600">
                        {date.toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedWeek.length > 0 && (
        <div>
          {isLoadingWeek ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading week availability...</span>
            </div>
          ) : (
            <ExceptionTimeGrid 
              selectedWeek={selectedWeek}
              weeklyAvailability={weeklyAvailability}
              weekAvailability={weekAvailability}
              exceptions={exceptions}
              setExceptions={setExceptions}
            />
          )}
        </div>
      )}

      <style>{`
        /* Calendar container styling - Modern dark theme */
        .react-calendar {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          font-family: inherit !important;
          width: 350px !important;
          max-width: none !important;
        }

        /* Ensure the month view displays 7 days per week */
        .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 2px !important;
        }

        /* Calendar navigation */
        .react-calendar__navigation {
          background: #111827 !important;
          border-bottom: 1px solid #374151 !important;
          border-radius: 12px 12px 0 0 !important;
          height: 56px !important;
          margin-bottom: 0 !important;
        }

        .react-calendar__navigation button {
          background: transparent !important;
          color: #f9fafb !important;
          font-weight: 600 !important;
          font-size: 16px !important;
          min-width: 44px !important;
          border-radius: 8px !important;
          margin: 4px !important;
          transition: all 0.2s ease !important;
        }

        .react-calendar__navigation button:hover {
          background: #374151 !important;
          color: #ffffff !important;
        }

        .react-calendar__navigation button:disabled {
          background: transparent !important;
          color: #6b7280 !important;
        }

        /* Calendar tiles */
        .react-calendar__tile {
          background: transparent !important;
          color: #e5e7eb !important;
          border: none !important;
          padding: 12px 8px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          border-radius: 8px !important;
          margin: 2px !important;
          transition: all 0.2s ease !important;
          position: relative !important;
        }

        .react-calendar__tile:hover {
          background: #374151 !important;
          color: #ffffff !important;
          transform: scale(1.05) !important;
        }

        .react-calendar__tile:active,
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
          font-weight: 600 !important;
        }

        .react-calendar__tile--now {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3) !important;
        }

        .react-calendar__tile--now:hover {
          background: linear-gradient(135deg, #059669, #047857) !important;
          transform: scale(1.05) !important;
        }

        /* Selected week tiles */
        .selected-week-tile {
          background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3) !important;
        }

        .selected-week-tile:hover {
          background: linear-gradient(135deg, #4f46e5, #4338ca) !important;
          transform: scale(1.05) !important;
        }

        /* Month view */
        .react-calendar__month-view__weekdays {
          background: #111827 !important;
          color: #9ca3af !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
          padding: 12px 0 !important;
        }

        .react-calendar__month-view__weekdays__weekday {
          padding: 8px 4px !important;
        }

        /* Month and year view tiles */
        .react-calendar__year-view__months__month,
        .react-calendar__decade-view__years__year,
        .react-calendar__century-view__decades__decade {
          background: transparent !important;
          color: #e5e7eb !important;
          border-radius: 12px !important;
          padding: 16px 8px !important;
          margin: 4px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }

        .react-calendar__year-view__months__month:hover,
        .react-calendar__decade-view__years__year:hover,
        .react-calendar__century-view__decades__decade:hover {
          background: #374151 !important;
          color: white !important;
          transform: scale(1.05) !important;
        }

        /* Disabled tiles */
        .react-calendar__tile:disabled {
          background: transparent !important;
          color: #6b7280 !important;
        }

        /* Remove default focus outline and add custom */
        .react-calendar button:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
        }

        /* Weekend styling */
        .react-calendar__month-view__days__day--weekend {
          color: #f87171 !important;
        }

        /* Neighbor month dates */
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #6b7280 !important;
        }

        .react-calendar__month-view__days__day--neighboringMonth:hover {
          color: #9ca3af !important;
        }
      `}</style>
    </div>
  )
}