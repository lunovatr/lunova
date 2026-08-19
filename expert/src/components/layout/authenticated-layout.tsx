import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { Loader2 } from 'lucide-react'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading, error } = useAuthGuard()
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  // Loading durumunda loading spinner göster
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Hata durumunda veya kullanıcı yoksa boş div döndür (redirect zaten yapıldı)
  if (error || !user) {
    return <div />
  }

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <LayoutProvider>
          <SkipToMain />
          <AppSidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
                <img
                  src="/images/logo/logo-black-red.png"
                  alt="Lunova"
                  width={120}
                  height={32}
                  className="h-7 w-auto dark:brightness-0 dark:invert"
                />
              </div>
            </SidebarHeader>
            <SidebarContent>
              {sidebarData.navGroups.map((props) => (
                <NavGroup key={props.title} {...props} />
              ))}
            </SidebarContent>
            <SidebarFooter>
              <NavUser />
            </SidebarFooter>
            <SidebarRail />
          </AppSidebar>
          <SidebarInset
            className={cn(
              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-[[data-layout=fixed]]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - 1rem (total margins) to prevent overflow
              // 'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-1rem)]',
              'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]',

              // Set content container, so we can use container queries
              '@container/content'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
        </LayoutProvider>
      </SidebarProvider>
    </SearchProvider>
  )
}
