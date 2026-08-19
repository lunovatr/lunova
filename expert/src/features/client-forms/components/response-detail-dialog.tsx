import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getClientFormResponseDetail } from '../api'
import type { FormResponseDetail, ExpertAnswerDetail } from '../types'

interface ResponseDetailDialogProps {
  clientUserId: number | null
  responseId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function renderAnswer(answer: ExpertAnswerDetail | undefined) {
  if (!answer) return <span className='text-muted-foreground'>Cevaplanmadı</span>
  if (answer.selected_options && answer.selected_options.length > 0) {
    return <span>{answer.selected_options.map((o) => o.text).join(', ')}</span>
  }
  if (answer.numeric_answer !== undefined && answer.numeric_answer !== null) {
    return <span>{answer.numeric_answer}</span>
  }
  if (answer.text_answer) {
    return <span className='whitespace-pre-wrap'>{answer.text_answer}</span>
  }
  return <span className='text-muted-foreground'>Cevaplanmadı</span>
}

export function ResponseDetailDialog({
  clientUserId,
  responseId,
  open,
  onOpenChange,
}: ResponseDetailDialogProps) {
  const [detail, setDetail] = useState<FormResponseDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !clientUserId || !responseId) return
    setDetail(null)
    setLoading(true)
    getClientFormResponseDetail(clientUserId, responseId)
      .then(setDetail)
      .catch((e: Error) => toast.error(e.message || 'Form cevabı alınamadı'))
      .finally(() => setLoading(false))
  }, [open, clientUserId, responseId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{detail?.form.title ?? 'Form Cevabı'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-6 w-2/3' />
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-24 w-full' />
          </div>
        ) : detail ? (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              {detail.risk_level && <Badge variant='destructive'>{detail.risk_level}</Badge>}
              <Badge variant='secondary'>Toplam Puan: {detail.total_score}</Badge>
              {detail.percentage_score !== null && (
                <Badge variant='outline'>%{Math.round(detail.percentage_score)}</Badge>
              )}
            </div>

            {(detail.interpretation || detail.recommendations) && (
              <div className='space-y-2 rounded-md border p-3 text-sm'>
                {detail.interpretation && (
                  <p>
                    <span className='font-medium'>Yorum: </span>
                    {detail.interpretation}
                  </p>
                )}
                {detail.recommendations && (
                  <p>
                    <span className='font-medium'>Öneriler: </span>
                    {detail.recommendations}
                  </p>
                )}
              </div>
            )}

            <Separator />

            <div className='space-y-3'>
              {detail.questions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((q) => {
                  const answer = detail.answers.find((a) => a.question_id === q.id)
                  return (
                    <div key={q.id} className='rounded-md border p-3'>
                      <div className='mb-1 text-sm font-medium'>{q.question_text}</div>
                      <div className='text-sm'>{renderAnswer(answer)}</div>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>Form cevabı bulunamadı.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
