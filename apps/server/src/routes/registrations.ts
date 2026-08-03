import { Router } from 'express'
import { eq, asc, and } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { db } from '../db'
import { registrations, events, users } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'
import { resolveEventPk } from '../utils/resolve-public-id'
import { captureError } from '../instrument'

const router = Router()

// GET /api/registrations/my - get current user's registrations
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: registrations.id,
        event_id: events.public_id,
        registered_at: registrations.registered_at,
        checked_in_at: registrations.checked_in_at,
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
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/registrations/event/:eventId - event participant list (organizer only)
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const eventId = await resolveEventPk(req.params.eventId)
  if (eventId === null) return res.status(404).json({ error: 'Event not found' })
  try {
    const [event] = await db.select({ organizer_id: events.organizer_id })
      .from(events).where(eq(events.id, eventId)).limit(1)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    const result = await db
      .select({
        id: registrations.id,
        registered_at: registrations.registered_at,
        checked_in_at: registrations.checked_in_at,
        user_id: users.id,
        user_name: users.name,
        sunway_id: users.sunway_id,
        email: users.email,
        role: users.role,
        image_url: users.image_url
      })
      .from(registrations)
      .innerJoin(users, eq(registrations.user_id, users.id))
      .where(eq(registrations.event_id, eventId))
      .orderBy(asc(registrations.registered_at))

    res.json(result)
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/registrations/checkin - scan student QR attendance (organizer only)
router.post('/checkin', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const { token } = req.body as { token: string }
  if (!token) return res.status(400).json({ error: 'Token required' })

  let payload: { userId: number; eventId: number; type: string }
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload
  } catch {
    // deliberately not reported, an expired or tampered QR is a user error and not a bug
    return res.status(400).json({ error: 'Invalid or expired QR code' })
  }

  if (payload.type !== 'checkin') return res.status(400).json({ error: 'Invalid QR code' })

  try {
    const [event] = await db.select({ organizer_id: events.organizer_id, name: events.name })
      .from(events).where(eq(events.id, payload.eventId)).limit(1)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'QR code is for a different event' })

    const [registration] = await db.select()
      .from(registrations)
      .where(and(eq(registrations.user_id, payload.userId), eq(registrations.event_id, payload.eventId)))
      .limit(1)
    if (!registration) return res.status(404).json({ error: 'Registration not found' })

    if (registration.checked_in_at) {
      const [student] = await db.select({ name: users.name, sunway_id: users.sunway_id, email: users.email, role: users.role })
        .from(users).where(eq(users.id, payload.userId)).limit(1)
      return res.status(409).json({ error: 'Already checked in', student_name: student?.name, sunway_id: student?.sunway_id, email: student?.email, role: student?.role })
    }

    await db.update(registrations)
      .set({ checked_in_at: new Date() })
      .where(eq(registrations.id, registration.id))

    const [student] = await db.select({ name: users.name, sunway_id: users.sunway_id, email: users.email, role: users.role })
      .from(users).where(eq(users.id, payload.userId)).limit(1)

    res.json({ success: true, student_name: student?.name, sunway_id: student?.sunway_id, email: student?.email, role: student?.role })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/registrations/checkin/manual - manual check-in fallback if QR scan fails (organizer only)
router.post('/checkin/manual', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const { registrationId } = req.body as { registrationId: number }
  if (!registrationId) return res.status(400).json({ error: 'Registration ID required' })

  try {
    const [registration] = await db
      .select({
        id: registrations.id,
        user_id: registrations.user_id,
        checked_in_at: registrations.checked_in_at,
        organizer_id: events.organizer_id
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.event_id, events.id))
      .where(eq(registrations.id, registrationId))
      .limit(1)
    if (!registration || !registration.user_id) return res.status(404).json({ error: 'Registration not found' })
    if (registration.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })
    if (registration.checked_in_at) return res.status(409).json({ error: 'Already checked in' })

    await db.update(registrations)
      .set({ checked_in_at: new Date() })
      .where(eq(registrations.id, registration.id))

    const [attendee] = await db.select({ name: users.name, sunway_id: users.sunway_id, email: users.email, role: users.role })
      .from(users).where(eq(users.id, registration.user_id)).limit(1)

    res.json({ success: true, student_name: attendee?.name, sunway_id: attendee?.sunway_id, email: attendee?.email, role: attendee?.role })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router