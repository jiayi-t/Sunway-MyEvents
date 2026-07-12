import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'
import LoginFooter from '../../components/login-footer'

const CNS_CATEGORIES = ['Accounting & Finance', 'Art & Music', 'Business', 'Cultural', 'General Interest', 'Martial Art', 'Nature', 'Religious', 'Sports', 'Uniform/Affiliate']

type OrgType = 'slb' | 'c&s' | ''

export default function OrganizerCreateAccount() {
  const navigate = useNavigate()
  const [orgType, setOrgType] = useState<OrgType>('')
  const [form, setForm] = useState({
    name: '', username: '', email: '', category: '', password: '', confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setSubmitted(true)

    if (!form.name.trim() || !form.username.trim() || !form.email.trim() || !orgType || (orgType === 'c&s' && !form.category) || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (form.username.length > 8) {
      setError('Username must be 8 characters or less. Try your SLB / C&S shortform.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register/organizer', {
        name: form.name,
        username: form.username,
        email: form.email,
        // if SLB is selected, category will be saved as 'SLB'
        category: orgType === 'slb' ? 'SLB' : form.category,
        password: form.password
      })
      setSuccess(true)
      setTimeout(() => navigate('/login/organizer'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-primary text-center">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-md">
        <h2 className="text-primary font-bold text-xl mb-4">Create Account</h2>

        <div className="bg-white rounded-xl shadow p-6 w-full space-y-4" onKeyDown={submitOnEnter}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SLB / C&S Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${submitted && !form.name.trim() ? 'border-red-400' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${submitted && !form.username.trim() ? 'border-red-400' : 'border-gray-300'}`}
            />
            {form.username.length > 8 && (
              <p className="text-red-500 text-xs mt-1">Username must be 8 characters or less. Try your SLB / C&S shortform.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${submitted && !form.email.trim() ? 'border-red-400' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization Type</label>
            <div className="flex gap-3">
              {(['slb', 'c&s'] as OrgType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrgType(type)
                    setForm(f => ({ ...f, category: '' }))
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors
                    ${orgType === type
                      ? 'bg-primary text-white border-primary'
                      : submitted && !orgType
                        ? 'bg-white text-gray-700 border-red-400'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                >
                  {type === 'slb' ? 'SLB' : 'C&S'}
                </button>
              ))}
            </div>
          </div>

          {orgType === 'c&s' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && !form.category ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select a category</option>
                {CNS_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary pr-10 ${submitted && !form.password ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary pr-10 ${submitted && !form.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirm ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/login/organizer')}
              className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </div>
        </div>
      </div>
      
      <LoginFooter />

      {/* Success popup */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg px-8 py-6 mx-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-green-500 text-2xl">✓</span>
            </div>
            <h3 className="text-foreground font-bold text-base mb-1">Account Created!</h3>
            <p className="text-muted-foreground text-sm">Redirecting you back to sign in...</p>
          </div>
        </div>
      )}
    </div>
  )
}