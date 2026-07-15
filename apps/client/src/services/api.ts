import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// auto-logout on expired/invalid token only when a session actually existed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login?reason=session_expired'
    }
    return Promise.reject(error)
  }
)

export default api