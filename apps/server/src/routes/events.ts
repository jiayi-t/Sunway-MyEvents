import { Router } from 'express'
import { eq, asc, and, isNull, getTableColumns } from 'drizzle-orm'
import { db } from '../db'
import { events, users, registrations } from '../database/schema'
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
      .select()
      .from(events)
      .where(and(eq(events.organizer_id, req.user!.id), isNull(events.deleted_at)))
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
        organizer_image_url: users.image_url
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

// POST /api/events/:id/register - register for event (protected)
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

export default router