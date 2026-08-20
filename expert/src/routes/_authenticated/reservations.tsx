import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Reservations } from '@/features/reservations'

const searchSchema = z.object({
  // Bildirim dropdown'ından bir randevu bildirimine tıklanınca, detay
  // dialog'unun otomatik açılabilmesi için (bkz. NotificationDropdown).
  appointmentId: z.coerce.number().optional(),
})

export const Route = createFileRoute('/_authenticated/reservations')({
  component: Reservations,
  validateSearch: searchSchema,
})
