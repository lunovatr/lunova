import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import api from '@/lib/api'

const formSchema = z
  .object({
    first_name: z.string().min(1, 'İsim gerekli'),
    last_name: z.string().min(1, 'Soyisim gerekli'),
    email: z.email({
      error: (iss) =>
        iss.input === '' ? 'E-posta adresinizi girin' : undefined,
    }),
    password: z
      .string()
      .min(1, 'Şifrenizi girin')
      .min(7, 'Şifre en az 7 karakter olmalıdır'),
    password2: z.string().min(1, 'Şifrenizi tekrar girin'),
    phone_number: z.string().min(1, 'Telefon numarası gerekli').regex(/^[0-9]{11}$/, 'Telefon numarası 11 haneli olmalıdır'),
    is_turkish_citizen: z.boolean(),
    id_number: z.string().optional(),
    national_id: z.string().optional(),
    country: z.string().min(1, 'Ülke seçimi gerekli'),
    university: z.string().min(1, 'Üniversite bilgisi gerekli'),
    about: z.string().min(1, 'Hakkında bilgisi gerekli'),
    gender_id: z.number().min(1, 'Cinsiyet seçimi gerekli'),
    birth_date: z.date().min(new Date('1900-01-01'), 'Geçerli bir doğum tarihi girin'),
  })
  .refine((data) => data.password === data.password2, {
    message: "Şifreler eşleşmiyor.",
    path: ['password2'],
  })
  .refine((data) => {
    if (!data.is_turkish_citizen) {
      return data.id_number && data.id_number.length === 11;
    } else {
      return data.national_id && data.national_id.length > 0;
    }
  }, {
    message: "TC vatandaşı iseniz TC Kimlik No, değilseniz Pasaport No gerekli",
    path: ['id_number'],
  })

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password2: '',
      phone_number: '',
      is_turkish_citizen: false,
      id_number: '',
      national_id: '',
      country: 'TR',
      university: '',
      about: '',
      gender_id: 1,
      birth_date: undefined,
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      await api.post('/api/v1/accounts/register/expert/', {
        ...data,
        role: 'expert',
        // Convert date to ISO string for API
        birth_date: data.birth_date ? data.birth_date.toISOString().split('T')[0] : undefined,
      })
      
      // Başarılı kayıt sonrası e-posta adresini localStorage'a kaydet
      localStorage.setItem('registered_email', data.email)
      
      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.')
      navigate({ to: '/sign-in' })
    } catch (err: any) {
      if (err.response?.data && typeof err.response.data === 'object') {
        // Form hatalarını form state'ine aktar
        Object.keys(err.response.data).forEach((key) => {
          if (key in form.getValues()) {
            form.setError(key as any, {
              type: 'server',
              message: err.response.data[key].join(', '),
            })
          }
        })
      } else {
        toast.error('Kayıt başarısız.')
      }
      console.log(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name='first_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>İsim</FormLabel>
                <FormControl>
                  <Input placeholder='İsim' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='last_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soyisim</FormLabel>
                <FormControl>
                  <Input placeholder='Soyisim' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifre</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='********' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password2'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şifre (Tekrar)</FormLabel>
                <FormControl>
                  <PasswordInput placeholder='********' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='phone_number'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon Numarası</FormLabel>
              <FormControl>
                <Input placeholder='90 000 000 0000' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='is_turkish_citizen'
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>TC Vatandaşı Değilim</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {!form.watch('is_turkish_citizen') ? (
          <FormField
            control={form.control}
            name='id_number'
            render={({ field }) => (
              <FormItem>
                <FormLabel>TC Kimlik No</FormLabel>
                <FormControl>
                  <Input placeholder='11 Haneli TC Kimlik No' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name='national_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pasaport No</FormLabel>
                <FormControl>
                  <Input placeholder='Pasaport numaranızı girin' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name='country'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ülke</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Ülke seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TR">Türkiye</SelectItem>
                    <SelectItem value="US">Amerika Birleşik Devletleri</SelectItem>
                    <SelectItem value="GB">Birleşik Krallık</SelectItem>
                    <SelectItem value="DE">Almanya</SelectItem>
                    <SelectItem value="FR">Fransa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='gender_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cinsiyet</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Cinsiyet seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Erkek</SelectItem>
                    <SelectItem value="2">Kadın</SelectItem>
                    <SelectItem value="3">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='birth_date'
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Doğum Tarihi</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: tr })
                      ) : (
                        <span>Doğum tarihi seçin</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormField
            control={form.control}
            name='university'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Üniversite</FormLabel>
                <FormControl>
                  <Input placeholder='İstanbul Üniversitesi' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='about'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hakkında</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='Uzman psikolog' 
                    className="resize-none"
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


        </div>



        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? 'Kayıt Olunuyor...' : 'Hesap Oluştur'}
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              Veya devam et
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            className='w-full'
            type='button'
            disabled={isLoading}
          >
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button
            variant='outline'
            className='w-full'
            type='button'
            disabled={isLoading}
          >
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
