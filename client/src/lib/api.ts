import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Frontend-Type': 'client'
  },
  // Backend artık POST/PATCH/DELETE'lerde CSRF token doğrulaması yapıyor
  // (accounts/authentication.py -> enforce_csrf). Django'nun beklediği cookie/header
  // adlarıyla eşleşmesi için xsrfCookieName/xsrfHeaderName açıkça 'csrftoken'/
  // 'X-CSRFToken' olarak set edildi (axios varsayılanları Angular konvansiyonu olan
  // 'XSRF-TOKEN'/'X-XSRF-TOKEN'). withXSRFToken:true şart — axios varsayılan olarak
  // XSRF header'ını sadece same-origin isteklerde ekliyor, backend farklı porttaysa
  // (burada öyle) bu olmadan header hiç gönderilmez.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withXSRFToken: true
})

const REFRESH_URL = '/api/v1/accounts/token/refresh/'
const SIGNIN_PATH = '/signin'

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

// 401 alan istekleri, oturumu httpOnly refresh cookie'siyle sessizce yenileyip
// bir kez daha deniyor. Yenileme de başarısız olursa (oturum gerçekten sona
// ermiş) kullanıcıyı giriş sayfasına yönlendiriyor.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config

    if (status !== 401) {
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

    if (typeof window !== 'undefined' && window.location.pathname !== SIGNIN_PATH) {
      window.location.href = SIGNIN_PATH
    }
    return Promise.reject(error)
  }
)

export default api
