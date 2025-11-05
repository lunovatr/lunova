import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true, // HttpOnly cookie gönderimi otomatik
  headers: {
    'X-Frontend-Type': 'expert', // senin özel header'ını koruduk
    'Content-Type': 'application/json'
  }
})

export default api
