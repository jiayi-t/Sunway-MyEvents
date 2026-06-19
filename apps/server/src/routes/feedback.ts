import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { feedback } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/feedback/my - student's feedback given
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: feedback.id,
        event_id: feedback.event_id,
        rating: feedback.rating,
        created_at: feedback.created_at,
      })
      .from(feedback)
      .where(eq(feedback.user_id, req.user!.id))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
