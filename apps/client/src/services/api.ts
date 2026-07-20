import axios from 'axios'

// auth lives entirely in an httpOnly session cookie set by the server, never touches localStorage or JS, so it cannot be read by page scripts or an XSS payload
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// on a 401 (expired/invalid session cookie), the session is gone, send the user back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLoginRequest = error.config?.url?.includes('/auth/login')

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('user')
      window.location.href = '/login?reason=session_expired'
    }
    return Promise.reject(error)
  }
)

export default api