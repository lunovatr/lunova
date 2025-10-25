// src/features/dashboard/components/create-appointment-modal.tsx
import { useState, useMemo, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CalendarIcon, Clock } from 'lucide-react'
import { format, addMinutes, areIntervalsOverlapping, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createAppointment,
  CreateAppointmentRequest,
  getExpertIdFromUserAppointments,
  Appointment,
} from '../api'

const formSchema = z.object({
  client: z.number().min(1, 'Client ID 1 veya daha büyük olmalıdır'),
  date: z.date().refine((date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }, {
    message: 'Tarih bugünden önce olamaz'
  }),
  time: z.string().min(1, 'Saat seçiniz'),
  duration: z.number().min(15, 'Süre en az 15 dakika olmalıdır'),
  notes: z.string().optional(),
})

interface CreateAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingAppointments: Appointment[]
  onSuccess?: () => void
}

// Saat seçeneklerini component dışında bir sabit olarak tanımlamak daha verimlidir.
const timeOptions: Array<{ value: string; label: string }> = []
for (let hour = 9; hour <= 18; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    if (hour === 18 && minute > 0) break // 18:00'dan sonrası yok
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
    const displayTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    timeOptions.push({ value: timeString, label: displayTime })
  }
}

export function CreateAppointmentModal({
  open,
  onOpenChange,
  existingAppointments,
  onSuccess,
}: CreateAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client: 1, // 0 yerine 1 yapıyoruz
      date: new Date(), // undefined yerine bugünün tarihini varsayılan yapalım
      time: '',
      duration: 60,
      notes: '',
    },
  })

  // form.watch ile seçili tarih ve süreyi anlık olarak takip ediyoruz.
  // Bu sayede saat listesini dinamik olarak güncelleyebiliriz.
  const selectedDate = form.watch('date')
  const selectedDuration = form.watch('duration')

  // useMemo kullanarak, sadece bağımlılıklar değiştiğinde (tarih, süre, randevular)
  // uygun saat listesini yeniden hesaplıyoruz. Bu, performansı artırır.
  const availableTimeOptions = useMemo(() => {
    if (!selectedDate) return []

    // Seçilen güne ait, reddedilmemiş randevuları filtrele
    const appointmentsOnSelectedDay = existingAppointments.filter(
      (app) =>
        app.date === format(selectedDate, 'yyyy-MM-dd') &&
        app.status !== 'rejected'
    )

    // Eğer o gün hiç randevu yoksa, tüm saatler müsaittir.
    if (appointmentsOnSelectedDay.length === 0) {
      return timeOptions
    }

    // Saat seçeneklerini filtreleyerek sadece çakışmayanları döndür
    return timeOptions.filter((option) => {
      const potentialStartTime = parse(
        `${format(selectedDate, 'yyyy-MM-dd')} ${option.value}`,
        'yyyy-MM-dd HH:mm:ss',
        new Date()
      )
      const potentialEndTime = addMinutes(potentialStartTime, selectedDuration)

      // Mevcut randevulardan herhangi biriyle çakışıp çakışmadığını kontrol et
      const isConflicting = appointmentsOnSelectedDay.some((existingApp) => {
        const existingStartTime = parse(
          `${existingApp.date} ${existingApp.time}`,
          'yyyy-MM-dd HH:mm:ss',
          new Date()
        )
        const existingEndTime = addMinutes(existingStartTime, existingApp.duration)

        return areIntervalsOverlapping(
          { start: potentialStartTime, end: potentialEndTime },
          { start: existingStartTime, end: existingEndTime },
          { inclusive: false } // Bitiş ve başlangıç anları aynıysa çakışma sayma
        )
      })

      return !isConflicting // Çakışmıyorsa bu saati listede tut
    })
  }, [selectedDate, selectedDuration, existingAppointments])

  // Eğer kullanıcı tarih veya süreyi değiştirdiğinde seçili olan saat
  // artık uygun değilse, saat alanını temizle.
  useEffect(() => {
    const currentTime = form.getValues('time')
    if (currentTime && !availableTimeOptions.some((o) => o.value === currentTime)) {
      form.setValue('time', '', { shouldValidate: true })
    }
  }, [availableTimeOptions, form])

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      // Önce expert ID'sini al
      const expertId = await getExpertIdFromUserAppointments()
      
      if (!expertId) {
        toast.error('Expert ID alınamadı. Lütfen daha sonra tekrar deneyin.')
        return
      }

      const appointmentData: CreateAppointmentRequest = {
        expert: expertId, // Dinamik olarak alınan expert ID
        client: data.client,
        date: format(data.date, 'yyyy-MM-dd'), // Bu format doğru: 2025-09-01
        time: data.time,
        duration: data.duration,
        notes: data.notes || undefined,
      }

      console.log('Creating appointment with data:', appointmentData)
      await createAppointment(appointmentData, existingAppointments)
      toast.success('Randevu başarıyla oluşturuldu!')
      form.reset({
        client: 1, // Reset ederken de 1 yapıyoruz
        date: new Date(), // undefined yerine yeni tarih
        time: '',
        duration: 60,
        notes: '',
      })
      onOpenChange(false)

      // Callback ile veriyi yenile, sayfa reload etme
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Appointment creation error:', error)
      toast.error(`Randevu oluşturma hatası: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Randevu Oluştur</DialogTitle>
          <DialogDescription>
            Yeni bir randevu oluşturmak için aşağıdaki bilgileri doldurunuz.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="Client ID giriniz"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1 // 0 yerine 1
                        if (value >= 1) { // 0 yerine 1
                          field.onChange(value)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tarih</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: tr })
                          ) : (
                            <span>Tarih seçiniz</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        // onSelect hem tarihi günceller hem de saat listesinin yeniden hesaplanmasını tetikler.
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saat</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Saat seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Sadece uygun olan saatleri gösteriyoruz */}
                      {availableTimeOptions.length > 0 ? (
                        availableTimeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        // Eğer hiç uygun saat yoksa kullanıcıyı bilgilendir
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Bu tarih için uygun saat bulunmamaktadır.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Süre (dakika)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Süre seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 dakika</SelectItem>
                      <SelectItem value="30">30 dakika</SelectItem>
                      <SelectItem value="45">45 dakika</SelectItem>
                      <SelectItem value="60">1 saat</SelectItem>
                      <SelectItem value="90">1.5 saat</SelectItem>
                      <SelectItem value="120">2 saat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Randevu ile ilgili notlarınızı yazabilirsiniz..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}