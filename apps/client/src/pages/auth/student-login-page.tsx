import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import LoginFooter from '../../components/login-footer'
import api from '../../services/api'

export default function StudentLoginPage() {
  const [form, setForm] = useState({ sunwayId: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError('')
    // students sign in with their 8-digit Sunway student ID (auto-creates on first login)
    const id = form.sunwayId.trim()
    if (!/^\d{8}$/.test(id)) {
      setError('Enter your 8-digit Sunway student ID')
      return
    }
    setLoading(true)
    try {
      const payload = { sunwayId: form.sunwayId, password: form.password }
      const res = await api.post('/auth/login', payload)
      login(res.data.user, res.data.token)
      if (res.data.needs_onboarding) {
        navigate('/student-onboarding')
        return
      }
      const interests = res.data.user.interests
      navigate((!interests || interests.length === 0) ? '/select-interests' : '/')
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
          Sign in with your Sunway ID
        </h1>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="e.g. 22055313"
              value={form.sunwayId}
              onChange={e => setForm({ ...form, sunwayId: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm  focus:outline-none focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-xs text-muted-foreground mt-4 text-center leading-relaxed">
            This FYP is not linked to your actual Sunway login. <br></br>Enter your student ID and a
            password to create your account, then sign in with the same details next time.
          </p>
        </div>
      </div>

      <LoginFooter />
    </div>
  )
}