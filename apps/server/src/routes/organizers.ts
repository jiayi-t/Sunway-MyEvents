import { Router } from 'express'
import { eq, and, or, isNull, asc, desc, gte, lt, ne, inArray, exists, sql } from 'drizzle-orm'
import { db } from '../db'
import { users, events, registrations, followed_organizers, notifications } from '../database/schema'
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth'
import { SEEDED_ORGANIZER_USERNAMES, SEEDED_ACCOUNT_PASSWORD } from '../database/seeded-accounts'
import { resolveUserPk } from '../utils/resolve-public-id'
import { eventClientColumns } from '../utils/event-columns'
import { captureError } from '../instrument'

const router = Router()

// GET /api/organizers - demo organizer accounts (username + name + category) shown on the login page so testers can sign into an existing SLB/club instead of registering a duplicate
// deliberately excludes accounts registered through the app, only their owner knows the password
router.get('/', async (req, res) => {
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
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/following - organizers the caller follows
// declared before /:id so the literal path is not captured as an id
router.get('/following', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        id: users.public_id,
        name: users.name,
        image_url: users.image_url,
      })
      .from(followed_organizers)
      .innerJoin(users, eq(followed_organizers.organizer_id, users.id))
      .where(eq(followed_organizers.student_id, req.user!.id))
      .orderBy(asc(users.name))

    res.json(rows)
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/directory - every SLB/C&S, for the browse page's organizer results
// declared before /:id so the literal path is not captured as an id
router.get('/directory', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        id: users.public_id,
        name: users.name,
        image_url: users.image_url,
        category: users.category,
        // joined on the caller only, so the row exists just for organizers they already follow
        following: sql<boolean>`${followed_organizers.id} is not null`,
      })
      .from(users)
      .leftJoin(followed_organizers, and(
        eq(followed_organizers.organizer_id, users.id),
        eq(followed_organizers.student_id, req.user!.id),
      ))
      .where(eq(users.role, 'organizer'))
      .orderBy(asc(users.name))

    res.json(rows)
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/:id - organizer profile for student view
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res) => {
  const id = await resolveUserPk(req.params.id)

  // only students/public can browse organizer profiles, organizers may only load their own dashboard
  if (!req.user) {
    return res.status(403).json({ error: 'Log in as a student or general public to view organizer profiles', code: 'auth_required' })
  }
  if (id === null) return res.status(404).json({ error: 'Organizer not found' })
  if (req.user.role === 'organizer' && req.user.id !== id) {
    return res.status(403).json({ error: 'Organizer accounts cannot view other organizer profiles', code: 'organizer_forbidden' })
  }

  const now = new Date()
  try {
    const [organizer] = await db
      .select({
        id: users.public_id,
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
    // students/public will not see archived events
    const visibleToViewer = [
      eq(events.organizer_id, id),
      isNull(events.archived_at),
      ...(hideStudentsOnly ? [ne(events.audience, 'students_only')] : []),
    ]

    // upcoming shows cancelled events
    const upcomingEvents = await db
      .select(eventClientColumns)
      .from(events)
      .where(and(...visibleToViewer, gte(events.end_time, now)))
      .orderBy(asc(events.date))
      .limit(10)

    // past drops cancelled events, except for the ones the viewer registered for
    const pastEvents = await db
      .select(eventClientColumns)
      .from(events)
      .where(and(
        ...visibleToViewer,
        lt(events.end_time, now),
        or(
          isNull(events.cancelled_at),
          exists(
            db
              .select()
              .from(registrations)
              .where(and(eq(registrations.event_id, events.id), eq(registrations.user_id, req.user!.id)))
          )
        ),
      ))
      .orderBy(desc(events.date))
      .limit(10)

    const totalCount = await db.$count(events, eq(events.organizer_id, id))

    res.json({
      ...organizer,
      event_stats: { upcoming: upcomingEvents.length, total: totalCount },
      events: upcomingEvents,
      past_events: pastEvents,
    })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/organizers/:id/follow-status
router.get('/:id/follow-status', authenticate, async (req: AuthRequest, res) => {
  const organizerId = await resolveUserPk(req.params.id)
  if (organizerId === null) return res.status(404).json({ error: 'Organizer not found' })
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
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/organizers/:id/follow-toggle
router.post('/:id/follow-toggle', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role === 'organizer') {
    return res.status(403).json({ error: 'Organizer accounts cannot follow other organizers' })
  }
  const organizerId = await resolveUserPk(req.params.id)
  if (organizerId === null) return res.status(404).json({ error: 'Organizer not found' })
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
        related_organizer_id: organizerId,
      })

      res.json({ following: true })
    }
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
