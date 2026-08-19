import { createFileRoute } from '@tanstack/react-router'
import { ClientForms } from '@/features/client-forms'

export const Route = createFileRoute('/_authenticated/client-forms')({
  component: ClientForms,
})
