import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { useAuthStore } from '@/stores/auth-store'
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

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'E-posta adresinizi girin' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Şifrenizi girin')
    .min(7, 'Şifre en az 7 karakter olmalıdır'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    const registeredEmail = localStorage.getItem('registered_email')
    if (registeredEmail) {
      form.setValue('email', registeredEmail)
      localStorage.removeItem('registered_email')
    }
  }, [form])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.post('/api/v1/accounts/login/', {
        email: data.email,
        password: data.password,
      })

      // API'den gelen kullanıcı bilgilerini kullan
      const userData = response.data
      const user = {
        accountNo: userData.account_no || 'ACC001',
        email: data.email,
        role: userData.role || ['expert'],
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      }

      // Set user and access token
      auth.setUser(user)
      auth.setAccessToken(userData.access_token || 'access-token')

      toast.success(`Hoş geldiniz, ${data.email}!`)

      // Redirect to the stored location or default to dashboard
      const targetPath = redirectTo || '/'
      navigate({ to: targetPath, replace: true })
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Giriş başarısız.'
      setError(errorMessage)
      toast.error(errorMessage)
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
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Şifre</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75'
              >
                Şifremi unuttum?
              </Link>
            </FormItem>
          )}
        />
        {error && <div className='text-red-600 text-sm'>{error}</div>}
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Giriş Yap
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
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
