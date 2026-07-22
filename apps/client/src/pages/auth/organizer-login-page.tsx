import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useOrganizerAccountsQuery, type OrganizerAccount } from '../../api/queries'
import LoginFooter from '../../components/login-footer'
import api from '../../services/api'

function AccountGroup({
  heading,
  accounts,
  onPick,
}: {
  heading: string
  accounts: OrganizerAccount[]
  onPick: (sunwayId: string) => void
}) {
  return (
    <div className="py-1.5">
      {/* Section heading */}
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          {heading}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Username
        </p>
      </div>

      <ul className="divide-y divide-primary/10 mt-0.5">
        {accounts.map(acc => (
          <li key={acc.sunway_id}>
            <button
              type="button"
              onClick={() => onPick(acc.sunway_id)}
              className="w-full py-2 flex items-baseline justify-between gap-3 text-left cursor-pointer"
            >
              <span className="text-xs text-foreground truncate">{acc.name}</span>
              <span className="text-xs font-semibold text-accent flex-shrink-0">{acc.sunway_id}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function OrganizerLoginPage() {
  const [form, setForm] = useState({ sunwayId: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // came from "Log in to register", send them back to the event (read-only view for organizers)
  const redirectParam = searchParams.get('redirect')
  const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : null

  const { data, isLoading: accountsLoading } = useOrganizerAccountsQuery(showAccounts)
  const accounts = data?.accounts ?? []
  const seededPassword = data?.password ?? ''

  const slbAccounts = accounts.filter(a => a.category === 'SLB')
  const csAccounts = accounts.filter(a => a.category !== 'SLB')

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = { sunwayId: form.sunwayId, password: form.password, role: 'organizer' }
      const res = await api.post('/auth/login', payload)
      login(res.data.user)
      navigate(safeRedirect ?? '/organizer/dashboard')
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

        {/* Existing accounts */}
        <div className="w-full max-w-sm">
          <div className="bg-primary/5 border border-primary/20 rounded-lg mb-4">
            <div className="flex items-start gap-2 px-3 py-2.5">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Several demo SLB and C&S accounts have been added. <br></br>Sign in with one, or create a new account if your SLB/C&S is not listed.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAccounts(o => !o)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
                >
                  {showAccounts ? 'Hide' : 'View'} existing accounts
                  {showAccounts
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {showAccounts && (
              <div className="border-t border-primary/20 px-3 py-1 max-h-64 overflow-y-auto">
                {accountsLoading ? (
                  <p className="text-xs text-muted-foreground py-2">Loading accounts...</p>
                ) : accounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No demo accounts yet.</p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground py-2 border-b border-primary/10">Password for all: <span className="font-semibold text-foreground">{seededPassword}</span></p>
                    {slbAccounts.length > 0 && (
                      <AccountGroup
                        heading="SLB"
                        accounts={slbAccounts}
                        onPick={id => setForm({ sunwayId: id, password: seededPassword })}
                      />
                    )}
                    {csAccounts.length > 0 && (
                      <AccountGroup
                        heading="C&S"
                        accounts={csAccounts}
                        onPick={id => setForm({ sunwayId: id, password: seededPassword })}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SLB / C&S Username</label>
            <input
              type="text"
              value={form.sunwayId}
              onChange={e => setForm({ ...form, sunwayId: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm  focus:outline-none focus:border-primary"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-xs font-medium underline cursor-pointer"
                onClick={() => navigate('/forgot-password?role=organizer')}
              >
                Forgot?
              </button>
            </div>
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
            onClick={() => navigate('/login/organizer/register')}
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