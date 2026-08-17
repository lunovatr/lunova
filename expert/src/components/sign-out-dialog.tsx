import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuthGuard } from '@/hooks/use-auth-guard'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const { logout, reset } = useAuthStore()
  const { clearCache } = useAuthGuard()

  const handleSignOut = async () => {
    // cache temizliği
    clearCache()
    // auth store sıfırla
    await logout()
    reset()
    toast.success('Başarıyla çıkış yapıldı')

    // yönlendirme
    const currentPath = routerState.location.pathname
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
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
