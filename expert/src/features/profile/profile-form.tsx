import { z } from 'zod'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
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
import { getProfile, updateProfile, uploadDocument, deleteDocument } from './api'
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
  STATUS_CONFIG,
  DocumentType,
  DOCUMENT_TYPE_LABEL
} from './maps'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle, AlertDialogAction, AlertDialogHeader } from '@/components/ui/alert-dialog'

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
  target_groups: z.array(z.string()).optional(),

  // Session Info
  session_price: z.string().optional(),
  currency: z.string().optional(),
  appointment_duration: z.coerce.number().min(30, 'Seans süresi en az 30 dakika olmalıdır').max(50, 'Seans süresi en fazla 50 dakika olabilir').optional(),
  free_first_session: z.boolean().optional(),
  session_types: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),

  // Other
  availability_status: z.string().optional(),
  video_intro_url: z.string().url('Geçerli bir URL giriniz').or(z.literal('')).optional(),
})

// type ProfileFormValues = z.infer<typeof profileFormSchema>
export type ProfileFormValues = z.infer<typeof profileFormSchema>
export function ProfileForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ExpertProfile | null>(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const { user: authUser } = useAuthGuard()

  // dosya silme akışı
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const handleAskDelete = (uid: string) => {
    setDeleteTarget(uid)
  }
  const handleCancelDelete = () => {
    setDeleteTarget(null)
  }
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await deleteDocument(deleteTarget)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }
  // --------------

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema) as Resolver<ProfileFormValues>,
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
  // Profil bilgilerini yükle ve Mapping işlemini yap
    useEffect(() => {
      const fetchProfile = async () => {
        try {
          setLoading(true)
          const data = await getProfile()

          if (data) {
            const expertData = data as ExpertProfile
            setProfile(expertData)

            // BACKEND -> FORM MAPPING
            // Backend'den gelen string isimleri, bizim MAP'lerimizdeki ID karşılıklarına dönüştürüyoruz.
            form.reset({
              about: expertData.about || '',
              title: expertData.title || '',
              experience_years: expertData.experience_years || 0,
              license_number: expertData.license_number || '',
              institution: expertData.institution || '',
              
              // Tekli Seçimler (String -> ID)
              university: Object.keys(UNIVERSITIES).find(key => UNIVERSITIES[Number(key)] === expertData.university) ? Number(Object.keys(UNIVERSITIES).find(key => UNIVERSITIES[Number(key)] === expertData.university)) : undefined,
              degree_level: Object.keys(DEGREE_LEVELS).find(key => DEGREE_LEVELS[Number(key)] === expertData.degree_level) ? Number(Object.keys(DEGREE_LEVELS).find(key => DEGREE_LEVELS[Number(key)] === expertData.degree_level)) : undefined,
              major: Object.keys(MAJORS).find(key => MAJORS[Number(key)] === expertData.major) ? Number(Object.keys(MAJORS).find(key => MAJORS[Number(key)] === expertData.major)) : undefined,

              // Çoklu Seçimler (String[] -> ID[])
              services: expertData.services?.map(s => Number(Object.keys(SERVICES).find(key => SERVICES[Number(key)] === s))).filter(Boolean) || [],
              specializations: expertData.specializations?.map(s => Number(Object.keys(SPECIALIZATIONS).find(key => SPECIALIZATIONS[Number(key)] === s))).filter(Boolean) || [],
              approach_methods: expertData.approach_methods?.map(s => Number(Object.keys(APPROACH_METHODS).find(key => APPROACH_METHODS[Number(key)] === s))).filter(Boolean) || [],
              // target_groups: expertData.target_groups?.map(s => Number(Object.keys(TARGET_GROUPS).find(key => TARGET_GROUPS[Number(key)] === s))).filter(Boolean) || [],
              target_groups: expertData.target_groups || [],
              session_types: expertData.session_types || [],
              
              session_price: expertData.session_price || '',
              currency: expertData.currency || 'TRY',
              appointment_duration: expertData.appointment_duration || 45,
              free_first_session: expertData.free_first_session ?? false,
              languages: expertData.languages || [],
              availability_status: expertData.availability_status || 'busy',
              video_intro_url: expertData.video_intro_url || '',
            })

            // Profil fotoğrafı mapping (original_filename kullanarak)
            const profilePhoto = expertData.documents?.find(doc => doc.type === 'profile_photo')
            if (profilePhoto) {
              // Backend'den tam URL geliyorsa access_url kullanılır
              setProfilePhotoPreview(profilePhoto.access_url)
            }
          }
        } catch (error) {
          console.error('Profil yüklenemedi:', error)
        } finally {
          setLoading(false)
        }
      }

      if (authUser) fetchProfile()
    }, [authUser, form])


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

  // Belge yükleme akışı
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
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
  // --------------

  
  // FORM -> BACKEND MAPPING (Submit)
    const onSubmit = async (values: ProfileFormValues) => {
      try {
        // Backend tam olarak bu ID listelerini bekliyor
        const payload: ExpertProfileUpdatePayload = {
          ...values,
          target_groups: values.target_groups?.map(label =>
            Number(
              Object.keys(TARGET_GROUPS).find(
                key => TARGET_GROUPS[Number(key)] === label
              )
            )
          ),
          session_types: values.session_types?.map(label =>
            Number(
              Object.keys(SESSION_TYPES).find(
                key => SESSION_TYPES[Number(key)] === label
              )
            )
          ),
          languages: values.languages
            ?.map(label =>
              Object.keys(LANGUAGES).find(
                code => LANGUAGES[code] === label
              )
            )
            .filter((code): code is string => Boolean(code)),
          university: values.university ? Number(values.university) : undefined,
          degree_level: values.degree_level ? Number(values.degree_level) : undefined,
          major: values.major ? Number(values.major) : undefined,
        }

        const updatedProfile = await updateProfile(payload)
        setProfile(updatedProfile as ExpertProfile)
        navigate({ to: '/profile' })
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
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
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
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(Number(id)) ?? false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value ?? []), Number(id)])
                                } else {
                                  field.onChange(
                                    (field.value ?? []).filter(
                                      (value: number) => value !== Number(id)
                                    )
                                  )
                                }
                              }}
                            />
                          </FormControl>

                          <FormLabel className='font-normal cursor-pointer'>
                            {label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <FormMessage />
              </FormItem>


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
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(Number(id)) ?? false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value ?? []), Number(id)])
                                } else {
                                  field.onChange(
                                    (field.value ?? []).filter(
                                      (value: number) => value !== Number(id)
                                    )
                                  )
                                }
                              }}
                            />
                          </FormControl>

                          <FormLabel className='font-normal cursor-pointer'>
                            {label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <FormMessage />
              </FormItem>


             <FormItem>
              <div className='mb-4'>
                <FormLabel>Yaklaşım Metodları</FormLabel>
                <FormDescription>
                  Kullandığınız terapi yaklaşımlarını seçiniz
                </FormDescription>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {Object.entries(APPROACH_METHODS).map(([id, label]) => (
                  <FormField
                    key={id}
                    control={form.control}
                    name='approach_methods'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(Number(id)) ?? false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value ?? []), Number(id)])
                              } else {
                                field.onChange(
                                  (field.value ?? []).filter(
                                    (value: number) => value !== Number(id)
                                  )
                                )
                              }
                            }}
                          />
                        </FormControl>

                        <FormLabel className='font-normal cursor-pointer'>
                          {label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name='target_groups'
                render={({ field }) => {
                  const currentValues: string[] = field.value ?? [];
                  return (
                    <FormItem>
                      <div className='mb-4'>
                        <FormLabel>Hedef Gruplar</FormLabel>
                        <FormDescription>
                          Çalıştığınız yaş gruplarını ve kitle türlerini seçiniz
                        </FormDescription>
                      </div>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {Object.entries(TARGET_GROUPS).map(([code, label]) => {
                          return (
                            <FormItem
                              key={code}
                              className='flex flex-row items-start space-x-3 space-y-0'
                            >
                              <FormControl>
                                <Checkbox
                                  checked={currentValues.includes(label)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...currentValues, label])
                                    } else {
                                      field.onChange(
                                        currentValues.filter(v => v !== label)
                                      )
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className='font-normal cursor-pointer'>
                                {label}
                              </FormLabel>
                            </FormItem>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
                render={({ field }) => {
                  const currentValues = field.value || [];

                  return (
                    <FormItem>
                      <div className='mb-4'>
                        <FormLabel>Seans Tipleri</FormLabel>
                        <FormDescription>Sunduğunuz seans tiplerini seçiniz</FormDescription>
                      </div>
                      <div className='space-y-2'>
                        {Object.entries(SESSION_TYPES).map(([id, label]) => (
                          <FormItem
                            key={id}
                            className='flex flex-row items-start space-x-3 space-y-0'
                          >
                            <FormControl>
                              <Checkbox
                                // Sadece label üzerinden kontrol
                                checked={currentValues.includes(label)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...currentValues, label])
                                    : field.onChange(
                                        currentValues.filter((value: string) => value !== label)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className='font-normal cursor-pointer'>
                              {label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name='languages'
                render={({ field }) => {
                  const currentValues: string[] = field.value ?? [];
                  return (
                    <FormItem>
                      <div className='mb-4'>
                        <FormLabel>Diller</FormLabel>
                        <FormDescription>Hangi dillerde hizmet veriyorsunuz?</FormDescription>
                      </div>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {Object.entries(LANGUAGES).map(([code, label]) => {
                          return (
                            <FormItem
                              key={code}
                              className='flex flex-row items-start space-x-3 space-y-0'
                            >
                              <FormControl>
                                <Checkbox
                                  checked={currentValues.includes(label)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...currentValues, label])
                                    } else {
                                      field.onChange(
                                        currentValues.filter(v => v !== label)
                                      )
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className='font-normal cursor-pointer'>
                                {label}
                              </FormLabel>
                            </FormItem>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
              <CardDescription>
                Mesleki belgelerinizi yükleyin (diploma, sertifika, vb.)
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-4'>
              {Object.entries(DOCUMENT_TYPE_LABEL)
                .filter(([type]) => type !== DocumentType.PROFILE_PHOTO)
                .map(([type, label]) => {
                  const docs = profile?.documents?.filter(d => d.type === type) ?? []
                  const canUpload = docs.length < 3

                  return (
                    <div key={type} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <label className='text-sm font-medium'>
                          {label} ({docs.length}/3)
                        </label>

                        {canUpload && (
                          <label
                            htmlFor={type}
                            className='w-7 h-7 flex items-center justify-center rounded-full border cursor-pointer hover:bg-accent'
                          >
                            +
                          </label>
                        )}
                      </div>

                      {docs.map(doc => (
                        <div
                          key={doc.uid}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <div className='flex-1'>
                            <p className='text-sm font-medium'>
                              {doc.original_filename}
                            </p>
                          </div>

                          <div className='flex items-center gap-3'>
                            <a
                              href={doc.access_url}
                              target='_blank'
                              className='text-sm text-blue-600 hover:underline'
                            >
                              Görüntüle
                            </a>

                            <button
                              type='button'
                              onClick={() => handleAskDelete(doc.uid)}
                              className='text-sm text-red-600 hover:underline'
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      ))}

                      <Input
                        id={type}
                        type='file'
                        className='hidden'
                        accept='.pdf,.jpg,.jpeg,.png'
                        disabled={!canUpload || isUploadingDocument}
                        onChange={e => handleUploadDocument(e, type)}
                      />
                    </div>
                  )
                })}

              {isUploadingDocument && (
                <p className='text-sm text-muted-foreground'>
                  Belge yükleniyor...
                </p>
              )}
            </CardContent>

            <AlertDialog open={!!deleteTarget} onOpenChange={handleCancelDelete}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Belge silinsin mi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu belge kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Vazgeç
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className='bg-red-600 hover:bg-red-700'
                  >
                    {isDeleting ? 'Siliniyor…' : 'Evet, sil'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
