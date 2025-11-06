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
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar as CalendarIcon, User, Video, StickyNote, Clock, CalendarClock, CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { useTheme } from '@/context/theme-provider'

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
  status: 'pending' | 'waiting_approval' | 'confirmed' | 'cancel_requested' | 'cancelled' | 'completed'
  notes?: string
  is_confirmed: boolean
  zoom_start_url: string
  zoom_join_url: string
  zoom_meeting_id: string
  created_at: string
  updated_at: string
}

/**
 * @interface ExpertDailyScheduleProps
 * Component'in dışarıdan alacağı propları tanımlar.
 */
interface ExpertDailyScheduleProps {
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
  appointments,
  workDayStartHour = 9,
  workDayEndHour: _workDayEndHour = 18,
}: ExpertDailyScheduleProps) => {
  // Component'in kendi içinde seçili tarihi yönetmesi için state.
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  // Görünüm modu: 'daily' veya 'weekly'
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')
  // Theme context
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Randevuları günlere göre grupla ve her günün randevu sayısını hesapla
  const appointmentsByDate = appointments
    .filter((app) => app.status === 'confirmed')
    .reduce((acc, app) => {
      const date = app.date
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date]++
      return acc
    }, {} as Record<string, number>)

  // Randevu yoğunluğuna göre günleri kategorize et
  const lowActivityDays: Date[] = []
  const mediumActivityDays: Date[] = []
  const highActivityDays: Date[] = []

  Object.entries(appointmentsByDate).forEach(([dateStr, count]) => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    if (count >= 1 && count <= 3) {
      lowActivityDays.push(date)
    } else if (count > 3 && count <= 6) {
      mediumActivityDays.push(date)
    } else if (count > 6) {
      highActivityDays.push(date)
    }
  })

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
          Program - {viewMode === 'daily'
            ? format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })
            : `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd MMM', { locale: tr })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: tr })}`
          }
        </CardTitle>
        <div className='flex items-center gap-2'>
          {/* Toggle Butonları */}
          <div className={`p-1 flex ${isDark ? 'bg-secondary/50' : 'bg-gray-100'} rounded-lg space-x-1 shadow-sm`}>
            <button
              onClick={() => setViewMode('daily')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md text-center transition-colors flex items-center justify-center ${
                viewMode === 'daily'
                  ? `${isDark ? 'bg-secondary text-secondary-foreground shadow-sm shadow-black/50' : 'bg-white text-gray-900 shadow-sm'}`
                  : `${isDark ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`
              }`}
              style={{ minWidth: '70px' }}
            >
              <Clock className='mr-2 h-4 w-4' />
              Günlük
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md text-center transition-colors flex items-center justify-center ${
                viewMode === 'weekly'
                  ? `${isDark ? 'bg-secondary text-secondary-foreground shadow-sm shadow-black/50' : 'bg-white text-gray-900 shadow-sm'}`
                  : `${isDark ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`
              }`}
              style={{ minWidth: '70px' }}
            >
              <CalendarDays className='mr-2 h-4 w-4' />
              Haftalık
            </button>
          </div>

          {/* Tarih Seçici */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={'outline'} size='sm'>
                <CalendarIcon className='h-4 w-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='end'>
              <Calendar
                mode='single'
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                autoFocus
                modifiers={{
                  lowActivity: lowActivityDays,
                  mediumActivity: mediumActivityDays,
                  highActivity: highActivityDays,
                  // Haftalık modda seçili haftanın tüm günlerini highlight et
                  ...(viewMode === 'weekly' && {
                    selectedWeek: eachDayOfInterval({
                      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
                    }),
                  }),
                }}
                modifiersClassNames={{
                  selectedWeek: 'bg-accent text-accent-foreground',
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'daily' ? (
          /* GÜNLÜK GÖRÜNÜM - Mevcut Timeline */
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
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className='bg-primary/10 border-primary/20 flex h-full items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-primary/20 transition-colors'>
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
                  </HoverCardTrigger>
                  <HoverCardContent className='w-80' side='right'>
                    <div className='space-y-3'>
                      <div className='space-y-1'>
                        <h4 className='text-sm font-semibold'>Randevu Detayları</h4>
                        <p className='text-xs text-muted-foreground'>ID: #{app.id}</p>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center gap-2'>
                          <User className='h-4 w-4 text-muted-foreground' />
                          <div className='text-sm'>
                            <span className='font-medium'>Danışan:</span> {app.client_name}
                          </div>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Clock className='h-4 w-4 text-muted-foreground' />
                          <div className='text-sm'>
                            <span className='font-medium'>Süre:</span> {app.duration} dakika
                          </div>
                        </div>

                        <div className='flex items-center gap-2'>
                          <CalendarClock className='h-4 w-4 text-muted-foreground' />
                          <div className='text-sm'>
                            <span className='font-medium'>Durum:</span>{' '}
                            <Badge variant={
                              app.status === 'confirmed' ? 'default' :
                              app.status === 'completed' ? 'default' :
                              app.status === 'pending' || app.status === 'waiting_approval' ? 'secondary' :
                              app.status === 'cancel_requested' ? 'outline' :
                              'destructive'
                            }>
                              {app.status === 'confirmed' ? 'Onaylandı' :
                               app.status === 'completed' ? 'Tamamlandı' :
                               app.status === 'pending' ? 'Bekliyor' :
                               app.status === 'waiting_approval' ? 'Onay Bekliyor' :
                               app.status === 'cancel_requested' ? 'İptal Talebi' :
                               'İptal Edildi'}
                            </Badge>
                          </div>
                        </div>

                        {app.notes && (
                          <div className='flex items-start gap-2'>
                            <StickyNote className='h-4 w-4 text-muted-foreground mt-0.5' />
                            <div className='text-sm flex-1'>
                              <span className='font-medium'>Notlar:</span>
                              <p className='text-muted-foreground mt-1'>{app.notes}</p>
                            </div>
                          </div>
                        )}

                        {app.zoom_join_url && app.zoom_join_url !== 'mock url' && (
                          <div className='flex items-start gap-2'>
                            <Video className='h-4 w-4 text-muted-foreground mt-0.5' />
                            <div className='text-sm flex-1'>
                              <span className='font-medium'>Zoom:</span>
                              <a
                                href={app.zoom_join_url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary hover:underline block mt-1'
                              >
                                Toplantıya Katıl
                              </a>
                            </div>
                          </div>
                        )}

                        <div className='pt-2 border-t text-xs text-muted-foreground space-y-1'>
                          <div>Oluşturulma: {format(new Date(app.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</div>
                          <div>Güncellenme: {format(new Date(app.updated_at), 'dd MMM yyyy HH:mm', { locale: tr })}</div>
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            )
          })}
          </div>
        ) : (
          /* HAFTALIK GÖRÜNÜM - Tablo Yapısı */
          <WeeklyScheduleView
            appointments={appointments}
            selectedDate={selectedDate}
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Haftalık randevu görünümü - Tablo formatında
 */
interface WeeklyScheduleViewProps {
  appointments: Appointment[]
  selectedDate: Date
}

const WeeklyScheduleView = ({ appointments, selectedDate }: WeeklyScheduleViewProps) => {
  // Seçili haftanın başı ve sonu (Pazartesi-Pazar)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Saat dilimleri (08:00'dan 20:00'a kadar)
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00',
  ]

  // Randevuları günlere göre grupla
  const appointmentsByDay = weekDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayAppointments = appointments
      .filter((app) => app.date === dayStr && app.status === 'confirmed')
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

    return { day, dayStr, appointments: dayAppointments }
  })

  // Belirli bir saat diliminde ve günde randevu var mı kontrol et
  const getAppointmentAtSlot = (dayStr: string, timeSlot: string) => {
    const dayData = appointmentsByDay.find((d) => d.dayStr === dayStr)
    if (!dayData) return null

    const slotTime = parse(`${dayStr} ${timeSlot}:00`, 'yyyy-MM-dd HH:mm:ss', new Date())
    const slotEndTime = addHours(slotTime, 1)

    // Randevuyu sadece başladığı slot'ta göster
    return dayData.appointments.find((app) =>
      app.startTime >= slotTime && app.startTime < slotEndTime
    )
  }

  return (
    <div className='overflow-hidden'>
      <div className='grid gap-0 text-sm' style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
        {/* Başlık Satırı */}
        <div className='pt-2'></div> {/* Köşe boş */}
        {weekDays.map((day) => (
          <div key={day.toString()} className='font-bold text-center pb-2 border-b-2 border-gray-500'>
            <div className='hidden sm:block'>{format(day, 'EEEE', { locale: tr })}</div>
            <div className='sm:hidden'>{format(day, 'EEE', { locale: tr })}</div>
            <div className='text-xs text-muted-foreground'>{format(day, 'dd MMM', { locale: tr })}</div>
          </div>
        ))}

        {/* Zaman Çizelgesi ve Slotlar */}
        {timeSlots.slice(0, -1).map((time) => (
          <div key={time} className='contents'>
            {/* Saat Etiketi */}
            <div
              className='font-bold text-right text-xs flex items-start pr-2 -mt-1'
            >
              {time}
            </div>

            {/* Her günün saat dilimi */}
            {appointmentsByDay.map(({ dayStr }) => {
              const appointment = getAppointmentAtSlot(dayStr, time)

              if (appointment) {
                return (
                  <HoverCard key={`${dayStr}-${time}`}>
                    <HoverCardTrigger asChild>
                      <div
                        className='h-8 border border-primary/20 bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors flex items-center justify-center p-1'
                      >
                        <span className='text-xs text-primary font-semibold truncate'>
                          {appointment.client_name}
                        </span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className='w-80' side='top'>
                      <div className='space-y-3'>
                        <div className='space-y-1'>
                          <h4 className='text-sm font-semibold'>Randevu Detayları</h4>
                          <p className='text-xs text-muted-foreground'>ID: #{appointment.id}</p>
                        </div>

                        <div className='space-y-2'>
                          <div className='flex items-center gap-2'>
                            <User className='h-4 w-4 text-muted-foreground' />
                            <div className='text-sm'>
                              <span className='font-medium'>Danışan:</span> {appointment.client_name}
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            <Clock className='h-4 w-4 text-muted-foreground' />
                            <div className='text-sm'>
                              <span className='font-medium'>Saat:</span> {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            <Clock className='h-4 w-4 text-muted-foreground' />
                            <div className='text-sm'>
                              <span className='font-medium'>Süre:</span> {appointment.duration} dakika
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className='flex items-start gap-2'>
                              <StickyNote className='h-4 w-4 text-muted-foreground mt-0.5' />
                              <div className='text-sm flex-1'>
                                <span className='font-medium'>Notlar:</span>
                                <p className='text-muted-foreground mt-1'>{appointment.notes}</p>
                              </div>
                            </div>
                          )}

                          {appointment.zoom_join_url && appointment.zoom_join_url !== 'mock url' && (
                            <div className='flex items-start gap-2'>
                              <Video className='h-4 w-4 text-muted-foreground mt-0.5' />
                              <div className='text-sm flex-1'>
                                <span className='font-medium'>Zoom:</span>
                                <a
                                  href={appointment.zoom_join_url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-primary hover:underline block mt-1'
                                >
                                  Toplantıya Katıl
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )
              }

              return (
                <div
                  key={`${dayStr}-${time}`}
                  className='h-8 border border-opacity-30 bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-gray-700'
                ></div>
              )
            })}
          </div>
        ))}

        {/* Bitiş Saati Etiketi */}
        <div
          className='font-bold text-right text-xs flex items-start pr-2 -mt-1'
        >
          {timeSlots[timeSlots.length - 1]}
        </div>
        {weekDays.map((_, idx) => (
          <div key={`end-spacer-${idx}`}></div>
        ))}
      </div>
    </div>
  )
}
