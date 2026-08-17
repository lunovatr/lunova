import { useEffect, useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

interface User {
  first_name: string
  last_name: string
  email: string
  role?: string[]
}

let userCache: User | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 dakika

export function useAuthGuard() {
  const [user, setUser] = useState<User | null>(userCache)
  const [loading, setLoading] = useState(!userCache)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser: setAuthUser } = useAuthStore()
  const isChecking = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (isChecking.current) return

      // Cache varsa onu kullan
      const now = Date.now()
      if (userCache && now - cacheTimestamp < CACHE_DURATION) {
        setUser(userCache)
        setLoading(false)
        return
      }

      try {
        isChecking.current = true
        setLoading(true)
        setError(null)

        // /me endpoint'ine istek at
        const response = await api.get('/api/v1/accounts/me/')
        const userData = response.data

        const user: User = {
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          role: userData.role || ['expert'],
        }

        // Cache güncelle
        userCache = user
        cacheTimestamp = now

        setUser(user)
        setAuthUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role || ['expert'],
          first_name: userData.first_name,
          last_name: userData.last_name
        })
      } catch (err: any) {
        import.meta.env.VITE_ENVIRONMENT === 'development' && 
          console.error('Auth check failed:', err)
        setError('Authentication failed')
        setUser(null)
        userCache = null
        cacheTimestamp = 0
        setAuthUser(null)
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        navigate({ to: '/sign-in', replace: true })
      } finally {
        setLoading(false)
        isChecking.current = false
      }
    }

    checkAuth()
  }, [navigate, setAuthUser])

  const clearCache = () => {
    userCache = null
    cacheTimestamp = 0
  }

  return { user, loading, error, clearCache }
}
