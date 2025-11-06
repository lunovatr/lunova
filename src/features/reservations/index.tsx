// src/features/reservations/index.tsx

import { useAppointments } from './use-appointments';
import { CreateAppointmentModal } from './components/create-appointment-modal';
import { useState } from 'react';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PendingAppointments } from './components/pending-appointments'
import { ExpertDailySchedule } from './components/expert-daily-schedule'
import { PastAppointments } from './components/past-appointments'
import { Skeleton } from '@/components/ui/skeleton';

const topNav = [
  { title: 'Overview', href: 'dashboard/overview', isActive: true, disabled: false },
  { title: 'Customers', href: 'dashboard/customers', isActive: false, disabled: true },
  { title: 'Products', href: 'dashboard/products', isActive: false, disabled: true },
  { title: 'Settings', href: 'dashboard/settings', isActive: false, disabled: true },
]

export function Reservations() {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Backend artık tarih aralığı ile randevuları getiriyor (mevcut tarihten 4 ay sonrasına kadar)
  const { appointments, clients, expertId, isLoading, error, refetch } = useAppointments();

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Reservations</h1>
          <div className='flex items-center space-x-2'>
            <Button onClick={() => setIsModalOpen(true)}>Randevu Oluştur</Button>
          </div>
        </div>

        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-9'>
              <div className='col-span-1 lg:col-span-6'>
                {/* YÜKLENME VE HATA DURUMLARINI YÖNET */}
                {isLoading ? (
                  // Yüklenirken bir iskelet (skeleton) göster
                  <Card className="w-full">
                    <CardHeader>
                      <Skeleton className="h-8 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                  </Card>
                ) : error ? (
                  // Hata varsa bir hata mesajı göster
                  <div className="text-red-500">{error}</div>
                ) : (
                  // Veri başarıyla geldiyse component'i render et
                  <ExpertDailySchedule
                    appointments={appointments}
                  />
                )}
              </div>
              <div className='col-span-1 space-y-4 lg:col-span-3'>
                <Card>
                  <CardHeader>
                    <CardTitle>Bekleyen Randevular</CardTitle>
                    <CardDescription>
                      Onay bekleyen randevularınız.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PendingAppointments appointments={appointments} onUpdate={refetch} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Geçmiş Randevular</CardTitle>
                    <CardDescription>
                      Tamamlanan veya reddedilen randevularınız.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PastAppointments appointments={appointments} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Main>

      <CreateAppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        existingAppointments={appointments}
        clients={clients}
        expertId={expertId}
        onSuccess={refetch}
      />
    </>
  )
}
