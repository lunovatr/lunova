// src/features/groups/index.tsx
//
// Uzman tarafı grup seansları paneli (Faz 4, Frontend Yapılandırması planı) -
// reservations/index.tsx'in aynı iskeleti taklit edilerek yazıldı.
import { useCallback, useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CreateGroupModal } from './components/create-group-modal'
import { GroupDetailDialog } from './components/group-detail-dialog'
import { GroupsTable } from './components/groups-table'
import { getGroupSessions, type GroupSession } from './api'

export function Groups() {
  const { groupSessionId } = useSearch({ from: '/_authenticated/groups' })
  const [groups, setGroups] = useState<GroupSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getGroupSessions()
      setGroups(data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Bildirim dropdown'ından ?groupSessionId=... ile gelindiyse detay
  // dialog'unu otomatik aç (bkz. NotificationDropdown, reservations'taki
  // appointmentId deseninin aynısı).
  useEffect(() => {
    if (groupSessionId) {
      setSelectedGroupId(groupSessionId)
      setDetailOpen(true)
    }
  }, [groupSessionId])

  const handleGroupClick = (id: number) => {
    setSelectedGroupId(id)
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
          <h1 className='text-2xl font-bold tracking-tight'>Grup Seansları</h1>
          <Button onClick={() => setIsModalOpen(true)}>Grup Seansı Oluştur</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grup Seanslarım</CardTitle>
            <CardDescription>
              Açtığınız grup terapisi/psikoeğitim slotları, bekleyen katılım talepleri ve onaylanmış katılımcılar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className='h-48 w-full' />
            ) : (
              <GroupsTable groups={groups} onGroupClick={handleGroupClick} />
            )}
          </CardContent>
        </Card>
      </Main>

      <CreateGroupModal open={isModalOpen} onOpenChange={setIsModalOpen} onSuccess={fetchGroups} />

      <GroupDetailDialog
        groupId={selectedGroupId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={fetchGroups}
      />
    </>
  )
}
