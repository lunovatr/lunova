import { Palette, Settings, UserCog, CalendarCheck, CalendarClock, UserRoundPen, ClipboardList, MessageSquareText, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Genel',
      items: [
        {
          title: 'Rezervasyonlar',
          url: '/reservations',
          icon: CalendarClock,
        },
        {
          title: 'Müsaitlik',
          url: '/availability',
          icon: CalendarCheck,
        },
        {
          title: 'Grup Seansları',
          url: '/groups',
          icon: Users,
        },
        {
          title: 'Danışan Formları',
          url: '/client-forms',
          icon: ClipboardList,
        },
        {
          title: 'Notlar',
          url: '/messages',
          icon: MessageSquareText,
        },
      ],
    },
    {
      title: 'Profil',
      items: [
        {
          title: 'Profilim',
          url: '/profile',
          icon: UserCog,
        },
        {
          title: 'Profili Düzenle',
          url: '/update-profile',
          icon: UserRoundPen,
        },
      ],
    },
    {
      title: 'Diğer',
      items: [
        {
          title: 'Ayarlar',
          icon: Settings,
          items: [
            {
              title: 'Görünüm',
              url: '/settings/appearance',
              icon: Palette,
            },
          ],
        },
      ],
    },
  ],
}
