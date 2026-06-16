import { Router } from 'express'
import { eq, asc, and, isNull, getTableColumns } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { db } from '../db'
import { events, users, registrations, saved_events } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/events - get all events
router.get('/', async (_req, res) => {
  try {
    const result = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(isNull(events.archived_at))
      .orderBy(asc(events.date))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/organizer-events
router.get('/organizer-events', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    const result = await db
      .select({
        ...getTableColumns(events),
        registered_count: db.$count(registrations, eq(registrations.event_id, events.id))
      })
      .from(events)
      .where(eq(events.organizer_id, req.user!.id))
      .orderBy(asc(events.date))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/saved-events
router.get('/saved-events', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: saved_events.id,
        event_id: events.id,
        saved_at: saved_events.saved_at,
        event_name: events.name,
        event_date: events.date,
        event_start_time: events.start_time,
        event_end_time: events.end_time,
        event_venue: events.venue,
        event_category: events.category,
        event_image_url: events.image_url,
        event_cancelled_at: events.cancelled_at,
        organizer_name: users.name,
      })
      .from(saved_events)
      .innerJoin(events, eq(saved_events.event_id, events.id))
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(eq(saved_events.user_id, req.user!.id))
      .orderBy(asc(events.date))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id - get single event
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string)
  try {
    const result = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url,
        registered_count: db.$count(registrations, eq(registrations.event_id, events.id))
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(eq(events.id, id))

    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(result[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id/registration-status
router.get('/:id/registration-status', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  try {
    const result = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(
        eq(registrations.user_id, req.user!.id),
        eq(registrations.event_id, eventId)
      ))

    res.json({ registered: result.length > 0 })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/events/:id/register - register for event 
router.post('/:id/register', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  try {
    const existing = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(
        eq(registrations.user_id, req.user!.id),
        eq(registrations.event_id, eventId)
      ))

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event' })
    }

    await db.insert(registrations).values({
      user_id: req.user!.id,
      event_id: eventId
    })

    res.status(201).json({ message: 'Successfully registered for event' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id/checkin-token - generate signed QR token for student check-in
router.get('/:id/checkin-token', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  const userId = req.user!.id
  try {
    const [row] = await db
      .select({ end_time: events.end_time })
      .from(registrations)
      .innerJoin(events, eq(registrations.event_id, events.id))
      .where(and(eq(registrations.user_id, userId), eq(registrations.event_id, eventId)))
      .limit(1)

    if (!row) return res.status(403).json({ error: 'Not registered for this event' })

    const expiresIn = Math.max(Math.floor((new Date(row.end_time!).getTime() - Date.now()) / 1000), 60)

    const token = jwt.sign(
      { userId, eventId, type: 'checkin' },
      process.env.JWT_SECRET!,
      { expiresIn }
    )
    res.json({ token })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id/save-status
router.get('/:id/save-status', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  try {
    const result = await db
      .select({ id: saved_events.id })
      .from(saved_events)
      .where(and(eq(saved_events.user_id, req.user!.id), eq(saved_events.event_id, eventId)))
    res.json({ saved: result.length > 0 })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/events/:id/save-toggle
router.post('/:id/save-toggle', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  try {
    const existing = await db
      .select({ id: saved_events.id })
      .from(saved_events)
      .where(and(eq(saved_events.user_id, req.user!.id), eq(saved_events.event_id, eventId)))

    if (existing.length > 0) {
      await db.delete(saved_events).where(eq(saved_events.id, existing[0].id))
      res.json({ saved: false })
    } else {
      await db.insert(saved_events).values({ user_id: req.user!.id, event_id: eventId })
      res.json({ saved: true })
    }
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/events - create event (organizer only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Only organizers can create events' })
  }

  const {
    name, description, date, start_time, end_time, venue, pricing,
    category, capacity, registration_deadline, image_url
  } = req.body

  try {
    const result = await db.insert(events).values({
      name,
      description,
      date: new Date(date),
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      venue,
      pricing: pricing ?? 0,
      category,
      capacity,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      image_url,
      organizer_id: req.user!.id
    }).returning()

    res.status(201).json(result[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/events/:id - edit own event (organizer only)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const id = parseInt(req.params.id as string)
  try {
    const existing = await db.select().from(events).where(eq(events.id, id))
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' })
    if (existing[0].organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    const {
      name, description, date, start_time, end_time, venue, pricing,
      category, capacity, registration_deadline, image_url
    } = req.body

    const result = await db.update(events).set({
      name,
      description,
      date: new Date(date),
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      venue,
      pricing: pricing ?? 0,
      category,
      capacity,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      image_url: image_url || null
    }).where(eq(events.id, id)).returning()

    res.json(result[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/events/:id/cancel - cancel own upcoming event (organizer only)
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const id = parseInt(req.params.id as string)
  try {
    const existing = await db.select().from(events).where(eq(events.id, id))
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' })
    if (existing[0].organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    await db.update(events).set({ cancelled_at: new Date() }).where(eq(events.id, id))
    res.json({ message: 'Event cancelled' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/events/:id/archive - archive own event (organizer only)
router.patch('/:id/archive', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const id = parseInt(req.params.id as string)
  try {
    const existing = await db.select().from(events).where(eq(events.id, id))
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' })
    if (existing[0].organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    await db.update(events).set({ archived_at: new Date() }).where(eq(events.id, id))
    res.json({ message: 'Event archived' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/events/:id/unarchive - unarchive own event (organizer only)
router.patch('/:id/unarchive', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const id = parseInt(req.params.id as string)
  try {
    const existing = await db.select().from(events).where(eq(events.id, id))
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' })
    if (existing[0].organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    await db.update(events).set({ archived_at: null }).where(eq(events.id, id))
    res.json({ message: 'Event unarchived' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router