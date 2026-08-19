import { Link, useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Giriş Yap</CardTitle>
          <CardDescription>
            Hesabınıza giriş yapmak için e-posta ve şifrenizi girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Giriş yaparak{' '}
            <Link
              to='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Hizmet Şartları
            </Link>{' '}
            ve{' '}
            <Link
              to='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Gizlilik Politikası
            </Link>
            'nı kabul etmiş olursunuz.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
