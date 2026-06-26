import { Router } from 'express'
import { eq, and, isNull, asc, gte } from 'drizzle-orm'
import { db } from '../db'
import { users, events, followed_organizers, notifications } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/organizers/:id - organizer profile for student view
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  const now = new Date()
  try {
    const [organizer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image_url: users.image_url,
        category: users.category,
        about: users.about,
        social_links: users.social_links,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, 'organizer')))
      .limit(1)

    if (!organizer) return res.status(404).json({ error: 'Organizer not found' })

    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(
        eq(events.organizer_id, id),
        isNull(events.cancelled_at),
        isNull(events.archived_at),
        gte(events.date, now),
      ))
      .orderBy(asc(events.date))
      .limit(10)

    const totalCount = await db.$count(events, eq(events.organizer_id, id))

    res.json({
      ...organizer,
      event_stats: { upcoming: upcomingEvents.length, total: totalCount },
      events: upcomingEvents,
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/:id/follow-status
router.get('/:id/follow-status', authenticate, async (req: AuthRequest, res) => {
  const organizerId = parseInt(req.params.id as string)
  try {
    const [row] = await db
      .select({ id: followed_organizers.id })
      .from(followed_organizers)
      .where(and(
        eq(followed_organizers.student_id, req.user!.id),
        eq(followed_organizers.organizer_id, organizerId),
      ))
      .limit(1)

    res.json({ following: !!row })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/organizers/:id/follow-toggle
router.post('/:id/follow-toggle', authenticate, async (req: AuthRequest, res) => {
  const organizerId = parseInt(req.params.id as string)
  try {
    const [existing] = await db
      .select({ id: followed_organizers.id })
      .from(followed_organizers)
      .where(and(
        eq(followed_organizers.student_id, req.user!.id),
        eq(followed_organizers.organizer_id, organizerId),
      ))
      .limit(1)

    if (existing) {
      await db.delete(followed_organizers).where(eq(followed_organizers.id, existing.id))
      res.json({ following: false })
    } else {
      await db.insert(followed_organizers).values({
        student_id: req.user!.id,
        organizer_id: organizerId,
      })

      const [organizer] = await db.select({ name: users.name }).from(users).where(eq(users.id, organizerId)).limit(1)
      await db.insert(notifications).values({
        user_id: req.user!.id,
        type: 'organizer_followed',
        title: `Following ${organizer?.name ?? 'organizer'}`,
        message: `You'll be notified when they post new events.`,
      })

      res.json({ following: true })
    }
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
