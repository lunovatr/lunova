import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfile, updateProfile, uploadDocument, getDocumentUrl } from './api'
import { ExpertProfile, ExpertProfileUpdatePayload } from './types'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import {
  UNIVERSITIES,
  DEGREE_LEVELS,
  MAJORS,
  SERVICES,
  SPECIALIZATIONS,
  APPROACH_METHODS,
  TARGET_GROUPS,
  SESSION_TYPES,
  LANGUAGES,
  CURRENCIES,
} from './maps'

// Form validation schema
const profileFormSchema = z.object({
  // Professional Info
  about: z.string().max(1000, 'Hakkında bölümü en fazla 1000 karakter olabilir.').optional(),
  title: z.string().max(100).optional(),
  experience_years: z.coerce.number().min(0).max(50).optional(),
  license_number: z.string().max(50).optional(),
  institution: z.string().max(200).optional(),

  // Education
  university: z.coerce.number().optional(),
  degree_level: z.coerce.number().optional(),
  major: z.coerce.number().optional(),

  // Services & Specializations (as arrays of numbers)
  services: z.array(z.number()).optional(),
  specializations: z.array(z.number()).optional(),
  approach_methods: z.array(z.number()).optional(),
  target_groups: z.array(z.number()).optional(),

  // Session Info
  session_price: z.string().optional(),
  currency: z.string().optional(),
  appointment_duration: z.coerce.number().min(30, 'Seans süresi en az 30 dakika olmalıdır').max(50, 'Seans süresi en fazla 50 dakika olabilir').optional(),
  free_first_session: z.boolean().optional(),
  session_types: z.array(z.number()).optional(),
  languages: z.array(z.string()).optional(),

  // Other
  availability_status: z.string().optional(),
  video_intro_url: z.string().url('Geçerli bir URL giriniz').or(z.literal('')).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ExpertProfile | null>(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const { user: authUser } = useAuthGuard()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      about: '',
      title: '',
      experience_years: 0,
      license_number: '',
      institution: '',
      university: undefined,
      degree_level: undefined,
      major: undefined,
      services: [],
      specializations: [],
      approach_methods: [],
      target_groups: [],
      session_price: '',
      currency: 'TRY',
      appointment_duration: 45,
      free_first_session: false,
      session_types: [],
      languages: [],
      availability_status: 'busy',
      video_intro_url: '',
    },
    mode: 'onChange',
  })

  // Profil bilgilerini yükle
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const data = await getProfile()

        if (data) {
          const expertData = data as ExpertProfile
          setProfile(expertData)

          // Form değerlerini güncelle
          form.reset({
            about: expertData.about || '',
            title: expertData.title || '',
            experience_years: expertData.experience_years || 0,
            license_number: expertData.license_number || '',
            institution: expertData.institution || '',
            university: expertData.university || undefined,
            degree_level: expertData.degree_level || undefined,
            major: expertData.major || undefined,
            services: expertData.services || [],
            specializations: expertData.specializations || [],
            approach_methods: expertData.approach_methods || [],
            target_groups: expertData.target_groups || [],
            session_price: expertData.session_price || '',
            currency: expertData.currency || 'TRY',
            appointment_duration: expertData.appointment_duration || 45,
            free_first_session: expertData.free_first_session || false,
            session_types: expertData.session_types || [],
            languages: expertData.languages || [],
            availability_status: expertData.availability_status || 'busy',
            video_intro_url: expertData.video_intro_url || '',
          })

          // Profil fotoğrafını preview olarak ayarla
          const profilePhoto = expertData.documents?.find(doc => doc.type === 'profile_photo')
          if (profilePhoto) {
            setProfilePhotoPreview(getDocumentUrl(profilePhoto.uid, profilePhoto.type, profilePhoto.filename))
          }
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

  // Profil fotoğrafı seçme
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhotoFile(file)
      // Preview için local URL oluştur
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Profil fotoğrafı yükleme
  const handleUploadProfilePhoto = async () => {
    if (!profilePhotoFile) return

    try {
      setIsUploadingPhoto(true)
      await uploadDocument(profilePhotoFile, 'profile_photo')
      setProfilePhotoFile(null)
      // Profili yeniden yükle
      const data = await getProfile()
      if (data) {
        setProfile(data as ExpertProfile)
      }
    } catch (error) {
      console.error('Profil fotoğrafı yüklenemedi:', error)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Belge yükleme
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingDocument(true)
      await uploadDocument(file, type)
      // Profili yeniden yükle
      const data = await getProfile()
      if (data) {
        setProfile(data as ExpertProfile)
      }
      // Input'u temizle
      e.target.value = ''
    } catch (error) {
      console.error('Belge yüklenemedi:', error)
    } finally {
      setIsUploadingDocument(false)
    }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const payload: ExpertProfileUpdatePayload = {
        about: data.about,
        title: data.title,
        experience_years: data.experience_years,
        license_number: data.license_number,
        institution: data.institution,
        university: data.university,
        degree_level: data.degree_level,
        major: data.major,
        services: data.services,
        specializations: data.specializations,
        approach_methods: data.approach_methods,
        target_groups: data.target_groups,
        session_price: data.session_price,
        currency: data.currency,
        appointment_duration: data.appointment_duration,
        free_first_session: data.free_first_session,
        session_types: data.session_types,
        languages: data.languages,
        availability_status: data.availability_status,
        video_intro_url: data.video_intro_url,
      }

      const updatedProfile = await updateProfile(payload)
      setProfile(updatedProfile as ExpertProfile)
    } catch (error) {
      console.error('Profil güncellenemedi:', error)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-muted-foreground'>Yükleniyor...</div>
      </div>
    )
  }

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
      <div className='flex items-center gap-4'>
        <Link to='/profile'>
          <Button variant='ghost' size='icon'>
            <ArrowLeft className='h-5 w-5' />
          </Button>
        </Link>
        <div>
          <h2 className='text-2xl font-bold'>Profili Düzenle</h2>
          <p className='text-sm text-muted-foreground'>
            Profil bilgilerinizi güncelleyin
          </p>
        </div>
      </div>

      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>

          {/* Profil Fotoğrafı */}
          <Card>
            <CardHeader>
              <CardTitle>Profil Fotoğrafı</CardTitle>
              <CardDescription>Profil fotoğrafınızı yükleyin</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-6'>
                <Avatar className='h-24 w-24'>
                  <AvatarImage src={profilePhotoPreview || undefined} />
                  <AvatarFallback>
                    {authUser?.first_name?.[0]}{authUser?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 space-y-2'>
                  <div className='flex items-center gap-2'>
                    <label
                      htmlFor='profile-photo-input'
                      className='inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors'
                    >
                      <Paperclip className='h-4 w-4' />
                      <span className='text-sm'>
                        {profilePhotoFile ? profilePhotoFile.name : 'Fotoğraf Seç'}
                      </span>
                    </label>
                    <Input
                      id='profile-photo-input'
                      type='file'
                      accept='image/*'
                      onChange={handleProfilePhotoChange}
                      disabled={isUploadingPhoto}
                      className='hidden'
                    />
                  </div>
                  {profilePhotoFile && (
                    <Button
                      type='button'
                      onClick={handleUploadProfilePhoto}
                      disabled={isUploadingPhoto}
                      size='sm'
                    >
                      {isUploadingPhoto ? 'Yükleniyor...' : 'Fotoğrafı Yükle'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profesyonel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Profesyonel Bilgiler</CardTitle>
              <CardDescription>Mesleki bilgileriniz ve deneyimleriniz</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unvan</FormLabel>
                    <FormControl>
                      <Input placeholder='Örn: Uzman Psikolog' {...field} />
                    </FormControl>
                    <FormDescription>Profesyonel unvanınız</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='experience_years'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deneyim (Yıl)</FormLabel>
                    <FormControl>
                      <Input type='number' min='0' max='50' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='license_number'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lisans Numarası</FormLabel>
                    <FormControl>
                      <Input placeholder='TR-1234' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='institution'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kurum</FormLabel>
                    <FormControl>
                      <Input placeholder='Çalıştığınız kurum' {...field} />
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
                        placeholder='Kendinizi tanıtın...'
                        className='resize-none'
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Profesyonel deneyimleriniz ve yaklaşımlarınız hakkında bilgi verin
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='availability_status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Müsaitlik Durumu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Durum seçiniz' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='available'>Müsait</SelectItem>
                        <SelectItem value='busy'>Meşgul</SelectItem>
                        <SelectItem value='limited'>Sınırlı Müsaitlik</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Eğitim Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle>Eğitim Bilgileri</CardTitle>
              <CardDescription>Akademik geçmişiniz</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='university'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Üniversite</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Üniversite seçiniz' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(UNIVERSITIES).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='degree_level'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Derece</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Derece seçiniz' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DEGREE_LEVELS).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='major'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bölüm</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Bölüm seçiniz' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MAJORS).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Hizmetler ve Uzmanlıklar */}
          <Card>
            <CardHeader>
              <CardTitle>Hizmetler ve Uzmanlıklar</CardTitle>
              <CardDescription>Sunduğunuz hizmetler ve uzmanlık alanlarınız</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <FormField
                control={form.control}
                name='services'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Hizmetler</FormLabel>
                      <FormDescription>Sunduğunuz hizmetleri seçiniz</FormDescription>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {Object.entries(SERVICES).map(([id, label]) => (
                        <FormField
                          key={id}
                          control={form.control}
                          name='services'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(Number(id))}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], Number(id)])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== Number(id))
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='specializations'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Uzmanlık Alanları</FormLabel>
                      <FormDescription>Uzman olduğunuz alanları seçiniz</FormDescription>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {Object.entries(SPECIALIZATIONS).map(([id, label]) => (
                        <FormField
                          key={id}
                          control={form.control}
                          name='specializations'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(Number(id))}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], Number(id)])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== Number(id))
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='approach_methods'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Yaklaşım Metodları</FormLabel>
                      <FormDescription>Kullandığınız terapi yaklaşımlarını seçiniz</FormDescription>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {Object.entries(APPROACH_METHODS).map(([id, label]) => (
                        <FormField
                          key={id}
                          control={form.control}
                          name='approach_methods'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(Number(id))}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], Number(id)])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== Number(id))
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='target_groups'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Hedef Gruplar</FormLabel>
                      <FormDescription>Çalıştığınız yaş gruplarını ve kitle türlerini seçiniz</FormDescription>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {Object.entries(TARGET_GROUPS).map(([id, label]) => (
                        <FormField
                          key={id}
                          control={form.control}
                          name='target_groups'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(Number(id))}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], Number(id)])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== Number(id))
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seans Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle>Seans Bilgileri</CardTitle>
              <CardDescription>Seans ücretleri ve seçenekler</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='session_price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seans Ücreti</FormLabel>
                      <FormControl>
                        <Input type='number' step='0.01' min='0' placeholder='450.00' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='currency'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Para Birimi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Para birimi' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CURRENCIES).map(([code, symbol]) => (
                            <SelectItem key={code} value={code}>{code} ({symbol})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='appointment_duration'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seans Süresi (Dakika)</FormLabel>
                    <FormControl>
                      <Input type='number' min='30' max='50' step='5' {...field} />
                    </FormControl>
                    <FormDescription>Bir seansın süresi (30-50 dakika arası)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='free_first_session'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>İlk Seans Ücretsiz</FormLabel>
                      <FormDescription>
                        İlk görüşmeyi ücretsiz olarak sunuyorsanız işaretleyin
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='session_types'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Seans Tipleri</FormLabel>
                      <FormDescription>Sunduğunuz seans tiplerini seçiniz</FormDescription>
                    </div>
                    <div className='space-y-2'>
                      {Object.entries(SESSION_TYPES).map(([id, label]) => (
                        <FormField
                          key={id}
                          control={form.control}
                          name='session_types'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={id}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(Number(id))}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], Number(id)])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== Number(id))
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='languages'
                render={() => (
                  <FormItem>
                    <div className='mb-4'>
                      <FormLabel>Diller</FormLabel>
                      <FormDescription>Hangi dillerde hizmet veriyorsunuz?</FormDescription>
                    </div>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                      {Object.entries(LANGUAGES).map(([code, label]) => (
                        <FormField
                          key={code}
                          control={form.control}
                          name='languages'
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={code}
                                className='flex flex-row items-start space-x-3 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(code)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], code])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== code)
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Diğer */}
          <Card>
            <CardHeader>
              <CardTitle>Diğer Bilgiler</CardTitle>
              <CardDescription>Ek bilgiler</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='video_intro_url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanıtım Videosu URL</FormLabel>
                    <FormControl>
                      <Input placeholder='https://youtube.com/...' {...field} />
                    </FormControl>
                    <FormDescription>
                      Kendinizi tanıtan bir video varsa URL'sini giriniz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Belgeler */}
          <Card>
            <CardHeader>
              <CardTitle>Belgeler</CardTitle>
              <CardDescription>Mesleki belgelerinizi yükleyin (diploma, sertifika, vb.)</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Mevcut Belgeler */}
              {profile?.documents && profile.documents.filter(doc => doc.type !== 'profile_photo').length > 0 && (
                <div className='space-y-2 mb-4'>
                  <h4 className='text-sm font-medium'>Yüklenen Belgeler</h4>
                  {profile.documents
                    .filter(doc => doc.type !== 'profile_photo')
                    .map((doc) => (
                      <div key={doc.uid} className='flex items-center justify-between p-3 border rounded-lg'>
                        <div className='flex-1'>
                          <p className='text-sm font-medium'>{doc.filename}</p>
                          <p className='text-xs text-muted-foreground'>
                            Tip: {doc.type} • {doc.verified ? '✓ Doğrulandı' : 'Doğrulanmadı'}
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
              )}

              {/* Belge Yükleme */}
              <div className='space-y-3'>
                <div>
                  <label className='text-sm font-medium mb-2 block'>Diploma</label>
                  <label
                    htmlFor='diploma-input'
                    className='inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors w-full'
                  >
                    <Paperclip className='h-4 w-4' />
                    <span className='text-sm'>Dosya Seç</span>
                  </label>
                  <Input
                    id='diploma-input'
                    type='file'
                    accept='.pdf,.jpg,.jpeg,.png'
                    onChange={(e) => handleUploadDocument(e, 'diploma')}
                    disabled={isUploadingDocument}
                    className='hidden'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium mb-2 block'>Lisans/Sertifika</label>
                  <label
                    htmlFor='license-input'
                    className='inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors w-full'
                  >
                    <Paperclip className='h-4 w-4' />
                    <span className='text-sm'>Dosya Seç</span>
                  </label>
                  <Input
                    id='license-input'
                    type='file'
                    accept='.pdf,.jpg,.jpeg,.png'
                    onChange={(e) => handleUploadDocument(e, 'license')}
                    disabled={isUploadingDocument}
                    className='hidden'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium mb-2 block'>Diğer Belgeler</label>
                  <label
                    htmlFor='other-input'
                    className='inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors w-full'
                  >
                    <Paperclip className='h-4 w-4' />
                    <span className='text-sm'>Dosya Seç</span>
                  </label>
                  <Input
                    id='other-input'
                    type='file'
                    accept='.pdf,.jpg,.jpeg,.png'
                    onChange={(e) => handleUploadDocument(e, 'other')}
                    disabled={isUploadingDocument}
                    className='hidden'
                  />
                </div>
              </div>

              {isUploadingDocument && (
                <p className='text-sm text-muted-foreground'>Belge yükleniyor...</p>
              )}
            </CardContent>
          </Card>

          <div className='flex justify-end gap-4'>
            <Button type='submit' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Kaydediliyor...' : 'Profili Güncelle'}
            </Button>
          </div>
        </form>
      </Form>
        </div>
      </Main>
    </>
  )
}
