import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../database/schema'

export interface AuthRequest extends Request {
  user?: { id: number; sunway_id: string; role: string }
}

type JwtPayload = { id: number; sunway_id: string; role: string; tv?: number }

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    // reject tokens issued before the user's last password reset (token_version bump), tokens issued before this feature have no tv and default to 0, matching new users
    const [u] = await db.select({ token_version: users.token_version }).from(users).where(eq(users.id, decoded.id)).limit(1)
    if (!u || u.token_version !== (decoded.tv ?? 0)) {
      return res.status(401).json({ error: 'Session expired' })
    }
    req.user = { id: decoded.id, sunway_id: decoded.sunway_id, role: decoded.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// decodes the JWT if present but never blocks the request, used by routes that need to know the caller's role without requiring auth (e.g. to filter audience-restricted events)
export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  // extract the token from the Authorization header (Bearer <token>)
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; sunway_id: string; role: string }
    } catch {
      // ignore invalid/expired token, treat as anonymous/guest user
    }
  }
  next()
}