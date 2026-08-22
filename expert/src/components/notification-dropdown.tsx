import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from '@/features/notifications/api'

const POLL_INTERVAL_MS = 60_000

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return 'az önce'
  if (diffMinutes < 60) return `${diffMinutes} dk önce`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} sa önce`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
      // Bildirimler sessizce başarısız olabilir - ana akışı engellememeli.
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      try {
        await markNotificationRead(notification.id)
      } catch {
        // Okunma işaretleme başarısız olsa da yönlendirme akışını bloklamaz.
      }
    }

    if (notification.notification_type === 'message' && notification.related_user_id) {
      navigate({
        to: '/messages',
        search: { clientId: notification.related_user_id },
      })
    } else if (notification.notification_type === 'document_status') {
      // Belge onay/red kararı her zaman uzmanın KENDİ belgesiyle ilgili -
      // ek bir id taşımaz, hedef sabit olarak kendi profil sayfası.
      navigate({ to: '/profile' })
    } else if (notification.appointment_id) {
      navigate({
        to: '/reservations',
        search: { appointmentId: notification.appointment_id },
      })
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative rounded-full'>
          <Bell className='size-5' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-80' align='end' forceMount>
        <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className='h-80'>
          {notifications.length === 0 ? (
            <p className='text-muted-foreground p-4 text-center text-sm'>
              Bildirim bulunmuyor.
            </p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`hover:bg-accent flex w-full flex-col items-start gap-1 border-b px-3 py-2.5 text-left last:border-b-0 ${
                  notification.is_read ? '' : 'bg-accent/50'
                }`}
              >
                <span className='flex w-full items-center gap-2'>
                  {!notification.is_read && (
                    <span className='bg-primary block h-2 w-2 shrink-0 rounded-full' />
                  )}
                  <span className='text-sm font-medium'>{notification.title}</span>
                </span>
                <span className='text-muted-foreground text-xs'>
                  {notification.body}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {formatRelativeTime(notification.created_at)}
                </span>
              </button>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
