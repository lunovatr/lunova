import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getMyClients, getForms, getClientFormResponses } from './api'
import { ResponseDetailDialog } from './components/response-detail-dialog'
import type { MyClient, FormSummary, FormResponseSummary } from './types'

export function ClientForms() {
  const [clients, setClients] = useState<MyClient[]>([])
  const [forms, setForms] = useState<FormSummary[]>([])
  const [responsesByClient, setResponsesByClient] = useState<
    Map<number, FormResponseSummary[]>
  >(new Map())
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    async function loadOverview() {
      setOverviewLoading(true)
      try {
        const [clientsData, formsData] = await Promise.all([getMyClients(), getForms()])
        setClients(clientsData)
        setForms(formsData)

        // Matris (kim hangi formu doldurmuş) ve "seçili danışanın cevapları"
        // tablosu AYNI veriden türetiliyor - her danışan için formları tek
        // seferde çekilip Map'te tutuluyor, satıra tıklayınca ikinci bir
        // istek atılmıyor.
        const results = await Promise.allSettled(
          clientsData.map((client) => getClientFormResponses(client.user_id))
        )
        const map = new Map<number, FormResponseSummary[]>()
        results.forEach((result, index) => {
          const clientUserId = clientsData[index].user_id
          map.set(clientUserId, result.status === 'fulfilled' ? result.value : [])
        })
        setResponsesByClient(map)
      } catch (e: any) {
        toast.error(e.message || 'Danışan/form bilgileri alınamadı')
      } finally {
        setOverviewLoading(false)
      }
    }
    loadOverview()
  }, [])

  const selectedResponses = selectedClientId
    ? (responsesByClient.get(selectedClientId) ?? [])
    : []

  const handleRowClick = (responseId: number) => {
    setSelectedResponseId(responseId)
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
          <h1 className='text-2xl font-bold tracking-tight'>Danışan Formları</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danışanlarım ve Formları</CardTitle>
            <CardDescription>
              Her satır bir danışanı, her sütun bir formu gösterir. Doldurulmuş formlar
              için satıra tıklayarak o danışanın tüm cevaplarını görüntüleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className='h-48 w-full' />
            ) : clients.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Henüz size atanmış bir danışan bulunmuyor.
              </p>
            ) : forms.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Sistemde henüz aktif bir form bulunmuyor.
              </p>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Danışan</TableHead>
                      {forms.map((form) => (
                        <TableHead key={form.id} className='max-w-[140px] text-center'>
                          <span className='block truncate' title={form.title}>
                            {form.title}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const submittedFormIds = new Set(
                        (responsesByClient.get(client.user_id) ?? []).map((r) => r.form.id)
                      )
                      return (
                        <TableRow
                          key={client.user_id}
                          className={cn(
                            'cursor-pointer',
                            selectedClientId === client.user_id && 'bg-accent'
                          )}
                          onClick={() => setSelectedClientId(client.user_id)}
                        >
                          <TableCell className='font-medium whitespace-nowrap'>
                            {client.first_name} {client.last_name}
                          </TableCell>
                          {forms.map((form) => (
                            <TableCell key={form.id} className='text-center'>
                              {submittedFormIds.has(form.id) ? (
                                <Check className='mx-auto size-4 text-green-600' />
                              ) : (
                                <X className='mx-auto size-4 text-gray-300' />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='mt-4'>
          <CardHeader>
            <CardTitle>Form Cevapları</CardTitle>
            <CardDescription>
              Bir satıra tıklayarak danışanın verdiği tüm cevapları, puanı ve risk seviyesini
              görüntüleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedClientId ? (
              <p className='text-muted-foreground text-sm'>
                Formlarını görüntülemek için yukarıdaki tablodan bir danışan seçin.
              </p>
            ) : selectedResponses.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Bu danışan henüz bir form doldurmamış.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Doldurulma Tarihi</TableHead>
                    <TableHead>Risk Seviyesi</TableHead>
                    <TableHead>Puan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedResponses.map((response) => (
                    <TableRow
                      key={response.id}
                      className='cursor-pointer'
                      onClick={() => handleRowClick(response.id)}
                    >
                      <TableCell>{response.form.title}</TableCell>
                      <TableCell>
                        {new Date(response.submitted_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {response.risk_level ? (
                          <Badge variant='destructive'>{response.risk_level}</Badge>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell>{response.total_score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>

      <ResponseDetailDialog
        clientUserId={selectedClientId}
        responseId={selectedResponseId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
