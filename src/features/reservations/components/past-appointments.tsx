import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, X, User, Video, StickyNote, CalendarClock } from 'lucide-react'
import { addMinutes, format, isPast, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

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
        app.status === 'cancelled' ||
        app.status === 'completed' ||
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
          <HoverCard key={appointment.id}>
            <HoverCardTrigger asChild>
              <div className='flex items-center gap-4 cursor-pointer'>
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
                    {appointment.status === 'cancelled' ? (
                      <Badge
                        variant='destructive'
                        className='flex items-center gap-1.5 px-2.5 py-1'
                      >
                        <X className='h-3 w-3' />
                        İptal Edildi
                      </Badge>
                    ) : appointment.status === 'completed' ? (
                      <Badge
                        variant='default'
                        className='flex items-center gap-1.5 px-2.5 py-1'
                      >
                        <Check className='h-3 w-3' />
                        Tamamlandı
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='text-muted-foreground flex items-center gap-1.5 px-2.5 py-1'
                      >
                        <Check className='h-3 w-3' />
                        Geçmiş
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className='w-80' side='left'>
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
                      <span className='font-medium'>Süre:</span> {appointment.duration} dakika
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <CalendarClock className='h-4 w-4 text-muted-foreground' />
                    <div className='text-sm'>
                      <span className='font-medium'>Durum:</span>{' '}
                      <Badge variant={
                        appointment.status === 'cancelled' ? 'destructive' :
                        appointment.status === 'completed' ? 'default' :
                        'outline'
                      }>
                        {appointment.status === 'cancelled' ? 'İptal Edildi' :
                         appointment.status === 'completed' ? 'Tamamlandı' :
                         'Geçmiş'}
                      </Badge>
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

                  <div className='pt-2 border-t text-xs text-muted-foreground space-y-1'>
                    <div>Oluşturulma: {format(new Date(appointment.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</div>
                    <div>Güncellenme: {format(new Date(appointment.updated_at), 'dd MMM yyyy HH:mm', { locale: tr })}</div>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      })}
    </div>
  )
}
