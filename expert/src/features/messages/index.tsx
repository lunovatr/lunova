import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
import { getConversations, getMessages, sendMessage } from './api'
import { MESSAGE_MAX_LENGTH, type ConversationSummary, type MessageItem } from './types'

function formatRelative(isoDate: string): string {
  return new Date(isoDate).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function draftKey(clientId: number): string {
  return `lunova_message_draft_expert_${clientId}`
}

interface MessagesProps {
  initialClientId?: number
}

export function Messages({ initialClientId }: MessagesProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId ?? null
  )

  const [messages, setMessages] = useState<MessageItem[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    try {
      const data = await getConversations()
      setConversations(data)
    } catch (e: any) {
      toast.error(e.message || 'Konuşma listesi alınamadı')
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (!selectedClientId) return

    let cancelled = false

    async function loadThread() {
      setThreadLoading(true)
      try {
        const data = await getMessages(selectedClientId!)
        if (!cancelled) setMessages(data.messages)
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || 'Notlar alınamadı')
      } finally {
        if (!cancelled) setThreadLoading(false)
      }
    }

    loadThread()
    return () => {
      cancelled = true
    }
  }, [selectedClientId])

  // Danışan seçimi değişince, o danışan için daha önce yazılmış ama
  // gönderilmemiş bir taslak varsa geri yükle - sayfa yanlışlıkla
  // kapatılırsa/başka danışana geçilirse mesaj kaybolmasın.
  useEffect(() => {
    if (!selectedClientId) {
      setBody('')
      return
    }
    setBody(localStorage.getItem(draftKey(selectedClientId)) ?? '')
  }, [selectedClientId])

  useEffect(() => {
    if (!selectedClientId) return
    if (body) {
      localStorage.setItem(draftKey(selectedClientId), body)
    } else {
      localStorage.removeItem(draftKey(selectedClientId))
    }
  }, [selectedClientId, body])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId)
    // Roster'daki okunmamış rozetini de tazele - GET aynı zamanda
    // sunucu tarafında karşı tarafın mesajlarını okunmuş işaretliyor.
    setConversations((prev) =>
      prev.map((c) => (c.client_id === clientId ? { ...c, unread_count: 0 } : c))
    )
  }

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || !selectedClientId || sending) return

    setSending(true)
    try {
      const message = await sendMessage(selectedClientId, trimmed)
      setMessages((prev) => [...prev, message])
      setBody('')
      localStorage.removeItem(draftKey(selectedClientId))
      // Roster'daki son not önizlemesini + danışanın güncel kalan hakkını
      // (uzman mesajı hakkı etkilemez ama roster'ı taze tutmak için) yenile.
      loadConversations()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.body?.[0] || 'Not gönderilemedi.')
    } finally {
      setSending(false)
    }
  }

  const selectedClient = conversations.find((c) => c.client_id === selectedClientId)

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
          <h1 className='text-2xl font-bold tracking-tight'>Notlar</h1>
        </div>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle>Danışanlarım</CardTitle>
              <CardDescription>
                Not paylaşmak için bir danışan seçin. Parantez içindeki sayı,
                danışanın kalan not hakkını gösterir.
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              {rosterLoading ? (
                <div className='space-y-2 p-4'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </div>
              ) : conversations.length === 0 ? (
                <p className='text-muted-foreground p-4 text-sm'>
                  Henüz size atanmış bir danışan bulunmuyor.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Danışan</TableHead>
                      <TableHead>Son Not</TableHead>
                      <TableHead className='text-right'>Okunmamış</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((c) => (
                      <TableRow
                        key={c.client_id}
                        className={cn(
                          'cursor-pointer',
                          selectedClientId === c.client_id && 'bg-accent'
                        )}
                        onClick={() => handleSelectClient(c.client_id)}
                      >
                        <TableCell className='font-medium whitespace-nowrap'>
                          {c.client_name}{' '}
                          <span
                            className={cn(
                              'text-xs font-normal',
                              c.client_quota.remaining <= 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            )}
                          >
                            ({c.client_quota.remaining}/{c.client_quota.limit})
                          </span>
                        </TableCell>
                        <TableCell className='max-w-[160px] truncate text-muted-foreground text-sm'>
                          {c.last_message ? c.last_message.body : '-'}
                        </TableCell>
                        <TableCell className='text-right'>
                          {c.unread_count > 0 && (
                            <Badge variant='destructive'>{c.unread_count}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className='flex flex-col lg:col-span-2'>
            <CardHeader>
              <CardTitle>{selectedClient ? selectedClient.client_name : 'Notlar'}</CardTitle>
              <CardDescription>
                {selectedClient ? (
                  <>
                    Seans öncesi ya da sonrası için kısa notlar paylaşabilirsiniz.
                    Danışanın kalan not hakkı:{' '}
                    <span
                      className={cn(
                        'font-medium',
                        selectedClient.client_quota.remaining <= 0
                          ? 'text-destructive'
                          : 'text-foreground'
                      )}
                    >
                      {selectedClient.client_quota.remaining}/{selectedClient.client_quota.limit}
                    </span>
                    . Sizin bir mesaj sınırınız yoktur.
                  </>
                ) : (
                  'Seans öncesi ya da sonrası için kısa notlar paylaşabilirsiniz.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col'>
              {!selectedClientId ? (
                <p className='text-muted-foreground flex flex-1 items-center justify-center text-sm'>
                  Notları görüntülemek için soldaki listeden bir danışan seçin.
                </p>
              ) : threadLoading ? (
                <div className='flex flex-1 items-center justify-center'>
                  <Skeleton className='h-40 w-full' />
                </div>
              ) : (
                <>
                  <ScrollArea className='h-96 flex-1 rounded-md border p-4'>
                    {messages.length === 0 ? (
                      <p className='text-muted-foreground text-center text-sm'>
                        Henüz not paylaşılmamış.
                      </p>
                    ) : (
                      <div className='space-y-3'>
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn('flex', message.is_mine ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                                message.is_mine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className='whitespace-pre-wrap break-words'>{message.body}</p>
                              <p className='mt-1 text-right text-[11px] opacity-70'>
                                {formatRelative(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className='mt-3'>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
                      maxLength={MESSAGE_MAX_LENGTH}
                      rows={3}
                      placeholder='Danışanınıza bir not bırakın...'
                    />
                    <div className='mt-2 flex items-center justify-between'>
                      <span className='text-muted-foreground text-xs'>
                        {body.length}/{MESSAGE_MAX_LENGTH}
                      </span>
                      <Button size='sm' disabled={!body.trim() || sending} onClick={handleSend}>
                        {sending ? 'Gönderiliyor...' : 'Gönder'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
