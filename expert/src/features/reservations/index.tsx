// src/features/reservations/index.tsx

import { useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useAppointments } from './use-appointments'
import { CreateAppointmentModal } from './components/create-appointment-modal'
import { AppointmentDetailDialog } from './components/appointment-detail-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PendingAppointments } from './components/pending-appointments'
import { ExpertDailySchedule } from './components/expert-daily-schedule'
import { PastAppointments } from './components/past-appointments'
import { AppointmentsTable } from './components/appointments-table'
import { Skeleton } from '@/components/ui/skeleton'

export function Reservations() {
  const { appointmentId } = useSearch({ from: '/_authenticated/reservations' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Bildirim dropdown'ından ?appointmentId=... ile gelindiyse detay dialog'unu
  // otomatik aç (bkz. NotificationDropdown).
  useEffect(() => {
    if (appointmentId) {
      setSelectedAppointmentId(appointmentId)
      setDetailOpen(true)
    }
  }, [appointmentId])

  const {
    upcomingAppointments,
    historicalAppointments,
    tableAppointments,
    allAppointments,
    clients,
    expertId,
    isLoading,
    error,
    refetch,
  } = useAppointments()

  const handleAppointmentClick = (id: number) => {
    setSelectedAppointmentId(id)
    setDetailOpen(true)
  }

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <NotificationDropdown />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>Rezervasyonlar</h1>
          <Button onClick={() => setIsModalOpen(true)}>Randevu Oluştur</Button>
        </div>

        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-9'>
            <div className='col-span-1 lg:col-span-6'>
              {isLoading ? (
                <Card className='w-full'>
                  <CardHeader>
                    <Skeleton className='h-8 w-3/4' />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className='h-[400px] w-full' />
                  </CardContent>
                </Card>
              ) : error ? (
                <div className='text-red-500'>{error}</div>
              ) : (
                <ExpertDailySchedule
                  appointments={allAppointments}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
            </div>
            <div className='col-span-1 space-y-4 lg:col-span-3'>
              <Card>
                <CardHeader>
                  <CardTitle>Bekleyen Randevular</CardTitle>
                  <CardDescription>Onay bekleyen randevularınız.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PendingAppointments
                    appointments={upcomingAppointments}
                    onUpdate={refetch}
                    onAppointmentClick={handleAppointmentClick}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Geçmiş Randevular</CardTitle>
                  <CardDescription>Tamamlanan veya reddedilen randevularınız.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PastAppointments
                    appointments={historicalAppointments}
                    onAppointmentClick={handleAppointmentClick}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tüm Rezervasyonlar</CardTitle>
              <CardDescription>
                Son 2 ay ve önümüzdeki 2 aydaki tüm randevularınız.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-48 w-full' />
              ) : (
                <AppointmentsTable
                  appointments={tableAppointments}
                  onUpdate={refetch}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      <CreateAppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        existingAppointments={allAppointments}
        clients={clients}
        expertId={expertId}
        onSuccess={refetch}
      />

      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={refetch}
      />
    </>
  )
}
