import { Router } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db'
import { notifications } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, req.user!.id))
      .orderBy(desc(notifications.created_at))
      .limit(50)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string)
  try {
    const [notification] = await db
      .select({ id: notifications.id, user_id: notifications.user_id })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1)
    if (!notification) return res.status(404).json({ error: 'Not found' })
    if (notification.user_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
    await db.update(notifications).set({ read_at: new Date() }).where(eq(notifications.id, id))
    res.json({ message: 'Marked as read' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
