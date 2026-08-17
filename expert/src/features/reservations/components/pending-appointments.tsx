import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, User, Video, StickyNote, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { format, addMinutes, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

import { Appointment, updateAppointmentStatus } from '../api'

interface PendingAppointmentsProps {
  appointments: Appointment[]
  onUpdate?: () => void
  onAppointmentClick?: (id: number) => void
}

export function PendingAppointments({ appointments, onUpdate, onAppointmentClick }: PendingAppointmentsProps) {
  const handleApprove = async (appointmentId: number) => {
    try {
      await updateAppointmentStatus(appointmentId, 'confirmed')
      toast.success(`Randevu onaylandı (ID: ${appointmentId})`)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      toast.error(`Onaylama hatası: ${error.message}`)
    }
  }

  const handleReject = async (appointmentId: number) => {
    try {
      await updateAppointmentStatus(appointmentId, 'cancelled')
      toast.success(`Randevu iptal edildi (ID: ${appointmentId})`)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      toast.error(`İptal hatası: ${error.message}`)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const pendingAppointments = appointments
    .filter((app) => app.status === 'pending' || app.status === 'waiting_approval')
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())

  if (pendingAppointments.length === 0) {
    return (
      <div className='flex h-24 items-center justify-center'>
        <p className='text-muted-foreground text-sm'>
          Onay bekleyen randevu bulunmuyor.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {pendingAppointments.map((appointment) => {
          const startTime = parse(
            `${appointment.date} ${appointment.time}`,
            'yyyy-MM-dd HH:mm:ss',
            new Date()
          )
          const endTime = addMinutes(startTime, appointment.duration)

          return (
            <HoverCard key={appointment.id}>
              <HoverCardTrigger asChild>
                <div
                  className='flex items-center gap-4 cursor-pointer'
                  onClick={() => onAppointmentClick?.(appointment.id)}
                >
                  <Avatar className='h-9 w-9'>
                    <AvatarFallback>{getInitials(appointment.client_name)}</AvatarFallback>
                  </Avatar>
                  <div className='flex flex-1 flex-wrap items-center justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm leading-none font-medium'>{appointment.client_name}</p>
                      <p className='text-muted-foreground text-sm flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {format(startTime, 'dd MMM, ', { locale: tr })}
                        {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                      </p>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 w-7 p-0'
                        onClick={() => handleReject(appointment.id)}
                      >
                        <X className='w-3 h-3' />
                      </Button>
                      <Button size='sm' className='h-7 w-7 p-0' onClick={() => handleApprove(appointment.id)}>
                        <Check className='w-3 h-3' />
                      </Button>
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
                        <Badge variant='secondary'>Bekliyor</Badge>
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

                    {appointment.zoom_start_url && (
                      <div className='flex items-start gap-2'>
                        <Video className='h-4 w-4 text-muted-foreground mt-0.5' />
                        <div className='text-sm flex-1'>
                          <span className='font-medium'>Zoom:</span>
                          <a
                            href={appointment.zoom_start_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary hover:underline block mt-1'
                          >
                            Toplantıyı Başlat
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
