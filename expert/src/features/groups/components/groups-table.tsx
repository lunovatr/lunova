import { format, parse } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GroupSession } from '../api'

interface GroupsTableProps {
  groups: GroupSession[]
  onGroupClick?: (id: number) => void
}

const STATUS_LABELS: Record<GroupSession['status'], string> = {
  scheduled: 'Planlandı',
  cancelled: 'İptal Edildi',
  completed: 'Tamamlandı',
}

function statusVariant(s: GroupSession['status']): 'default' | 'secondary' | 'destructive' {
  if (s === 'scheduled') return 'default'
  if (s === 'cancelled') return 'destructive'
  return 'secondary'
}

function capacityVariant(approved: number, capacity: number): 'default' | 'secondary' | 'destructive' {
  if (approved >= capacity) return 'destructive'
  if (approved / capacity >= 0.7) return 'secondary'
  return 'default'
}

export function GroupsTable({ groups, onGroupClick }: GroupsTableProps) {
  const sorted = [...groups].sort((a, b) => {
    const da = new Date(`${a.date}T${a.time}`)
    const db = new Date(`${b.date}T${b.time}`)
    return db.getTime() - da.getTime()
  })

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seans Tipi</TableHead>
            <TableHead>Tarih & Saat</TableHead>
            <TableHead>Doluluk</TableHead>
            <TableHead>Bekleyen Talep</TableHead>
            <TableHead>Durum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className='text-muted-foreground py-10 text-center'>
                Henüz bir grup seansı oluşturmadınız.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((group) => {
              const start = parse(`${group.date} ${group.time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
              const pendingCount = group.participants.filter((p) => p.status === 'pending_approval').length
              return (
                <TableRow
                  key={group.id}
                  className='cursor-pointer'
                  onClick={() => onGroupClick?.(group.id)}
                >
                  <TableCell className='font-medium'>
                    {group.session_offering_name}
                    {group.variant_label && (
                      <span className='text-muted-foreground ml-1.5 text-xs'>({group.variant_label})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>{format(start, 'dd MMM yyyy', { locale: tr })}</div>
                    <div className='text-muted-foreground text-xs'>{format(start, 'HH:mm')}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={capacityVariant(group.approved_count, group.capacity)}>
                      {group.approved_count}/{group.capacity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pendingCount > 0 ? (
                      <Badge variant='secondary'>{pendingCount} talep</Badge>
                    ) : (
                      <span className='text-muted-foreground text-xs'>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(group.status)}>{STATUS_LABELS[group.status]}</Badge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
