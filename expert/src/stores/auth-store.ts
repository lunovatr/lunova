import { create } from 'zustand'
import { fetchCurrentUser, performLogout } from '@/services/auth'

export interface AuthUser {
    id: number
    username?: string
    email: string
    role: string
    first_name: string
    last_name: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  initialized: boolean
  isLoggingOut: boolean
  setUser: (user: AuthUser | null) => void
  fetchUser: () => Promise< AuthUser >
  logout: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,
  isLoggingOut: false,

  setUser: (user) => set({ user }),

  fetchUser: async (): Promise<AuthUser> => {
    set({ loading: true, error: null })
    try {
      // API isteğini Service katmanına delege eder
      const userData = await fetchCurrentUser() 
      set({ user: userData, loading: false, initialized: true })
      return userData
    } catch (err: any) {
      console.warn('fetchUser failed (Service call failed)', err)
      set({ user: null, loading: false, initialized: true })
      throw err
    }
  },

  logout: async () => {
    if (get().isLoggingOut) return
    set({ isLoggingOut: true })

    // API isteğini Service katmanına delege eder
    await performLogout() 

    // State'i sıfırlar
    set({ user: null, isLoggingOut: false })
  },

  reset: () => set({ user: null, loading: false, error: null, isLoggingOut: false }),
}))
