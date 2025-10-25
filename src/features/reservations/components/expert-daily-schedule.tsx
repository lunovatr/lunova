// components/expert-daily-schedule.tsx
import { useState } from 'react'
import {
  format,
  addMinutes,
  addHours,
  parse,
  differenceInMinutes,
  startOfDay,
  isWithinInterval,
  eachHourOfInterval,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar as CalendarIcon, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * @interface Appointment
 * Backend API'sinden gelen randevu verisinin yapısını tanımlar.
 */
interface Appointment {
  id: number
  date: string
  time: string
  duration: number
  client: number
  client_name: string
  expert: number
  expert_name: string
  status: 'pending' | 'confirmed' | 'rejected'
  notes?: string
}

/**
 * @interface ExpertDailyScheduleProps
 * Component'in dışarıdan alacağı propları tanımlar.
 */
interface ExpertDailyScheduleProps {
  expertId: number
  appointments: Appointment[] // Filtrelenmemiş tüm randevu listesi
  workDayStartHour?: number // Uzmanın varsayılan mesai başlangıç saati
  workDayEndHour?: number // Uzmanın varsayılan mesai bitiş saati
}

/**
 * @component ExpertDailySchedule
 * Belirli bir uzmanın günlük programını dikey bir zaman çizelgesi üzerinde görselleştirir.
 * Component, kendi tarih state'ini yönetir ve gösterilen zaman aralığını o günkü
 * randevulara göre dinamik olarak ayarlar.
 */
export const ExpertDailySchedule = ({
  expertId: _expertId,
  appointments,
  workDayStartHour = 9,
  workDayEndHour: _workDayEndHour = 18,
}: ExpertDailyScheduleProps) => {
  // Component'in kendi içinde seçili tarihi yönetmesi için state.
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Gelen tüm randevuları seçili tarihe göre filtreler,
  // Date objelerine çevirir ve kronolojik olarak sıralar.
  const filteredAppointments = appointments
    .filter(
      (app) =>
        app.date === format(selectedDate, 'yyyy-MM-dd') &&
        app.status === 'confirmed'
    )
    .map((app) => {
      const startTime = parse(
        `${app.date} ${app.time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date()
      )
      const endTime = addMinutes(startTime, app.duration)
      return { ...app, startTime, endTime }
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Zaman çizelgesinin başlangıç ve bitişini dinamik olarak hesaplamak için değişkenler.
  let timelineStartTime: Date
  let timelineEndTime: Date

  if (filteredAppointments.length > 0) {
    // Eğer gün içinde randevu varsa, zaman çizelgesinin sınırlarını bu randevulara göre ayarla.
    const firstAppointment = filteredAppointments[0]
    const lastAppointment =
      filteredAppointments[filteredAppointments.length - 1]

    // Başlangıç zamanını, ilk randevudan bir saat öncesine ayarla.
    timelineStartTime = startOfDay(firstAppointment.startTime)
    timelineStartTime.setHours(
      firstAppointment.startTime.getHours() - 1,
      0,
      0,
      0
    )

    // Bitiş zamanını, son randevudan bir saat sonrasına ayarla.
    timelineEndTime = startOfDay(lastAppointment.endTime)
    timelineEndTime.setHours(lastAppointment.endTime.getHours() + 1, 0, 0, 0)
  } else {
    // Eğer gün boşsa, varsayılan bir zaman aralığı (örn: 3 saat) göster.
    const defaultStart = startOfDay(selectedDate)
    defaultStart.setHours(workDayStartHour, 0, 0, 0)

    timelineStartTime = defaultStart
    timelineEndTime = addHours(defaultStart, 3)
  }

  // Görselleştirilecek saat başı işaretçilerini (09:00, 10:00 vb.) oluşturur.
  const hourMarkers = eachHourOfInterval({
    start: timelineStartTime,
    end: addMinutes(timelineEndTime, -1), // Bitiş saatinin kendisini dahil etmemek için.
  })

  // Belirtilen bir saatin bir randevu bloğu tarafından işgal edilip edilmediğini kontrol eder.
  const isHourOccupied = (hour: Date) => {
    return filteredAppointments.some((app) =>
      isWithinInterval(hour, { start: app.startTime, end: app.endTime })
    )
  }

  // Zaman çizelgesinin toplam yüksekliğini, dinamik başlangıç ve bitiş saatlerine göre hesaplar.
  const totalWorkMinutes = differenceInMinutes(
    timelineEndTime,
    timelineStartTime
  )
  const PIXELS_PER_MINUTE = 2.0 // Her bir dakikanın kaç piksel yüksekliğe denk geleceği.

  return (
    <Card className='w-full'>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>
          Program - {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
        </CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={'outline'} size='sm' className='ml-auto'>
              <CalendarIcon className='mr-2 h-4 w-4' />
              Tarih Değiştir
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='end'>
            <Calendar
              mode='single'
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              autoFocus // Popover açıldığında takvime otomatik odaklanır.
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {/* Zaman çizelgesinin ana kapsayıcısı. Yüksekliği dinamik olarak ayarlanır. */}
        <div
          className='relative'
          style={{ height: `${totalWorkMinutes * PIXELS_PER_MINUTE}px` }}
        >
          {/* Dikey zaman eksenini temsil eden çizgi. */}
          <div className='absolute top-0 left-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700' />

          {/* Saat başı işaretçilerini render eder. */}
          {hourMarkers.map((hour, index) => {
            // Eğer saat bir randevu bloğu içinde kalıyorsa, görsel karmaşayı önlemek için render etme.
            if (isHourOccupied(hour)) return null

            // Saatin dikey konumunu, zaman çizelgesinin başlangıcına göre hesapla.
            const topPosition =
              differenceInMinutes(hour, timelineStartTime) * PIXELS_PER_MINUTE

            return (
              <div
                key={`hour-${index}`}
                className='absolute flex w-full items-center'
                style={{ top: `${topPosition}px` }}
              >
                <div className='absolute -left-1.5 flex h -4 w-4 items-center justify-center'>
                  <div className='h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600' />
                </div>
                <span className='text-muted-foreground pl-6 text-xs'>
                  {format(hour, 'HH:mm')}
                </span>
              </div>
            )
          })}

          {/* Randevu bloklarını render eder. */}
          {filteredAppointments.map((app) => {
            // Randevu bloğunun dikey konumunu ve yüksekliğini hesapla.
            const topPosition =
              differenceInMinutes(app.startTime, timelineStartTime) *
              PIXELS_PER_MINUTE
            const blockHeight = app.duration * PIXELS_PER_MINUTE

            return (
              <div
                key={`app-${app.id}`}
                className='absolute w-full pb-4 pl-6'
                style={{ top: `${topPosition}px`, height: `${blockHeight}px` }}
              >
                <div className='absolute -left-1.5 flex h-full items-start pt-1'>
                  <div className='bg-background border-primary flex h-4 w-4 items-center justify-center rounded-full border-2'>
                    <div className='bg-primary h-2 w-2 rounded-full' />
                  </div>
                </div>
                <div className='bg-primary/10 border-primary/20 flex h-full items-center justify-between rounded-md border p-3'>
                  <div className='text-primary truncate text-sm font-semibold'>
                    {format(app.startTime, 'HH:mm')} -{' '}
                    {format(app.endTime, 'HH:mm')}
                  </div>
                  <Badge
                    variant='secondary'
                    className='flex items-center text-xs whitespace-nowrap'
                  >
                    <User className='mr-1 h-3 w-3' />
                    {app.client_name}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
