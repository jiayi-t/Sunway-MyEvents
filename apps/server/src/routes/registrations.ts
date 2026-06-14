import { Router } from 'express'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { registrations, events, users } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/registrations/my - get current user's registrations
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: registrations.id,
        event_id: registrations.event_id,
        registered_at: registrations.registered_at,
        event_name: events.name,
        event_date: events.date,
        event_start_time: events.start_time,
        event_end_time: events.end_time,
        event_venue: events.venue,
        event_category: events.category,
        event_image_url: events.image_url,
        event_cancelled_at: events.cancelled_at,
        organizer_name: users.name
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.event_id, events.id))
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(eq(registrations.user_id, req.user!.id))
      .orderBy(asc(events.date))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router