import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { getProfile, getDocumentUrl } from './api'
import { ExpertProfile } from './types'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import {
  getUniversityName,
  getDegreeLevelName,
  getMajorName,
  getServiceNames,
  getSpecializationNames,
  getApproachMethodNames,
  getTargetGroupNames,
  getSessionTypeNames,
  getLanguageNames,
  getAvailabilityStatus,
  getCurrencySymbol,
  getGenderName,
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

  const displayFirstName = profile?.user_data?.first_name || authUser?.first_name || ''
  const displayLastName = profile?.user_data?.last_name || authUser?.last_name || ''
  const displayEmail = authUser?.email || ''

  // Profil fotoğrafını bul
  const profilePhoto = profile?.documents?.find(doc => doc.type === 'profile_photo')
  const profilePhotoUrl = profilePhoto
    ? getDocumentUrl(profilePhoto.uid, profilePhoto.type, profilePhoto.filename)
    : undefined

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-muted-foreground'>Yükleniyor...</div>
      </div>
    )
  }

  const availabilityInfo = getAvailabilityStatus(profile?.availability_status || 'busy')

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
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
              <p className='text-sm'>{profile?.user_data?.phone_number || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Doğum Tarihi</p>
              <p className='text-sm'>{profile?.user_data?.birth_date || '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Cinsiyet</p>
              <p className='text-sm'>{profile?.user_data?.gender ? getGenderName(profile.user_data.gender) : '-'}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Ülke</p>
              <p className='text-sm'>{profile?.user_data?.country || '-'}</p>
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
              <Badge variant={availabilityInfo.color === 'green' ? 'default' : 'secondary'}>
                {availabilityInfo.label}
              </Badge>
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
              <p className='text-sm'>{getUniversityName(profile?.university || null)}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Derece</p>
              <p className='text-sm'>{getDegreeLevelName(profile?.degree_level || null)}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Bölüm</p>
              <p className='text-sm'>{getMajorName(profile?.major || null)}</p>
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
                getServiceNames(profile.services).map((service, idx) => (
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
                getSpecializationNames(profile.specializations).map((spec, idx) => (
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
                getApproachMethodNames(profile.approach_methods).map((method, idx) => (
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
                getTargetGroupNames(profile.target_groups).map((group, idx) => (
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
                {getCurrencySymbol(profile?.currency || 'TRY')} {profile?.session_price || '-'}
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
                getSessionTypeNames(profile.session_types).map((type, idx) => (
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
                getLanguageNames(profile.languages).map((lang, idx) => (
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
                      <p className='text-sm font-medium'>{doc.filename}</p>
                      <p className='text-xs text-muted-foreground'>
                        Tip: {doc.type} • {doc.verified ? '✓ Doğrulandı' : 'Doğrulanmadı'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Yüklenme: {new Date(doc.updated_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <a
                      href={getDocumentUrl(doc.uid, doc.type, doc.filename)}
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
