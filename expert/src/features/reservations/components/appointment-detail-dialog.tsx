import { useEffect, useState } from 'react'
import { format, parse, addMinutes } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Check, Clock, CalendarClock, CreditCard, StickyNote, User, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Appointment,
  getAppointmentDetail,
  updateAppointmentStatus,
} from '../api'

interface AppointmentDetailDialogProps {
  appointmentId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
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

const PAYMENT_STATUS_LABELS: Record<'unpaid' | 'paid', string> = {
  paid: 'Ödendi',
  unpaid: 'Ödeme Bekleniyor',
}

function paymentStatusVariant(s: 'unpaid' | 'paid'): BadgeVariant {
  return s === 'paid' ? 'default' : 'secondary'
}

export function AppointmentDetailDialog({
  appointmentId,
  open,
  onOpenChange,
  onUpdate,
}: AppointmentDetailDialogProps) {
  const [detail, setDetail] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!open || !appointmentId) return
    setDetail(null)
    setLoading(true)
    getAppointmentDetail(appointmentId)
      .then(setDetail)
      .catch(() => toast.error('Randevu detayı alınamadı'))
      .finally(() => setLoading(false))
  }, [open, appointmentId])

  const handleStatusUpdate = async (status: Appointment['status']) => {
    if (!detail) return
    setActionLoading(true)
    try {
      await updateAppointmentStatus(detail.id, status)
      toast.success(
        status === 'confirmed' ? 'Randevu onaylandı' :
        status === 'cancelled' ? 'Randevu iptal edildi' :
        status === 'completed' ? 'Randevu tamamlandı olarak işaretlendi' :
        'Durum güncellendi'
      )
      onUpdate?.()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            Randevu Detayı {detail ? `#${detail.id}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='space-y-3 py-2'>
            <Skeleton className='h-5 w-2/3' />
            <Skeleton className='h-5 w-1/2' />
            <Skeleton className='h-5 w-3/4' />
            <Skeleton className='h-5 w-1/3' />
          </div>
        ) : detail ? (
          <div className='space-y-4 py-1'>
            <div className='flex items-center gap-2'>
              <User className='h-4 w-4 shrink-0 text-muted-foreground' />
              <p className='text-sm'>
                <span className='text-muted-foreground'>Danışan: </span>
                <span className='font-medium'>{detail.client_name}</span>
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4 shrink-0 text-muted-foreground' />
              <p className='text-sm'>
                {(() => {
                  const start = parse(
                    `${detail.date} ${detail.time}`,
                    'yyyy-MM-dd HH:mm:ss',
                    new Date()
                  )
                  const end = addMinutes(start, detail.duration)
                  return (
                    <>
                      <span className='font-medium'>
                        {format(start, 'dd MMM yyyy', { locale: tr })}
                        {' · '}
                        {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                      </span>
                      <span className='ml-1 text-muted-foreground'>
                        ({detail.duration} dk)
                      </span>
                    </>
                  )
                })()}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <CalendarClock className='h-4 w-4 shrink-0 text-muted-foreground' />
              <div className='flex items-center gap-2 text-sm'>
                <span className='text-muted-foreground'>Durum:</span>
                <Badge variant={statusVariant(detail.status)}>
                  {STATUS_LABELS[detail.status]}
                </Badge>
              </div>
            </div>

            {(detail.payment_status === 'paid' || detail.payment_status === 'unpaid') && (
              <div className='flex items-center gap-2'>
                <CreditCard className='h-4 w-4 shrink-0 text-muted-foreground' />
                <div className='flex items-center gap-2 text-sm'>
                  <span className='text-muted-foreground'>Ödeme:</span>
                  <Badge variant={paymentStatusVariant(detail.payment_status)}>
                    {PAYMENT_STATUS_LABELS[detail.payment_status]}
                  </Badge>
                  {detail.payment_status === 'unpaid' && detail.session_price != null && (
                    <span className='text-xs text-muted-foreground'>
                      ({detail.session_price} {detail.session_currency ?? 'TRY'})
                    </span>
                  )}
                </div>
              </div>
            )}

            {detail.notes && (
              <div className='flex items-start gap-2'>
                <StickyNote className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                <div className='text-sm'>
                  <span className='text-muted-foreground'>Notlar: </span>
                  <span>{detail.notes}</span>
                </div>
              </div>
            )}

            {detail.zoom_start_url?.startsWith('https://') && (
              <div className='flex items-center gap-2'>
                <Video className='h-4 w-4 shrink-0 text-muted-foreground' />
                <Button size='sm' variant='outline' asChild>
                  <a
                    href={detail.zoom_start_url}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Video className='mr-1 h-3 w-3' />
                    Toplantıyı Başlat
                  </a>
                </Button>
              </div>
            )}

            {(detail.status === 'pending' || detail.status === 'waiting_approval') && (
              <>
                <Separator />
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate('cancelled')}
                  >
                    <X className='mr-1 h-3 w-3' />
                    Reddet
                  </Button>
                  <Button
                    size='sm'
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate('confirmed')}
                  >
                    <Check className='mr-1 h-3 w-3' />
                    Onayla
                  </Button>
                </div>
              </>
            )}

            {detail.status === 'cancel_requested' && (
              <>
                <Separator />
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate('confirmed')}
                  >
                    İptal Talebini Reddet
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate('cancelled')}
                  >
                    İptal Et
                  </Button>
                </div>
              </>
            )}

            <Separator />
            <div className='space-y-1 text-xs text-muted-foreground'>
              <p>Oluşturulma: {format(new Date(detail.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
              <p>Güncellenme: {format(new Date(detail.updated_at), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
