import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format, addMinutes, parse } from 'date-fns'
import { tr } from 'date-fns/locale'

import { Appointment, confirmAppointment, rejectAppointment } from '../api'

interface PendingAppointmentsProps {
  appointments: Appointment[]
}

export function PendingAppointments({ appointments }: PendingAppointmentsProps) {
  const handleApprove = async (appointmentId: number) => {
    try {
      await confirmAppointment(appointmentId)
      toast.success(`Randevu onaylandı (ID: ${appointmentId})`)
      // Sayfayı yenile veya state'i güncelle
      window.location.reload()
    } catch (error: any) {
      toast.error(`Onaylama hatası: ${error.message}`)
    }
  }

  const handleReject = async (appointmentId: number) => {
    try {
      await rejectAppointment(appointmentId)
      toast.success(`Randevu reddedildi (ID: ${appointmentId})`)
      window.location.reload()
    } catch (error: any) {
      toast.error(`Reddetme hatası: ${error.message}`)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const pendingAppointments = appointments
    .filter((app) => app.status === 'pending')
    .slice(0, 5)

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
            <div key={appointment.id} className='flex items-center gap-4'>
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
          )
        })}
    </div>
  )
}
