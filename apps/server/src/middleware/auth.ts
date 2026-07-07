import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { id: number; sunway_id: string; role: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; sunway_id: string; role: string }
    req.user = decoded
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