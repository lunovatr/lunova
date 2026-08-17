// src/lib/api-setup.ts

import api from '@/lib/api' // Axios instance'ı
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

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

    // Response interceptor (örneğin 401 hatasında global logout)
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            const status = error.response?.status

            if (status === 401) {
                // Zustan store'dan hem fonksiyonu hem de bayrağı al
                const { logout, isLoggingOut } = useAuthStore.getState() // <-- isLoggingOut'u aldık
                // KRİTİK KONTROL: Eğer zaten logout işlemi başlamamışsa devam et
                if (!isLoggingOut) {
                    logout()
                    toast.error('Oturum süreniz doldu. Lütfen sayfayı yenileyin.')
                } else {
                    // İkinci 401 geldi, ama zaten logout oluyorduk.
                    console.warn('Axios Interceptor: 401 received during an active logout process. Ignoring.')
                }
            } else if (status >= 500) {
                toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.')
            }

            return Promise.reject(error)
        }
    )
}
