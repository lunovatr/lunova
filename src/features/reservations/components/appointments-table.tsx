import { useState } from 'react'
import { format, parse, addMinutes } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Check, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Appointment, updateAppointmentStatus } from '../api'

interface AppointmentsTableProps {
  appointments: Appointment[]
  onUpdate?: () => void
  onAppointmentClick?: (id: number) => void
}

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Bekliyor',
  waiting_approval: 'Onay Bekliyor',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
  cancel_requested: 'İptal Talebi',
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

function statusVariant(s: Appointment['status']): BadgeVariant {
  if (s === 'confirmed' || s === 'completed') return 'default'
  if (s === 'cancelled') return 'destructive'
  if (s === 'cancel_requested') return 'outline'
  return 'secondary'
}

export function AppointmentsTable({ appointments, onUpdate, onAppointmentClick }: AppointmentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = appointments
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`)
      const db = new Date(`${b.date}T${b.time}`)
      return db.getTime() - da.getTime()
    })

  const handleApprove = async (id: number) => {
    try {
      await updateAppointmentStatus(id, 'confirmed')
      toast.success('Randevu onaylandı')
      onUpdate?.()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await updateAppointmentStatus(id, 'cancelled')
      toast.success('Randevu iptal edildi')
      onUpdate?.()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>{filtered.length} randevu</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-44'>
            <SelectValue placeholder='Durum filtrele' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tümü</SelectItem>
            <SelectItem value='confirmed'>Onaylandı</SelectItem>
            <SelectItem value='pending'>Bekliyor</SelectItem>
            <SelectItem value='waiting_approval'>Onay Bekliyor</SelectItem>
            <SelectItem value='completed'>Tamamlandı</SelectItem>
            <SelectItem value='cancel_requested'>İptal Talebi</SelectItem>
            <SelectItem value='cancelled'>İptal Edildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12 text-center'>#</TableHead>
              <TableHead>Danışan</TableHead>
              <TableHead>Tarih & Saat</TableHead>
              <TableHead className='w-20'>Süre</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className='text-right'>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='py-10 text-center text-muted-foreground'
                >
                  Randevu bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((app) => {
                const startTime = parse(
                  `${app.date} ${app.time}`,
                  'yyyy-MM-dd HH:mm:ss',
                  new Date()
                )
                const endTime = addMinutes(startTime, app.duration)
                const isPending =
                  app.status === 'pending' || app.status === 'waiting_approval'
                const hasZoom =
                  app.status === 'confirmed' &&
                  !!app.zoom_start_url

                return (
                  <TableRow
                    key={app.id}
                    className='cursor-pointer'
                    onClick={() => onAppointmentClick?.(app.id)}
                  >
                    <TableCell className='text-center text-xs text-muted-foreground'>
                      {app.id}
                    </TableCell>
                    <TableCell className='font-medium'>{app.client_name}</TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        {format(startTime, 'dd MMM yyyy', { locale: tr })}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className='text-sm'>{app.duration} dk</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(app.status)}>
                        {STATUS_LABELS[app.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div
                        className='flex items-center justify-end gap-1'
                        onClick={(e) => e.stopPropagation()}
                      >
                        {hasZoom && (
                          <Button size='sm' variant='outline' asChild>
                            <a
                              href={app.zoom_start_url}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <Video className='mr-1 h-3 w-3' />
                              Başlat
                            </a>
                          </Button>
                        )}
                        {isPending && (
                          <>
                            <Button
                              size='sm'
                              variant='outline'
                              className='h-7 w-7 p-0'
                              onClick={() => handleReject(app.id)}
                            >
                              <X className='h-3 w-3' />
                            </Button>
                            <Button
                              size='sm'
                              className='h-7 w-7 p-0'
                              onClick={() => handleApprove(app.id)}
                            >
                              <Check className='h-3 w-3' />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
