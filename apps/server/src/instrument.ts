// must be the first import in index.ts, the Node SDK patches http/express/pg as they are required so anything loaded before this is left uninstrumented
import dotenv from 'dotenv'
dotenv.config()

import * as Sentry from '@sentry/node'

// request bodies here carry credentials, reset tokens and session ids, none belong in an error report
const SENSITIVE_KEYS = [
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'token', 'rawToken', 'sessionId', 'authorization', 'cookie',
]

function redact(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s.toLowerCase()))
        ? [k, '[redacted]']
        : [k, redact(v)]
    )
  )
}

// runs on import rather than via an exported function, the SDK has to be initialised before
// express/pg are required and an exported init would run after index.ts finished its imports
const dsn = process.env.SENTRY_DSN
// unset in local dev, CI and tests, so the SDK stays inert
if (dsn) {
  Sentry.init({
    // where reports go, set in the environment so it can be changed without code changes
    dsn,
    // tags reports with the environment 
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    // same commit hash as the client, so a server's error's stack trace can be matched to the client bundle that produced it
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT,

    // never attach IPs, cookies or headers automatically
    sendDefaultPii: false,

    // UAT traffic is low enough that full tracing costs nothing and hides nothing
    tracesSampleRate: 1.0,

    beforeSend(event) {
      if (event.request) {
        if (event.request.data) event.request.data = redact(event.request.data) as typeof event.request.data
        // redact raw reset tokens in the query string of the password reset link
        if (event.request.query_string) event.request.query_string = '[redacted]'
        if (event.request.url) event.request.url = event.request.url.split('?')[0]
        delete event.request.cookies
        delete event.request.headers
      }
      return event
    },
  })
}

// used by the route catch blocks, which handle their own response and so never reach the express error middleware, tags carry the route and caller so issues group usefully
export function captureError(
  error: unknown,
  req?: { method?: string; originalUrl?: string; user?: { id: number; role: string } }
) {
  if (!Sentry.getClient()) {
    // no DSN configured, still surface it in the platform logs rather than swallowing it
    console.error('[error]', req?.method, req?.originalUrl, error)
    return
  }
  Sentry.withScope(scope => {
    if (req) {
      // labels the error with the endpoint route and user
      scope.setTag('route', `${req.method ?? ''} ${req.originalUrl ?? ''}`.trim())
      if (req.user) scope.setUser({ id: String(req.user.id), role: req.user.role })
    }
    Sentry.captureException(error)
  })
}
