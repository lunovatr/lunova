import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { Search } from '@/components/search'
import { ConfigDrawer } from '@/components/config-drawer'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { getProfile } from './api'
import { ExpertProfile } from './types'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import {
  DocumentType,
  DOCUMENT_TYPE_LABEL,
  getGenderName,
  STATUS_CONFIG
} from './maps'

export function ProfileView() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ExpertProfile | null>(null)
  const { user: authUser } = useAuthGuard()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const data = await getProfile()

        if (data) {
          setProfile(data as ExpertProfile)
        }
      } catch (error) {
        console.error('Profil yüklenemedi:', error)
      } finally {
        setLoading(false)
      }
    }

    if (authUser) {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser])

  // Kullanıcı adının baş harflerini al
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const displayFirstName = profile?.user?.first_name || authUser?.first_name || ''
  const displayLastName = profile?.user?.last_name || authUser?.last_name || ''
  const displayEmail = authUser?.email || ''

  // Profil fotoğrafını bul
  const profilePhoto = profile?.documents?.find(doc => doc.type === 'profile_photo')
  const profilePhotoUrl = profilePhoto
    ? profilePhoto.access_url
    : undefined

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-muted-foreground'>Yükleniyor...</div>
      </div>
    )
  }

  const topNav = [
    { title: 'Overview', href: 'dashboard/overview', isActive: true, disabled: false },
    { title: 'Customers', href: 'dashboard/customers', isActive: false, disabled: true },
    { title: 'Products', href: 'dashboard/products', isActive: false, disabled: true },
    { title: 'Settings', href: 'dashboard/settings', isActive: false, disabled: true },
  ]

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Profil</h2>
          <p className='text-sm text-muted-foreground'>
            Profil bilgilerinizi görüntüleyin
          </p>
        </div>
        <Link to='/update-profile'>
          <Button>Profili Düzenle</Button>
        </Link>
      </div>

      <Separator />

      {/* Genel Bilgiler */}
      <Card>
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Avatar ve İsim */}
          <div className='flex items-center gap-4'>
            <Avatar className='h-20 w-20'>
              <AvatarImage src={profilePhotoUrl} alt={`${displayFirstName} ${displayLastName}`} />
              <AvatarFallback>
                {displayFirstName && displayLastName ? getInitials(displayFirstName, displayLastName) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className='text-xl font-semibold'>
                {displayFirstName} {displayLastName}
              </h3>
              {profile?.title && (
                <p className='text-sm text-muted-foreground'>{profile.title}</p>
              )}
              <p className='text-sm text-muted-foreground'>{displayEmail}</p>
            </div>
          </div>

          {/* Kişisel Bilgiler */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Telefon</p>
              <p className='text-sm'>{profile?.user?.phone_number || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Doğum Tarihi</p>
              <p className='text-sm'>{profile?.user?.birth_date || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Cinsiyet</p>
              <p className='text-sm'>{profile?.user?.gender ? getGenderName(profile.user.gender) : '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Ülke</p>
              <p className='text-sm'>{profile?.user?.country || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profesyonel Bilgiler */}
      <Card>
        <CardHeader>
          <CardTitle>Profesyonel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Deneyim (Yıl)</p>
              <p className='text-sm'>{profile?.experience_years || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Lisans Numarası</p>
              <p className='text-sm'>{profile?.license_number || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Kurum</p>
              <p className='text-sm'>{profile?.institution || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Müsaitlik Durumu</p>
              {profile?.availability_status && (
                <Badge variant={STATUS_CONFIG[profile.availability_status as keyof typeof STATUS_CONFIG]?.variant || "secondary"}>
                  {STATUS_CONFIG[profile.availability_status as keyof typeof STATUS_CONFIG]?.label || "Bilinmiyor"}
                </Badge>
              )}
            </div>
          </div>

          {profile?.about && (
            <div>
              <p className='text-sm font-medium text-muted-foreground mb-2'>Hakkında</p>
              <p className='text-sm'>{profile.about}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eğitim Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle>Eğitim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Üniversite</p>
              <p className='text-sm'>{profile?.university}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Derece</p>
              <p className='text-sm'>{profile?.degree_level}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Bölüm</p>
              <p className='text-sm'>{profile?.major}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hizmetler ve Uzmanlıklar */}
      <Card>
        <CardHeader>
          <CardTitle>Hizmetler ve Uzmanlıklar</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Hizmetler</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.services && profile.services.length > 0 ? (
                profile.services.map((service, idx) => (
                  <Badge key={idx} variant='outline'>{service}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>

          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Uzmanlık Alanları</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.specializations && profile.specializations.length > 0 ? (
                profile.specializations.map((spec, idx) => (
                  <Badge key={idx} variant='outline'>{spec}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>

          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Yaklaşım Metodları</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.approach_methods && profile.approach_methods.length > 0 ? (
                profile.approach_methods.map((method, idx) => (
                  <Badge key={idx} variant='outline'>{method}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>

          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Hedef Gruplar</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.target_groups && profile.target_groups.length > 0 ? (
                profile.target_groups.map((group, idx) => (
                  <Badge key={idx} variant='outline'>{group}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seans Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle>Seans Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Seans Ücreti</p>
              <p className='text-sm font-semibold'>
                {profile?.currency} {profile?.session_price || '-'}
              </p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Seans Süresi</p>
              <p className='text-sm'>{profile?.appointment_duration || '-'} dakika</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>İlk Seans Ücretsiz</p>
              <p className='text-sm'>{profile?.free_first_session ? 'Evet' : 'Hayır'}</p>
            </div>
          </div>

          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Seans Tipleri</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.session_types && profile.session_types.length > 0 ? (
                profile.session_types.map((type, idx) => (
                  <Badge key={idx} variant='outline'>{type}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>

          <div>
            <p className='text-sm font-medium text-muted-foreground mb-2'>Diller</p>
            <div className='flex flex-wrap gap-2'>
              {profile?.languages && profile.languages.length > 0 ? (
                profile.languages.map((lang, idx) => (
                  <Badge key={idx} variant='outline'>{lang}</Badge>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Belgeler */}
      {profile?.documents && profile.documents.filter(doc => doc.type !== 'profile_photo').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Belgeler</CardTitle>
            <CardDescription>Yüklenen belgeleriniz</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {profile.documents
                .filter(doc => doc.type !== 'profile_photo')
                .map((doc) => (
                  <div key={doc.uid} className='flex items-center justify-between p-3 border rounded-lg'>
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>{doc.original_filename}</p>
                      <p className='text-xs text-muted-foreground'>
                        Tip: {DOCUMENT_TYPE_LABEL[doc.type as DocumentType] || doc.type} • {doc.verified ? '✓ Doğrulandı' : 'Doğrulanmadı'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Yüklenme: {new Date(doc.updated_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <a
                      href={doc.access_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm text-blue-600 hover:underline'
                    >
                      Görüntüle
                    </a>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </Main>
    </>
  )
}
