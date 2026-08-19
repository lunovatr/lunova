import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getMyClients, getClientFormResponses } from './api'
import { ResponseDetailDialog } from './components/response-detail-dialog'
import type { MyClient, FormResponseSummary } from './types'

export function ClientForms() {
  const [clients, setClients] = useState<MyClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  const [responses, setResponses] = useState<FormResponseSummary[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)

  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    getMyClients()
      .then((data) => {
        setClients(data)
        if (data.length > 0) setSelectedClientId(data[0].user_id)
      })
      .catch((e: Error) => toast.error(e.message || 'Danışanlar alınamadı'))
      .finally(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedClientId) {
      setResponses([])
      return
    }
    setResponsesLoading(true)
    getClientFormResponses(selectedClientId)
      .then(setResponses)
      .catch((e: Error) => toast.error(e.message || 'Form cevapları alınamadı'))
      .finally(() => setResponsesLoading(false))
  }, [selectedClientId])

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
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>Danışan Formları</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danışan Seçin</CardTitle>
            <CardDescription>
              Yalnızca size atanmış danışanların doldurduğu formları görebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <Skeleton className='h-10 w-full max-w-sm' />
            ) : clients.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Henüz size atanmış bir danışan bulunmuyor.
              </p>
            ) : (
              <Select
                value={selectedClientId?.toString()}
                onValueChange={(v) => setSelectedClientId(Number(v))}
              >
                <SelectTrigger className='w-full max-w-sm'>
                  <SelectValue placeholder='Danışan seçiniz' />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.user_id} value={client.user_id.toString()}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {responsesLoading ? (
              <Skeleton className='h-48 w-full' />
            ) : responses.length === 0 ? (
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
                  {responses.map((response) => (
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
