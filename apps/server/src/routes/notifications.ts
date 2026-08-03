import { Router } from 'express'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { db } from '../db'
import { notifications, events, users } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'
import { captureError } from '../instrument'

const router = Router()

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        id: notifications.id,
        user_id: notifications.user_id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
        // public uuids only, never the internal integer ids, the client links to /events/:id or /organizers/:id
        event_id: events.public_id,
        organizer_id: users.public_id,
      })
      .from(notifications)
      .leftJoin(events, eq(notifications.related_event_id, events.id))
      .leftJoin(users, eq(notifications.related_organizer_id, users.id))
      .where(eq(notifications.user_id, req.user!.id))
      .orderBy(desc(notifications.created_at))
      .limit(50)
    res.json(rows)
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.update(notifications)
      .set({ read_at: new Date() })
      .where(and(eq(notifications.user_id, req.user!.id), isNull(notifications.read_at)))
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})


export default router
