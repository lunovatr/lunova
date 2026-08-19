import { Link } from '@tanstack/react-router'

type LegalPageProps = {
  title: string
}

// İçerik henüz eklenmedi — bu sadece altyapı (route + görsel çerçeve).
// Gerçek metin (Hizmet Şartları / Gizlilik Politikası) ayrıca eklenecek.
export function LegalPage({ title }: LegalPageProps) {
  return (
    <div className='container mx-auto max-w-3xl px-6 py-12'>
      <Link to='/sign-in' className='mb-8 inline-block'>
        <img
          src='/images/logo/logo-black-red.png'
          alt='Lunova'
          width={120}
          height={32}
          className='h-8 w-auto dark:brightness-0 dark:invert'
        />
      </Link>

      <h1 className='mb-6 text-2xl font-bold tracking-tight'>{title}</h1>

      <p className='text-muted-foreground text-sm italic'>
        İçerik yakında eklenecektir.
      </p>

      <Link
        to='/sign-in'
        className='text-primary mt-10 inline-block text-sm font-medium hover:underline'
      >
        ← Giriş sayfasına dön
      </Link>
    </div>
  )
}
