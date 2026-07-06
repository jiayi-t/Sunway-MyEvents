import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForgotPasswordMutation } from '../../api/mutations'
import LoginFooter from '../../components/login-footer'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  const accountPhrase = role === 'organizer' ? 'as an organizer account' : role === 'public' ? 'as a general public account' : ''
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const mutation = useForgotPasswordMutation()

  const handleSubmit = () => {
    if (!email.trim()) return
    mutation.mutate({ email: email.trim() }, {
      onSuccess: () => setSubmitted(true),
    })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        {submitted ? (
          <div className="w-full max-w-sm">
            <h1 className="text-primary text-xl font-bold mb-6">Check your email</h1>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-muted-foreground mb-6">
                If that email address is registered{accountPhrase ? ` ${accountPhrase}` : ''}, we've sent a password reset link. Kindly check your inbox (and spam folder).
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <h1 className="text-primary text-xl font-bold mb-6">Forgot Password</h1>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-muted-foreground mb-5">
                Enter your registered email address and we'll send you a reset link.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {mutation.isError && (
                <p className="text-red-500 text-sm mb-3">Something went wrong. Please try again.</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!email.trim() || mutation.isPending}
                  className="flex-1 bg-primary text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <LoginFooter />
    </div>
  )
}
