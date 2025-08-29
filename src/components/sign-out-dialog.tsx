import { useNavigate, useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import api from '@/lib/api'
import { useAuthGuard } from '@/hooks/use-auth-guard'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()
  const { clearCache } = useAuthGuard()

  const handleSignOut = async () => {
    try {
      // Logout endpoint'ine istek at
      await api.post('/api/v1/accounts/logout/', {})
      toast.success('Başarıyla çıkış yapıldı')
    } catch (error) {
      console.error('Logout error:', error)
      // Hata olsa da devam et
    } finally {
      // Auth guard cache'ini temizle
      clearCache()
      
      // Auth store'u temizle
      auth.reset()
      
      // Preserve current location for redirect after sign-in
      const currentPath = location.href
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Çıkış Yap'
      desc='Çıkış yapmak istediğinizden emin misiniz? Hesabınıza tekrar erişmek için giriş yapmanız gerekecek.'
      confirmText='Çıkış Yap'
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
