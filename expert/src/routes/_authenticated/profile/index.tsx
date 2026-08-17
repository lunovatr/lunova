import { createFileRoute } from '@tanstack/react-router'
import { ProfileView } from '@/features/profile'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfileView,
})
