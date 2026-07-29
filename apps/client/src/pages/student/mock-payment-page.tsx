import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEventQuery } from '../../api/queries'
import { useRegisterEventMutation } from '../../api/mutations'
import { FormSkeleton } from '../../components/skeletons'
import { Lock, Check } from 'lucide-react'

export default function MockPaymentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading } = useEventQuery(id)
  const registerMutation = useRegisterEventMutation(id)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')

  const typedEvent = event as any

  const handlePay = () => {
    setError('')
    registerMutation.mutate(undefined, {
      onSuccess: () => setPaid(true),
      onError: (err: any) => setError(err.response?.data?.error || 'Payment failed'),
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface px-4 py-6">
        <FormSkeleton sections={1} />
      </div>
    )
  }

  if (paid) {
    return (
      <div className="flex-1 bg-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="w-6 h-6 text-green-500" />
        </div>
        <h2 className="text-foreground font-bold text-lg mb-1">Payment Successful</h2>
        <p className="text-muted-foreground text-sm mb-6">You're registered for {typedEvent?.name}.</p>
        <button
          onClick={() => navigate(`/events/${id}`, { replace: true })}
          className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full cursor-pointer"
        >
          Back to Event
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface flex flex-col">
      <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Payment</h1>
      </div>

      <div className="flex-1 px-4 py-6 max-w-sm mx-auto w-full">
        {/* Order summary */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Order Summary</p>
          <div className="flex justify-between items-start gap-3">
            <p className="text-sm text-foreground font-medium leading-snug">{typedEvent?.name} <span className="text-muted-foreground font-normal">x1</span></p>
            <p className="text-sm font-bold text-foreground whitespace-nowrap">
              RM {Number(typedEvent?.pricing).toFixed(2)}
            </p>
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between">
            <p className="text-sm font-semibold text-foreground">Total</p>
            <p className="text-sm font-bold text-primary">RM {Number(typedEvent?.pricing).toFixed(2)}</p>
          </div>
        </div>

        {/* Mock payment method */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Payment Method</p>
          <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Demo Payment</p>
              <p className="text-xs text-muted-foreground">No real charge will be made</p>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <button
          onClick={handlePay}
          disabled={registerMutation.isPending}
          className="w-full bg-accent text-white font-semibold py-3 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {registerMutation.isPending ? 'Processing...' : `Pay RM ${Number(typedEvent?.pricing).toFixed(2)}`}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 text-sm text-muted-foreground py-2 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
