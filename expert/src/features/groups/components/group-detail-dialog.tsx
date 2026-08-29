import { useEffect, useState } from 'react'
import { format, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
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
  cancelGroupSession,
  getGroupSessionDetail,
  reviewGroupParticipant,
  type GroupSession,
  type GroupSessionParticipant,
} from '../api'

interface GroupDetailDialogProps {
  groupId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

const PARTICIPANT_STATUS_LABELS: Record<GroupSessionParticipant['status'], string> = {
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

function participantBadgeVariant(status: GroupSessionParticipant['status']): 'default' | 'secondary' | 'destructive' {
  if (status === 'approved') return 'default'
  if (status === 'rejected') return 'destructive'
  return 'secondary'
}

export function GroupDetailDialog({ groupId, open, onOpenChange, onUpdate }: GroupDetailDialogProps) {
  const [detail, setDetail] = useState<GroupSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadDetail = () => {
    if (!groupId) return
    setLoading(true)
    getGroupSessionDetail(groupId)
      .then(setDetail)
      .catch(() => toast.error('Grup seansı detayı alınamadı'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open || !groupId) return
    setDetail(null)
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId])

  const handleReview = async (participant: GroupSessionParticipant, status: 'approved' | 'rejected') => {
    if (!groupId) return
    setActionLoadingId(participant.id)
    try {
      await reviewGroupParticipant(groupId, participant.id, status)
      toast.success(status === 'approved' ? 'Talep onaylandı' : 'Talep reddedildi')
      loadDetail()
      onUpdate?.()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancel = async () => {
    if (!groupId) return
    setCancelling(true)
    try {
      await cancelGroupSession(groupId)
      toast.success('Grup seansı iptal edildi')
      onUpdate?.()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCancelling(false)
    }
  }

  const pending = detail?.participants.filter((p) => p.status === 'pending_approval') ?? []
  const approved = detail?.participants.filter((p) => p.status === 'approved') ?? []
  const rejected = detail?.participants.filter((p) => p.status === 'rejected') ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            Grup Seansı {detail ? `#${detail.id}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='space-y-3 py-2'>
            <Skeleton className='h-5 w-2/3' />
            <Skeleton className='h-5 w-1/2' />
            <Skeleton className='h-20 w-full' />
          </div>
        ) : detail ? (
          <div className='max-h-[70vh] space-y-4 overflow-y-auto py-1'>
            <div className='space-y-1 text-sm'>
              <p>
                <span className='text-muted-foreground'>Seans Tipi: </span>
                <span className='font-medium'>{detail.session_offering_name}</span>
                {detail.variant_label && (
                  <span className='text-muted-foreground'> ({detail.variant_label})</span>
                )}
              </p>
              {detail.session_type_name && (
                <p>
                  <span className='text-muted-foreground'>Seans Türü: </span>
                  {detail.session_type_name}
                </p>
              )}
              <p>
                <span className='text-muted-foreground'>Tarih & Saat: </span>
                {(() => {
                  const start = parse(`${detail.date} ${detail.time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
                  return `${format(start, 'dd MMM yyyy', { locale: tr })} · ${format(start, 'HH:mm')} (${detail.duration} dk)`
                })()}
              </p>
              <p>
                <span className='text-muted-foreground'>Kapasite: </span>
                {detail.approved_count}/{detail.capacity}
              </p>
              {detail.price != null && (
                <p>
                  <span className='text-muted-foreground'>Fiyat: </span>
                  {detail.price} {detail.currency ?? 'TRY'}
                </p>
              )}
              <p>
                <span className='text-muted-foreground'>Durum: </span>
                <Badge variant={detail.status === 'cancelled' ? 'destructive' : 'default'}>
                  {detail.status === 'scheduled' ? 'Planlandı' : detail.status === 'cancelled' ? 'İptal Edildi' : 'Tamamlandı'}
                </Badge>
              </p>
            </div>

            <Separator />

            <div>
              <p className='mb-2 text-sm font-medium'>Bekleyen Talepler ({pending.length})</p>
              {pending.length === 0 ? (
                <p className='text-muted-foreground text-sm'>Bekleyen bir talep yok.</p>
              ) : (
                <div className='space-y-2'>
                  {pending.map((p) => (
                    <div key={p.id} className='flex items-center justify-between rounded-md border p-2'>
                      <div className='text-sm'>
                        <div className='font-medium'>{p.client_name}</div>
                        <div className='text-muted-foreground text-xs'>
                          {p.client_email}
                          {p.client_recovery_status === 'in_recovery' && (
                            <span className='ml-1.5'>
                              <Badge variant='outline'>Ex-User Doğrulandı</Badge>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='flex gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 w-7 p-0'
                          disabled={actionLoadingId === p.id}
                          onClick={() => handleReview(p, 'rejected')}
                        >
                          <X className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          className='h-7 w-7 p-0'
                          disabled={actionLoadingId === p.id}
                          onClick={() => handleReview(p, 'approved')}
                        >
                          <Check className='h-3 w-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className='mb-2 text-sm font-medium'>Onaylanmış Katılımcılar ({approved.length})</p>
              {approved.length === 0 ? (
                <p className='text-muted-foreground text-sm'>Henüz onaylanmış katılımcı yok.</p>
              ) : (
                <div className='space-y-2'>
                  {approved.map((p) => (
                    <div key={p.id} className='flex items-center justify-between rounded-md border p-2 text-sm'>
                      <span className='font-medium'>{p.client_name}</span>
                      <Badge variant={p.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {p.payment_status === 'paid' ? 'Ödendi' : 'Ödeme Bekleniyor'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detail.waitlist.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className='mb-2 text-sm font-medium'>Bekleme Listesi ({detail.waitlist.length})</p>
                  <div className='space-y-2'>
                    {detail.waitlist.map((entry) => (
                      <div key={entry.id} className='flex items-center justify-between rounded-md border p-2 text-sm'>
                        <div>
                          <div className='font-medium'>{entry.client_name}</div>
                          <div className='text-muted-foreground text-xs'>{entry.client_email}</div>
                        </div>
                        <Badge variant='outline'>{entry.position}. sırada</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {rejected.length > 0 && (
              <div>
                <p className='mb-2 text-sm font-medium'>Reddedilenler ({rejected.length})</p>
                <div className='space-y-2'>
                  {rejected.map((p) => (
                    <div key={p.id} className='flex items-center justify-between rounded-md border p-2 text-sm'>
                      <span>{p.client_name}</span>
                      <Badge variant={participantBadgeVariant(p.status)}>
                        {PARTICIPANT_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.status === 'scheduled' && (
              <>
                <Separator />
                <div className='flex justify-end'>
                  <Button variant='destructive' size='sm' disabled={cancelling} onClick={handleCancel}>
                    Grup Seansını İptal Et
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
