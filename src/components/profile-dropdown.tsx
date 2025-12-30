import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { getProfile, getDocumentUrl } from '@/features/profile/api'
import type { ExpertProfile } from '@/features/profile/types'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const { user, loading } = useAuthGuard()
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>(undefined)

  // Kullanıcı adının baş harflerini al
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  // Profil fotoğrafını yükle
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      try {
        const profile = await getProfile()
        if (profile) {
          const expertProfile = profile as ExpertProfile
          const profilePhoto = expertProfile.documents?.find(doc => doc.type === 'profile_photo')
          if (profilePhoto) {
            setProfilePhotoUrl(getDocumentUrl(profilePhoto.uid, profilePhoto.type, profilePhoto.filename))
          }
        }
      } catch (error) {
        // Profil fotoğrafı yüklenemezse sessizce devam et
        console.debug('Profile photo could not be loaded:', error)
      }
    }

    if (user) {
      fetchProfilePhoto()
    }
  }, [user])

  if (loading || !user) {
    return (
      <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
        <Avatar className='h-8 w-8'>
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src={profilePhotoUrl} alt={`${user.first_name} ${user.last_name}`} />
              <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>
                {user.first_name} {user.last_name}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to='/profile'>
                Profil
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to='/settings'>
                Faturalandırma
                <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to='/settings'>
                Ayarlar
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Yeni Takım</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Çıkış Yap
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
