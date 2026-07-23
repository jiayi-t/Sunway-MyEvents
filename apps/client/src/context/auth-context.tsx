import { createContext, useContext, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '../services/api'

interface User {
  id: number
  // uuid used in public URLs, the integer id stays internal to the server
  public_id?: string
  sunway_id: string
  email?: string
  name: string
  role: string
  image_url?: string | null
  interests?: string[] | null
  tour_completed_at?: string | null
  is_seeded?: boolean
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  // the session itself lives in httpOnly cookies the client never touches
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  // localStorage is shared across tabs, when another tab logs in/out, redirect this tab onto the new session instead of keeping stale UI
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== 'user' || e.oldValue === e.newValue) return
      if (!e.newValue) {
        // logged out in another tab
        window.location.href = '/login'
        return
      }
      // logged in / switched account in another tab, reload onto the new account's home
      const role = JSON.parse(e.newValue).role
      window.location.href = role === 'organizer' ? '/organizer/dashboard' : '/'
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const login = (user: User) => {
    // a new identity must not reuse cached queries from the previous session
    queryClient.clear()
    setUser(user)
    localStorage.setItem('user', JSON.stringify(user))
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
    // invalidate the session server-side and clear the httpOnly cookies
    api.post('/auth/logout').catch(() => {})
    setUser(null)
    localStorage.removeItem('user')
    setTimeout(() => queryClient.clear(), 0)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}