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
import api from '@/lib/api'

const formSchema = z
  .object({
    first_name: z.string().min(1, 'İsim gerekli'),
    last_name: z.string().min(1, 'Soyisim gerekli'),
    email: z.email({
      error: (iss) =>
        iss.input === '' ? 'E-posta adresinizi girin' : undefined,
    }),
    gsm_no: z.string().min(1, 'Telefon numarası gerekli'),
    tc_kimlik: z.string().min(1, 'TC Kimlik No gerekli'),
    password: z
      .string()
      .min(1, 'Şifrenizi girin')
      .min(7, 'Şifre en az 7 karakter olmalıdır'),
    password2: z.string().min(1, 'Şifrenizi tekrar girin'),
  })
  .refine((data) => data.password === data.password2, {
    message: "Şifreler eşleşmiyor.",
    path: ['password2'],
  })

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      gsm_no: '',
      tc_kimlik: '',
      password: '',
      password2: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setErrors({})

    try {
      await api.post('/api/v1/accounts/register/', {
        ...data,
        role: 'expert',
      })
      
      // Başarılı kayıt sonrası e-posta adresini localStorage'a kaydet
      localStorage.setItem('registered_email', data.email)
      
      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.')
      navigate({ to: '/sign-in' })
    } catch (err: any) {
      if (err.response?.data && typeof err.response.data === 'object') {
        setErrors(err.response.data)
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
        <FormField
          control={form.control}
          name='gsm_no'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon Numarası</FormLabel>
              <FormControl>
                <Input placeholder='Telefon Numarası' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='tc_kimlik'
          render={({ field }) => (
            <FormItem>
              <FormLabel>TC Kimlik No</FormLabel>
              <FormControl>
                <Input placeholder='TC Kimlik No' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
