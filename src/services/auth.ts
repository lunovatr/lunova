// src/services/auth.ts

import api from '@/lib/api'
import { AuthUser } from '@/stores/auth-store'

// AuthUser interface'ini (tipini) auth-store'dan veya ayrı bir yerden alabilirsiniz.
// Eğer AuthUser interface'ini store'dan taşımak istemiyorsanız, 
// şimdilik bu şekilde 'any' kullanabilir veya interface'i buraya kopyalayabilirsiniz.
// En iyisi, ortak bir 'types' dosyasında tutmaktır.


/**
 * Oturumdaki kullanıcı bilgilerini backend'den çeker. (GET /api/v1/accounts/me/)
 * @returns Kullanıcı verisi (AuthUser)
 * @throws AxiosError (401/403 gibi hatalar için)
 */
export const fetchCurrentUser = async (): Promise<AuthUser> => {
    // API isteği ve hata fırlatma mantığı burada kalır.
    const response = await api.get<AuthUser>('/api/v1/accounts/me/')
    return response.data
}

/**
 * Kullanıcının oturumunu sonlandırır. (POST /api/v1/accounts/logout/)
 * Bu fonksiyon, logout işleminin kendisi 401 dönse bile yerel state'i temizlemek için 
 * hata fırlatmamalıdır (veya sadece loglayıp devam etmelidir).
 */
export const performLogout = async (): Promise<void> => {
    try {
        await api.post('/api/v1/accounts/logout/')
    } catch (error) {
        // Logunuzdaki 'logout failed' hatası buraya düşecektir. 
        // Döngü korumasını store ve interceptor'da sağladığımız için, 
        // burada hatayı fırlatmadan sadece loglayıp devam edebiliriz.
        import.meta.env.VITE_ENVIRONMENT === 'development' && 
            console.warn('Backend logout request failed, proceeding.', error);
    }
    // Başarılı veya başarısız olsun, void döner.
}

// Buraya Login, Register gibi diğer API fonksiyonları da eklenebilir.
// ama şimdilik bu işlemleri features/auth içerisinde yapıyorum.
// export const apiLogin = (credentials: any) => api.post(...)