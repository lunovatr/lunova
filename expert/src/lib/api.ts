import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true, // HttpOnly cookie gönderimi otomatik
  headers: {
    'X-Frontend-Type': 'expert', // senin özel header'ını koruduk
    'Content-Type': 'application/json'
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

export default api
