import { createContext, useContext, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

interface User {
  id: number
  sunway_id: string
  email?: string
  name: string
  role: string
  image_url?: string | null
  interests?: string[] | null
  tour_completed_at?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token')
  })

  // localStorage is shared across tabs, when another tab logs in/out, redirect this tab onto the new session instead of keeping stale UI
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== 'token' || e.oldValue === e.newValue) return
      if (!e.newValue) {
        // logged out in another tab
        window.location.href = '/login'
        return
      }
      // logged in / switched account in another tab, reload onto the new account's home
      const saved = localStorage.getItem('user')
      const role = saved ? JSON.parse(saved).role : null
      window.location.href = role === 'organizer' ? '/organizer/dashboard' : '/'
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const login = (user: User, token: string) => {
    setUser(user)
    setToken(token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setTimeout(() => queryClient.clear(), 0)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}