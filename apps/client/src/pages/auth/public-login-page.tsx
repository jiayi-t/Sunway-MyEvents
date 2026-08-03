import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import LoginFooter from '../../components/login-footer'
import api from '../../services/api'

export default function PublicLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // only honor same-origin app paths to avoid open-redirects
  const redirectParam = searchParams.get('redirect')
  const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : null

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = { sunwayId: form.email, password: form.password, role: 'public' }
      const res = await api.post('/auth/login', payload)
      login(res.data.user)
      const interests = res.data.user.interests
      if (!interests || interests.length === 0) {
        navigate('/select-interests')
        return
      }
      // only send back to the event if they have already completed the first-time walkthrough
      navigate(safeRedirect && res.data.user.tour_completed_at ? safeRedirect : '/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password')
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
          Sign in with your Email
        </h1>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm  focus:outline-none focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              className="mt-2 text-accent text-xs font-medium underline cursor-pointer"
              onClick={() => navigate('/forgot-password?role=public')}
            >
              Forgot your password?
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/login/public/register')}
            className="text-accent font-semibold underline cursor-pointer"
          >
            Create one now!
          </button>
        </p>
      </div>

      <LoginFooter />
    </div>
  )
}
