import { Response } from 'express'
import { SESSION_DURATION_MS } from './sessions'

export const SESSION_COOKIE = 'session_id'

const isProd = process.env.NODE_ENV === 'production'

export function setAuthCookie(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api',
    maxAge: SESSION_DURATION_MS,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/api' })
}
