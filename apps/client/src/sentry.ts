import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'

// injected at build time by vite.config.ts so it matches the release the sourcemaps were uploaded under
declare const __SENTRY_RELEASE__: string | undefined

// axios rejections carry the server response, a 4xx is the API telling the user something (bad input, expired session, not found) rather than a bug worth paging on
function isExpectedApiError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  // no DSN in local dev and CI, so the SDK stays inert and does not send anything to Sentry
  if (!dsn) return

  Sentry.init({
    // the address it sends error reports to
    dsn,
    // labels every report with the environment (uat, development)
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    // the commit hash or other unique string that ties a stack trace to the sourcemaps uploaded for that build so stack traces are readable
    release: typeof __SENTRY_RELEASE__ === 'string' ? __SENTRY_RELEASE__ : undefined,

    // never let the SDK infer identity from cookies/headers, user context is set explicitly in auth-context
    sendDefaultPii: false,

    // plugins
    integrations: [
      // lets Sentry follow a user across page navigations and time how long things take
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes,
      }),
      // session replay to see what the user did leading up to an error
      Sentry.replayIntegration({
        // blank out all text and inputs so sensitive info (passwords, tokens, personal info) in the replay
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // UAT traffic is low so sample everything
    tracesSampleRate: 1.0,
    // session replay is expensive, only record when an error occurs
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event, hint) {
      if (isExpectedApiError(hint?.originalException)) return null
      // query strings carry password-reset tokens, keep the path and drop the rest
      if (event.request?.url) event.request.url = event.request.url.split('?')[0]
      return event
    },
  })
}

// called from auth-context on login/logout so an error report says which account hit it
export function setSentryUser(user: { id: number | string; role: string } | null) {
  Sentry.setUser(user ? { id: String(user.id), role: user.role } : null)
}
