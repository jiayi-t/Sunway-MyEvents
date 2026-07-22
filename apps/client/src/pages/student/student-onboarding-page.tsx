import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/auth-context'
import LoginFooter from '../../components/login-footer'

// value lowercases to the recommendation engine's faculty keys
const FACULTIES = [
  { value: 'FASS', label: 'Faculty of Arts & Social Sciences (FASS)' },
  { value: 'FET', label: 'Faculty of Engineering & Technology (FET)' },
  { value: 'FMLS', label: 'Faculty of Medical & Life Sciences (FMLS)' },
  { value: 'SBS', label: 'Sunway Business School (SBS)' },
  { value: 'SHTM', label: 'School of Hospitality & Tourism Management (SHTM)' },
  { value: 'SMS', label: 'School of Mathematical Sciences (SMS)' },
  { value: 'CAE', label: 'Centre for American Education (CAE)' },
  { value: 'VU', label: 'Victoria University Programs (VU)' },
  { value: 'STES', label: 'Sunway TES (STES)' },
  // Pre-U students get no faculty-based category boost (only from their interests/activity)
  { value: 'PREU', label: 'Pre-University (Pre-U)' },
]

const YEARS = ['Pre-University', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate']

// phone number: digits, spaces, + and - allowed, must contain at least one digit
const MOBILE_RE = /^(?=.*\d)[\d+\s-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function StudentOnboardingPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()

  const [form, setForm] = useState({
    name: '', program: '', faculty: '', year_of_study: '', gender: '', mobile_number: '', personal_email: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    setError('')
    setSubmitted(true)
    if (!form.name.trim() || !form.program.trim() || !form.faculty || !form.year_of_study || !form.gender) {
      setError('Please fill in all required fields')
      return
    }
    if (form.mobile_number && !MOBILE_RE.test(form.mobile_number)) {
      setError('Enter a valid mobile number (e.g. +60 12-345 6789)')
      return
    }
    if (form.personal_email && !EMAIL_RE.test(form.personal_email.trim())) {
      setError('Enter a valid email')
      return
    }
    setSaving(true)
    try {
      const res = await api.put('/auth/student-onboarding', form)
      updateUser({ name: res.data.name })
      navigate('/select-interests', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.')
      setSaving(false)
    }
  }

  const errorClass = (empty: boolean) => (submitted && empty ? 'border-red-400' : 'border-gray-300')

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-primary text-xl font-bold mb-2">Tell us about yourself</h1>

          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 mb-5">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              During this FYP user acceptance testing, Sunway MyEvents is not connected to the live Sunway student system,
              so a few details are needed that would normally come from your Sunway student account. This gives
              you the full experience with personalised recommendations and the correct event access.
            </p>
          </div>
          

          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${errorClass(!form.name.trim())}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${errorClass(!form.gender)}`}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faculty / School</label>
              <select
                value={form.faculty}
                onChange={e => set('faculty', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${errorClass(!form.faculty)}`}
              >
                <option value="">Select your faculty</option>
                {FACULTIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
              <input
                type="text"
                placeholder="e.g. Bachelor of Software Engineering (Hons)"
                value={form.program}
                onChange={e => set('program', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${errorClass(!form.program.trim())}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
              <select
                value={form.year_of_study}
                onChange={e => set('year_of_study', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${errorClass(!form.year_of_study)}`}
              >
                <option value="">Select your year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Email <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. jiayi@gmail.com"
                value={form.personal_email}
                onChange={e => set('personal_email', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${submitted && form.personal_email && !EMAIL_RE.test(form.personal_email.trim()) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="e.g. +60 12-345 6789"
                value={form.mobile_number}
                onChange={e => set('mobile_number', e.target.value.replace(/[^\d+\s-]/g, ''))}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary ${submitted && form.mobile_number && !MOBILE_RE.test(form.mobile_number) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      <LoginFooter />
    </div>
  )
}
