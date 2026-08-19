import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Hesap Oluştur
          </CardTitle>
          <CardDescription>
            Hesap oluşturmak için bilgilerinizi girin. <br />
            Zaten hesabınız var mı?{' '}
            <Link
              to='/sign-in'
              className='hover:text-primary underline underline-offset-4'
            >
              Giriş Yap
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            Hesap oluşturarak{' '}
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
