import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Info } from 'lucide-react'
import { useResetPasswordMutation } from '../../api/mutations'
import { useValidateResetTokenQuery } from '../../api/queries'
import LoginFooter from '../../components/login-footer'
import { Skeleton } from '../../components/skeletons'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [validationError, setValidationError] = useState('')

  const tokenCheck = useValidateResetTokenQuery(token)
  const mutation = useResetPasswordMutation()

  // set once the token is validated, for the seeded demo organizer accounts listed on the organizer login page
  const isSeeded = !!tokenCheck.data?.is_seeded

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-primary text-xl font-bold mb-6">Reset Password</h1>
          {content}
        </div>
      </div>

      <LoginFooter />
    </div>
  )

  if (!token || (tokenCheck.isSuccess && !tokenCheck.data.valid)) {
    return shell(
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-red-500 font-semibold mb-2">Invalid or expired reset link</p>
        <p className="text-sm text-muted-foreground mb-4">This link has expired or already been used.</p>
        <Link to="/forgot-password" className="text-accent font-semibold text-sm underline">Request a new reset link</Link>
      </div>
    )
  }

  if (tokenCheck.isLoading) {
    return shell(
      <div className="bg-white rounded-xl shadow p-6">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3 mt-3" />
        <Skeleton className="h-10 w-full mt-4" />
      </div>
    )
  }

  if (mutation.isSuccess) {
    const seeded = !!mutation.data?.is_seeded
    return shell(
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-green-600 font-semibold mb-2">{seeded ? 'Flow complete' : 'Password reset!'}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {seeded
            ? "That is the end of the password reset flow. Since this is a demo account, the password is still sunway123 so other testers can login with the same credentials."
            : 'You can now sign in with your new password.'}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-primary text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Login
        </button>
      </div>
    )
  }

  const handleSubmit = () => {
    setValidationError('')
    if (form.password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }
    mutation.mutate({ token, password: form.password })
  }

  const serverError = mutation.isError
    ? ((mutation.error as any)?.response?.data?.error ?? 'Something went wrong. Please try again.')
    : ''

  return shell(
    <div className="bg-white rounded-xl shadow p-6">
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary pr-10"
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

      {(validationError || serverError) && (
        <p className="text-red-500 text-sm mb-3">{validationError || serverError}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/login')}
          className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="flex-1 bg-primary text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
