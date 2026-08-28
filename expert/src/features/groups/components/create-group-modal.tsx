// src/features/groups/components/create-group-modal.tsx
//
// Uzmanın "müsaitlik" oluşturduğu adım (Faz 4, Frontend Yapılandırması planı) -
// bir GroupSession slotu açar, danışanlar buna talep gönderir. Basit kontrollü
// state kullanıyor (react-hook-form/zod'un create-appointment-modal.tsx'teki
// ağırlığı burada gerekmiyor - alanlar sade select/input'lar).
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createGroupSession,
  getGroupEligibleOfferings,
  getSessionTypes,
  type SessionOfferingOption,
  type SessionTypeOption,
} from '../api'

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateGroupModal({ open, onOpenChange, onSuccess }: CreateGroupModalProps) {
  const [offerings, setOfferings] = useState<SessionOfferingOption[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionTypeOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const [offeringId, setOfferingId] = useState<string>('')
  const [sessionTypeId, setSessionTypeId] = useState<string>('')
  const [variantId, setVariantId] = useState<string>('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('90')
  const [capacity, setCapacity] = useState('8')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingOptions(true)
    Promise.all([getGroupEligibleOfferings(), getSessionTypes()])
      .then(([offeringsRes, typesRes]) => {
        setOfferings(offeringsRes)
        setSessionTypes(typesRes)
        if (offeringsRes.length > 0) setOfferingId(String(offeringsRes[0].id))
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoadingOptions(false))
  }, [open])

  const selectedOffering = offerings.find((o) => String(o.id) === offeringId)

  useEffect(() => {
    // Seans tipi değişince, artık geçerli olmayan bir varyant seçili kalmasın.
    setVariantId('')
  }, [offeringId])

  const resetForm = () => {
    setOfferingId(offerings.length > 0 ? String(offerings[0].id) : '')
    setSessionTypeId('')
    setVariantId('')
    setDate('')
    setTime('')
    setDuration('90')
    setCapacity('8')
  }

  const handleSubmit = async () => {
    if (!offeringId || !date || !time || !duration || !capacity) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.')
      return
    }

    setSubmitting(true)
    try {
      await createGroupSession({
        session_offering: Number(offeringId),
        session_type: sessionTypeId ? Number(sessionTypeId) : null,
        variant: variantId ? Number(variantId) : null,
        date,
        time: `${time}:00`,
        duration: Number(duration),
        capacity: Number(capacity),
      })
      toast.success('Grup seansı oluşturuldu.')
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Yeni Grup Seansı Oluştur</DialogTitle>
          <DialogDescription>
            Danışanların talep gönderebileceği bir grup terapisi/psikoeğitim slotu açın.
          </DialogDescription>
        </DialogHeader>

        {loadingOptions ? (
          <p className='text-muted-foreground text-sm'>Yükleniyor...</p>
        ) : offerings.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            Şu anda grup seansı olarak açılabilecek aktif bir seans tipi tanımlı değil.
          </p>
        ) : (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Seans Tipi</Label>
              <Select value={offeringId} onValueChange={setOfferingId}>
                <SelectTrigger>
                  <SelectValue placeholder='Seans tipi seçin' />
                </SelectTrigger>
                <SelectContent>
                  {offerings.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOffering && selectedOffering.variants.length > 0 && (
              <div className='space-y-2'>
                <Label>Varyant (opsiyonel)</Label>
                <Select value={variantId} onValueChange={setVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder='Genel (varyantsız)' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOffering.variants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.variant_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className='space-y-2'>
              <Label>Seans Türü (opsiyonel)</Label>
              <Select value={sessionTypeId} onValueChange={setSessionTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder='Belirtilmemiş' />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>Tarih</Label>
                <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className='space-y-2'>
                <Label>Saat</Label>
                <Input type='time' value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>Süre (dakika)</Label>
                <Input
                  type='number'
                  min={15}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label>Kapasite</Label>
                <Input
                  type='number'
                  min={2}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            İptal
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={submitting || loadingOptions || offerings.length === 0}
          >
            {submitting ? 'Oluşturuluyor...' : 'Grup Seansı Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
