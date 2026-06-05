import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import api from '../services/api'

export default function LoginPage() {
  const [form, setForm] = useState({ sunwayId: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = { sunwayId: form.sunwayId, password: form.password }
      const res = await api.post('/auth/login', payload)
      login(res.data.user, res.data.token)

      if (res.data.user.role === 'organizer') {
        navigate('/organizer/dashboard')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <img
            src="/public/SU SC Logo.png"
            alt="Sunway University and Sunway College"
            className="h-12 w-auto object-contain"
          />
        </div>

        <h1 className="text-primary text-xl font-bold mb-6">Sign in with your Sunway ID</h1>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID or SLB/C&S Username</label>
            <input
              type="text"
              value={form.sunwayId}
              onChange={e => setForm({ ...form, sunwayId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-muted-foreground space-y-30">
        <div className="flex justify-center">
          <img
            src="/public/JCF Logo.png"
            alt="Jeffrey Cheah Foundation"
            className="h-14 w-auto object-contain"
          />
        </div>
        <p>©2026 SUNWAY UNIVERSITY (200401015434 (653937-U)) (DU025(B))</p>
      </div>
    </div>
  )
}