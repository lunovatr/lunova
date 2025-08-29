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

// Global cache for user data
let userCache: User | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useAuthGuard() {
  const [user, setUser] = useState<User | null>(userCache)
  const [loading, setLoading] = useState(!userCache)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const isChecking = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Prevent multiple simultaneous checks
      if (isChecking.current) return
      
      // Check if we have valid cached data
      const now = Date.now()
      if (userCache && (now - cacheTimestamp) < CACHE_DURATION) {
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
        
        // Kullanıcı bilgilerini güncelle
        const user: User = {
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          role: userData.role || ['expert'],
        }
        
        // Cache the user data
        userCache = user
        cacheTimestamp = now
        
        setUser(user)
        
        // Auth store'u güncelle
        auth.setUser({
          accountNo: userData.account_no || 'ACC001',
          email: userData.email,
          role: userData.role || ['expert'],
          exp: Date.now() + 24 * 60 * 60 * 1000,
        })
        
      } catch (err: any) {
        console.error('Auth check failed:', err)
        setError('Authentication failed')
        setUser(null)
        
        // Clear cache
        userCache = null
        cacheTimestamp = 0
        
        // Auth store'u temizle
        auth.reset()
        
        // Kullanıcıyı sign-in sayfasına yönlendir
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        navigate({ to: '/sign-in', replace: true })
      } finally {
        setLoading(false)
        isChecking.current = false
      }
    }

    checkAuth()
  }, [navigate, auth])

  // Function to clear cache (useful for logout)
  const clearCache = () => {
    userCache = null
    cacheTimestamp = 0
  }

  return { user, loading, error, clearCache }
}
