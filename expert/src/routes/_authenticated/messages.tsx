import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Messages } from '@/features/messages'

const searchSchema = z.object({
  // Bildirim dropdown'ından bir 'message' bildirimine tıklanınca, ilgili
  // danışanla olan konuşmanın otomatik açılabilmesi için (bkz. NotificationDropdown).
  clientId: z.coerce.number().optional(),
})

function MessagesRoute() {
  const { clientId } = Route.useSearch()
  return <Messages initialClientId={clientId} />
}

export const Route = createFileRoute('/_authenticated/messages')({
  component: MessagesRoute,
  validateSearch: searchSchema,
})
