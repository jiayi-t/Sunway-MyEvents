import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useChangePasswordMutation } from '../../api/mutations'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, updateToken } = useAuth()

  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [validationError, setValidationError] = useState('')

  const mutation = useChangePasswordMutation()

  // set on the login response for the seeded demo organizer accounts listed on the organizer login page
  const isSeeded = !!user?.is_seeded

  const back = () => navigate(user?.role === 'organizer' ? '/organizer/profile' : '/settings')

  const handleSubmit = () => {
    setValidationError('')
    if (!form.current || !form.next) {
      setValidationError('Please fill in all fields')
      return
    }
    if (form.next.length < 8) {
      setValidationError('New password must be at least 8 characters')
      return
    }
    if (form.next !== form.confirm) {
      setValidationError('New passwords do not match')
      return
    }
    if (form.next === form.current) {
      setValidationError('New password must be different from the current one')
      return
    }
    mutation.mutate(
      { currentPassword: form.current, newPassword: form.next },
      // seeded demo accounts get no token back (nothing was persisted), keep the current session's token
      { onSuccess: (data) => { if (data.token) updateToken(data.token) } },
    )
  }

  const serverError = mutation.isError
    ? ((mutation.error as any)?.response?.data?.error ?? 'Something went wrong. Please try again.')
    : ''

  const field = (
    key: 'current' | 'next' | 'confirm',
    label: string,
    placeholder?: string,
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show[key] ? 'text' : 'password'}
          value={form[key]}
          placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {show[key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-surface">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Change Password</h1>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-sm">
          {isSeeded && (
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 mb-4">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is a demo account, so its password cannot actually be reset and will stay as {' '}
                <span className="font-semibold text-foreground">sunway123</span>. 
                You may still go through the password reset flow to test it out, but the password will not actually change so other testers can login with the same credentials.
              </p>
            </div>
          )}

          {mutation.isSuccess ? (
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-green-600 font-semibold mb-2">
                {isSeeded ? 'Flow complete' : 'Password changed'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {isSeeded
                  ? "That is the end of the password reset flow. Since this is a demo account, the password is still sunway123 so other testers can login with the same credentials."
                  : 'Your password has been updated. You have been signed out on any other devices.'}
              </p>
              <button
                onClick={back}
                className="w-full bg-primary text-white rounded-lg py-3 text-sm font-semibold"
              >
                Back to Profile
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6">
              {field('current', 'Current Password')}
              {field('next', 'New Password', 'At least 8 characters')}
              {field('confirm', 'Confirm New Password')}

              <button
                type="button"
                onClick={() => navigate(`/forgot-password?role=${user?.role ?? ''}`)}
                className="text-accent text-xs font-medium underline"
              >
                Forgot your password?
              </button>

              {(validationError || serverError) && (
                <p className="text-red-500 text-sm mt-3">{validationError || serverError}</p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={back}
                  className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="flex-1 bg-primary text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
