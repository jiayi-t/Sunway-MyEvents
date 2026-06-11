import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import LoginFooter from '../../components/login-footer'
import api from '../../services/api'

export default function OrganizerLoginPage() {
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
      navigate('/organizer/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <img
            src="/SU SC Logo.png"
            alt="Sunway University and Sunway College"
            className="h-12 w-auto object-contain"
          />
        </div>

        <h1 className="text-primary text-xl font-bold mb-6">
          Sign in with your Username
        </h1>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SLB / C&S Username</label>
            <input
              type="text"
              placeholder="Use: ssa"
              value={form.sunwayId}
              onChange={e => setForm({ ...form, sunwayId: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Use: sunway123"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-xs font-medium underline"
                onClick={() => navigate('/reset-password')}
              >
                Forgot?
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/login/organizer/register')}
            className="text-accent font-semibold underline"
          >
            Create one now!
          </button>
        </p>
      </div>

      <LoginFooter />
    </div>
  )
}