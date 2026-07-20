import crypto from 'crypto'
import { db } from '../db'
import { sessions } from '../database/schema'
import { eq } from 'drizzle-orm'

// single session token lifetime - server-side row, so it's still revocable (delete the row) even though it is long-lived
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface SessionData {
  id: string
  user_id: number
  expires_at: Date
}

export async function createSession(userId: number): Promise<{ sessionId: string; expiresAt: Date }> {
  const sessionId = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await db.insert(sessions).values({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  })

  return { sessionId, expiresAt }
}

export async function validateSession(sessionId: string): Promise<SessionData | null> {
  const [session] = await db
    .select({ id: sessions.id, user_id: sessions.user_id, expires_at: sessions.expires_at })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) return null
  if (session.expires_at < new Date()) return null

  return session
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function invalidateAllUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.user_id, userId))
}
