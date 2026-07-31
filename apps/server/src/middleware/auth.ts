import { Request, Response, NextFunction } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../database/schema'
import { validateSession } from '../utils/sessions'
import { SESSION_COOKIE } from '../utils/cookies'

export interface AuthRequest extends Request {
  user?: { id: number; sunway_id: string; role: string }
  sessionId?: string
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.[SESSION_COOKIE]

  if (!sessionId) {
    return res.status(401).json({ error: 'No session provided' })
  }

  try {
    const session = await validateSession(sessionId)
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' })
    }

    const [user] = await db
      .select({ id: users.id, sunway_id: users.sunway_id, role: users.role })
      .from(users)
      .where(eq(users.id, session.user_id))
      .limit(1)

    if (!user || !user.role) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = { id: user.id, sunway_id: user.sunway_id, role: user.role as string }
    req.sessionId = sessionId
    next()
  } catch {
    return res.status(401).json({ error: 'Session validation failed' })
  }
}

// validates the session cookie if present but never blocks the request, used by routes that need to know the caller's role without requiring auth (e.g. to filter audience-restricted events)
export const optionalAuthenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.[SESSION_COOKIE]
  if (sessionId) {
    try {
      const session = await validateSession(sessionId)
      if (session) {
        const [user] = await db
          .select({ id: users.id, sunway_id: users.sunway_id, role: users.role })
          .from(users)
          .where(eq(users.id, session.user_id))
          .limit(1)
        if (user && user.role) {
          req.user = { id: user.id, sunway_id: user.sunway_id, role: user.role as string }
          req.sessionId = sessionId
        }
      }
    } catch {
      // ignore invalid/expired session, treat as anonymous/guest user
    }
  }
  next()
}