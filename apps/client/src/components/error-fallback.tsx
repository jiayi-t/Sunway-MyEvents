import { AlertTriangle } from 'lucide-react'

// shown by the Sentry ErrorBoundary in App.tsx when a render throws
export default function ErrorFallback({ resetError }: { resetError?: () => void }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow max-w-sm w-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-accent" />
        </div>
        <h1 className="font-bold text-lg mt-4">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mt-2">
          This page ran into an unexpected error. It has been reported to our team.
        </p>
        <div className="mt-5 space-y-2">
          <button
            onClick={() => (resetError ? resetError() : window.location.reload())}
            className="w-full bg-primary text-white rounded-full py-2.5 text-sm font-medium cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            className="w-full border border-border rounded-full py-2.5 text-sm font-medium cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
