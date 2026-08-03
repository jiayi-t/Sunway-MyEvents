import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { feedback, events } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'
import { captureError } from '../instrument'

const router = Router()

// GET /api/feedback/my - student's feedback given
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: feedback.id,
        // expose the event's public uuid so the client can match it against the url param and other lists
        event_id: events.public_id,
        rating: feedback.rating,
        created_at: feedback.created_at,
      })
      .from(feedback)
      .innerJoin(events, eq(feedback.event_id, events.id))
      .where(eq(feedback.user_id, req.user!.id))
    res.json(result)
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
