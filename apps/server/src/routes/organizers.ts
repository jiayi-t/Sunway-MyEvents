import { Router } from 'express'
import { eq, and, isNull, asc, gte, ne, inArray } from 'drizzle-orm'
import { db } from '../db'
import { users, events, followed_organizers, notifications } from '../database/schema'
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth'
import { SEEDED_ORGANIZER_USERNAMES, SEEDED_ACCOUNT_PASSWORD } from '../database/seeded-accounts'

const router = Router()

// GET /api/organizers - demo organizer accounts (username + name + category) shown on the login page so testers can sign into an existing SLB/club instead of registering a duplicate
// Deliberately excludes accounts registered through the app, only their owner knows the password
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        sunway_id: users.sunway_id,
        name: users.name,
        category: users.category,
      })
      .from(users)
      .where(and(eq(users.role, 'organizer'), inArray(users.sunway_id, SEEDED_ORGANIZER_USERNAMES)))
      .orderBy(asc(users.name))

    // password is the shared seed default (already shown on the login page
    res.json({ accounts: rows, password: SEEDED_ACCOUNT_PASSWORD })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/:id - organizer profile for student view
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string)
  const now = new Date()

  // only students/public can browse organizer profiles, organizers may only load their own dashboard
  if (!req.user) {
    return res.status(403).json({ error: 'Log in as a student or general public to view organizer profiles', code: 'auth_required' })
  }
  if (req.user.role === 'organizer' && req.user.id !== id) {
    return res.status(403).json({ error: 'Organizer accounts cannot view other organizer profiles', code: 'organizer_forbidden' })
  }

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

    // general public cannot see students-only events
    const hideStudentsOnly = req.user!.role === 'public'
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(
        eq(events.organizer_id, id),
        isNull(events.cancelled_at),
        isNull(events.archived_at),
        gte(events.date, now),
        ...(hideStudentsOnly ? [ne(events.audience, 'students_only')] : []),
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
  if (req.user?.role === 'organizer') {
    return res.status(403).json({ error: 'Organizer accounts cannot follow other organizers' })
  }
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
