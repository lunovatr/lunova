import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Groups } from '@/features/groups'

const searchSchema = z.object({
  // Bildirim dropdown'ından bir grup seansı bildirimine tıklanınca, detay
  // dialog'unun otomatik açılabilmesi için (bkz. NotificationDropdown).
  groupSessionId: z.coerce.number().optional(),
})

export const Route = createFileRoute('/_authenticated/groups')({
  component: Groups,
  validateSearch: searchSchema,
})
