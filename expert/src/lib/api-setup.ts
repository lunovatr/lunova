// src/lib/api-setup.ts

import api from '@/lib/api' // Axios instance'ı
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

const REFRESH_URL = '/api/v1/accounts/token/refresh/'

// Aynı anda birden fazla istek 401 alırsa hepsi TEK bir refresh çağrısını
// paylaşsın diye (her biri ayrı ayrı refresh tetiklemesin).
let refreshPromise: Promise<void> | null = null

function isAuthRoute(url?: string) {
    if (!url) return false
    return url.includes('/accounts/token/refresh/') || url.includes('/accounts/login/')
}

function refreshAccessToken(): Promise<void> {
    if (!refreshPromise) {
        refreshPromise = api
            .post(REFRESH_URL)
            .then(() => undefined)
            .finally(() => {
                refreshPromise = null
            })
    }
    return refreshPromise
}

/**
 * Axios interceptor'larını yapılandırarak global 401 hata yönetimini sağlar.
 * Bu fonksiyon, uygulamanın başlangıcında sadece bir kez çağırılır.
 */
// Request interceptor (gerekirse log veya extra header eklenebilir)
export const setupApiInterceptors = () => {
    api.interceptors.request.use(
    (config) => {
        // Örneğin: her istekte loading başlatmak istersen burada yaparsın
        return config
    },
    (error) => Promise.reject(error)
    )

    // Response interceptor: 401 alan istekleri önce httpOnly refresh cookie'siyle
    // sessizce yenilemeyi dener, başarılı olursa isteği bir kez daha yapar.
    // Yenileme de başarısız olursa (oturum gerçekten sona ermiş) mevcut logout
    // akışına düşer.
    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const status = error.response?.status
            const originalRequest = error.config

            if (status !== 401) {
                if (status >= 500) {
                    toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.')
                }
                return Promise.reject(error)
            }

            if (!isAuthRoute(originalRequest?.url) && !originalRequest?._retry) {
                originalRequest._retry = true
                try {
                    await refreshAccessToken()
                    return api(originalRequest)
                } catch {
                    // Yenileme başarısız oldu, aşağıda oturumu sonlandırıyoruz.
                }
            }

            // Zustan store'dan hem fonksiyonu hem de bayrağı al
            const { logout, isLoggingOut } = useAuthStore.getState() // <-- isLoggingOut'u aldık
            // KRİTİK KONTROL: Eğer zaten logout işlemi başlamamışsa devam et
            if (!isLoggingOut) {
                logout()
                toast.error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
            } else {
                // İkinci 401 geldi, ama zaten logout oluyorduk.
                console.warn('Axios Interceptor: 401 received during an active logout process. Ignoring.')
            }

            return Promise.reject(error)
        }
    )
}
