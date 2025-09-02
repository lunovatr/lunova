import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, X } from 'lucide-react'
import { addMinutes, format, isPast, parse } from 'date-fns'
import { tr } from 'date-fns/locale'

import { Appointment } from '../api'

interface PastAppointmentsProps {
  appointments: Appointment[]
}

export function PastAppointments({ appointments }: PastAppointmentsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const pastAppointments = appointments
    .filter((app) => {
      const startTime = parse(
        `${app.date} ${app.time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date(),
      )
      return (
        app.status === 'rejected' ||
        (app.status === 'confirmed' && isPast(startTime))
      )
    })
    .sort((a, b) => {
      // Sort by date descending
      const dateA = parse(
        `${a.date} ${a.time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date(),
      )
      const dateB = parse(
        `${b.date} ${b.time}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date(),
      )
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)

  if (pastAppointments.length === 0) {
    return (
      <div className='flex h-24 items-center justify-center'>
        <p className='text-muted-foreground text-sm'>
          Geçmiş randevu bulunmuyor.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {pastAppointments.map((appointment) => {
        const startTime = parse(
          `${appointment.date} ${appointment.time}`,
          'yyyy-MM-dd HH:mm:ss',
          new Date(),
        )
        const endTime = addMinutes(startTime, appointment.duration)

        return (
          <div key={appointment.id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback>
                {getInitials(appointment.client_name)}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-medium leading-none'>
                  {appointment.client_name}
                </p>
                <p className='text-muted-foreground flex items-center gap-1 text-sm'>
                  <Clock className='h-3 w-3' />
                  {format(startTime, 'dd MMM yyyy, ', { locale: tr })}
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </p>
              </div>
              <div className='flex'>
                {appointment.status === 'rejected' ? (
                  <Badge
                    variant='destructive'
                    className='flex items-center gap-1.5 px-2.5 py-1'
                  >
                    <X className='h-3 w-3' />
                    Reddedildi
                  </Badge>
                ) : (
                  <Badge
                    variant='outline'
                    className='text-muted-foreground flex items-center gap-1.5 px-2.5 py-1'
                  >
                    <Check className='h-3 w-3' />
                    Tamamlandı
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
