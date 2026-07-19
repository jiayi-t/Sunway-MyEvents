import { Router } from 'express'
import { eq, asc, desc, and, isNull, gt, ne, getTableColumns } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { db } from '../db'
import { events, users, registrations, saved_events, feedback, notifications, followed_organizers, event_views } from '../database/schema'
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth'
import { sendEmail, getEmailAddresses, eventCancelledEmail, eventUpdatedEmail, newEventEmail } from '../email'

const router = Router()

const AUDIENCES = ['everyone', 'students_only']

// GET /api/events - get all events
router.get('/', optionalAuthenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(
        // hide students-only events from the public and from unauthenticated callers
        !req.user || req.user.role === 'public'
          ? and(isNull(events.archived_at), ne(events.audience, 'students_only'))
          : isNull(events.archived_at)
      )
      .orderBy(desc(events.created_at))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/featured
router.get('/featured', optionalAuthenticate, async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const rows = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url,
        registration_count: db.$count(registrations, eq(registrations.event_id, events.id)),
        save_count: db.$count(saved_events, eq(saved_events.event_id, events.id)),
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(
        // hide students-only events from the public and unauthenticated callers
        !req.user || req.user.role === 'public'
          ? and(isNull(events.archived_at), isNull(events.cancelled_at), gt(events.date, now), ne(events.audience, 'students_only'))
          : and(isNull(events.archived_at), isNull(events.cancelled_at), gt(events.date, now))
      )

    const scored = rows
      .map(e => {
        // registrations x2 + saves
        const popularity = Number(e.registration_count) * 2 + Number(e.save_count)
        const daysUntilEvent = (new Date(e.date).getTime() - now.getTime()) / 86_400_000
        // recency score: 1 for events happening today, 0.5 for events happening in 14 days, 0 for events happening after 14 days
        const recency = 1 / (1 + daysUntilEvent / 14)
        // final score: 70% popularity, 30% recency
        return { ...e, _score: popularity * 0.7 + recency * 0.3 }
      })
      // sort events by score in descending order, take top 5
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      // remove _score, registration_count, save_count from the result
      .map(({ _score, registration_count, save_count, ...e }) => e)

    res.json(scored)
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

// GET /api/events/followed-orgs - events from followed organizers 
router.get('/followed-orgs', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        ...getTableColumns(events),
        organizer_name: users.name,
        organizer_image_url: users.image_url,
      })
      .from(events)
      .innerJoin(followed_organizers, eq(followed_organizers.organizer_id, events.organizer_id))
      .leftJoin(users, eq(events.organizer_id, users.id))
      .where(
        // hide students-only events from the public, same rule as GET /events
        req.user!.role === 'public'
          ? and(
              eq(followed_organizers.student_id, req.user!.id),
              isNull(events.archived_at),
              ne(events.audience, 'students_only'),
            )
          : and(eq(followed_organizers.student_id, req.user!.id), isNull(events.archived_at))
      )
      .orderBy(desc(events.created_at))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/events/:id/view - record student's event views
router.post('/:id/view', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'student' && req.user?.role !== 'public') return res.status(403).json({ error: 'Forbidden' })
  const eventId = parseInt(req.params.id as string)
  try {
    await db.insert(event_views).values({ user_id: req.user!.id, event_id: eventId })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id - get single event
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res) => {
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
    // public and unauthenticated callers cannot view a students-only event by id 
    if ((!req.user || req.user.role === 'public') && result[0].audience === 'students_only') {
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
    const [event] = await db
      .select({ cancelled_at: events.cancelled_at, end_time: events.end_time, registration_deadline: events.registration_deadline, capacity: events.capacity, audience: events.audience })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) return res.status(404).json({ error: 'Event not found' })
    if (event.audience === 'students_only' && req.user!.role !== 'student') {
      return res.status(403).json({ error: 'This event is open to students only' })
    }
    if (event.cancelled_at) return res.status(400).json({ error: 'This event has been cancelled' })
    if (new Date(event.end_time) < new Date()) return res.status(400).json({ error: 'This event has already ended' })
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ error: 'Registration deadline has passed' })
    }
    if (event.capacity) {
      const [{ count }] = await db
        .select({ count: db.$count(registrations, eq(registrations.event_id, eventId)) })
        .from(events)
        .where(eq(events.id, eventId))
      if (count >= event.capacity) return res.status(400).json({ error: 'This event is sold out' })
    }

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
    category, audience, capacity, registration_deadline, image_url
  } = req.body

  if (!name || !date || !start_time || !end_time || !venue || pricing == null || !category || !image_url) {
    return res.status(400).json({ error: 'Please fill in all required fields' })
  }
  if (audience !== undefined && !AUDIENCES.includes(audience)) {
    return res.status(400).json({ error: 'Invalid audience' })
  }

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
      audience: audience ?? 'everyone',
      capacity,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      image_url,
      organizer_id: req.user!.id
    }).returning()

    const newEvent = result[0]

    const followers = await db
      .select({
        student_id: followed_organizers.student_id,
        email: users.email,
        personal_email: users.personal_email,
        notification_preferences: users.notification_preferences,
      })
      .from(followed_organizers)
      .innerJoin(users, eq(followed_organizers.student_id, users.id))
      .where(eq(followed_organizers.organizer_id, req.user!.id))

    if (followers.length > 0) {
      const [organizer] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user!.id)).limit(1)
      const organizerName = organizer?.name ?? 'An organizer'
      await db.insert(notifications).values(
        followers.map(f => ({
          user_id: f.student_id,
          type: 'new_event' as const,
          title: `New event by ${organizerName}`,
          message: newEvent.name,
        }))
      )

      const emailAddresses = [...new Set(
        followers.flatMap(f => getEmailAddresses({
          email: f.email,
          personal_email: f.personal_email,
          notification_preferences: f.notification_preferences as any,
        }))
      )]
      if (emailAddresses.length > 0) {
        const eventUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/events/${newEvent.id}`
        sendEmail(
          emailAddresses,
          `New event by ${organizerName}: ${newEvent.name}`,
          newEventEmail(newEvent.name, organizerName, eventUrl)
        ).catch(err => console.error('[email]', err))
      }
    }

    res.status(201).json(newEvent)
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
      category, audience, capacity, registration_deadline, image_url, notify_participants
    } = req.body

    if (!name || !date || !start_time || !end_time || !venue || pricing == null || !category || !image_url) {
      return res.status(400).json({ error: 'Please fill in all required fields' })
    }
    if (audience !== undefined && !AUDIENCES.includes(audience)) {
      return res.status(400).json({ error: 'Invalid audience' })
    }

    const result = await db.update(events).set({
      name,
      description,
      date: new Date(date),
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      venue,
      pricing: pricing ?? 0,
      category,
      audience: audience ?? 'everyone',
      capacity,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      image_url: image_url || null
    }).where(eq(events.id, id)).returning()

    if (notify_participants) {
      const eventRegistrations = await db
        .select({
          user_id: registrations.user_id,
          email: users.email,
          personal_email: users.personal_email,
          notification_preferences: users.notification_preferences,
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.user_id, users.id))
        .where(eq(registrations.event_id, id))

      if (eventRegistrations.length > 0) {
        await db.insert(notifications).values(
          eventRegistrations.map(r => ({
            user_id: r.user_id,
            type: 'event_updated' as const,
            title: 'Event Updated',
            message: `"${name}" has been updated. Check the latest details.`,
          }))
        )

        const emailAddresses = [...new Set(
          eventRegistrations.flatMap(r => getEmailAddresses({
            email: r.email,
            personal_email: r.personal_email,
            notification_preferences: r.notification_preferences as any,
          }))
        )]
        if (emailAddresses.length > 0) {
          sendEmail(
            emailAddresses,
            `Event Updated: ${name}`,
            eventUpdatedEmail(name, new Date(date))
          ).catch(err => console.error('[email]', err))
        }
      }
    }

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

    const eventRegistrations = await db
      .select({
        user_id: registrations.user_id,
        email: users.email,
        personal_email: users.personal_email,
        notification_preferences: users.notification_preferences,
      })
      .from(registrations)
      .innerJoin(users, eq(registrations.user_id, users.id))
      .where(eq(registrations.event_id, id))

    const eventSaves = await db
      .select({
        user_id: saved_events.user_id,
        email: users.email,
        personal_email: users.personal_email,
        notification_preferences: users.notification_preferences,
      })
      .from(saved_events)
      .innerJoin(users, eq(saved_events.user_id, users.id))
      .where(eq(saved_events.event_id, id))

    const registeredIds = new Set(eventRegistrations.map(r => r.user_id))
    const usersToNotify = [
      ...eventRegistrations,
      ...eventSaves.filter(s => !registeredIds.has(s.user_id)),
    ]

    if (usersToNotify.length > 0) {
      await db.insert(notifications).values(
        usersToNotify.map(u => ({
          user_id: u.user_id,
          type: 'event_cancelled' as const,
          title: 'Event Cancelled',
          message: registeredIds.has(u.user_id)
            ? `An event you registered for, "${existing[0].name}", has been cancelled.`
            : `An event you saved, "${existing[0].name}", has been cancelled.`,
        }))
      )

      const emailAddresses = [...new Set(
        usersToNotify.flatMap(u => getEmailAddresses({
          email: u.email,
          personal_email: u.personal_email,
          notification_preferences: u.notification_preferences as any,
        }))
      )]
      if (emailAddresses.length > 0) {
        sendEmail(
          emailAddresses,
          `Event Cancelled: ${existing[0].name}`,
          eventCancelledEmail(existing[0].name, new Date(existing[0].date))
        ).catch(err => console.error('[email]', err))
      }
    }

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

// POST /api/events/:id/feedback - student's event feedback submission
router.post('/:id/feedback', authenticate, async (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.id as string)
  const { rating, answers } = req.body

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5' })
  }

  try {
    const [event] = await db.select({ end_time: events.end_time }).from(events).where(eq(events.id, eventId)).limit(1)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    // gate on end_time, not date (midnight), so feedback opens when the event actually ends
    if (new Date(event.end_time) >= new Date()) return res.status(400).json({ error: 'Event has not ended yet' })

    const [reg] = await db
      .select({ id: registrations.id, checked_in_at: registrations.checked_in_at })
      .from(registrations)
      .where(and(eq(registrations.user_id, req.user!.id), eq(registrations.event_id, eventId)))
      .limit(1)
    if (!reg) return res.status(403).json({ error: 'You are not registered for this event' })
    if (!reg.checked_in_at) return res.status(403).json({ error: 'You must check in to the event before submitting feedback' })

    const [existing] = await db
      .select({ id: feedback.id })
      .from(feedback)
      .where(and(eq(feedback.user_id, req.user!.id), eq(feedback.event_id, eventId)))
      .limit(1)
    if (existing) return res.status(400).json({ error: 'You have already submitted feedback for this event' })

    const [result] = await db.insert(feedback).values({
      user_id: req.user!.id,
      event_id: eventId,
      rating,
      answers: answers ?? null
    }).returning()

    res.status(201).json(result)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id/feedback - read feedback for own event (organizer only)
router.get('/:id/feedback', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Only organizers can view feedback' })
  }
  const eventId = parseInt(req.params.id as string)
  try {
    const [event] = await db.select({ organizer_id: events.organizer_id }).from(events).where(eq(events.id, eventId)).limit(1)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    const result = await db
      .select({
        id: feedback.id,
        rating: feedback.rating,
        created_at: feedback.created_at,
        student_name: users.name,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.user_id, users.id))
      .where(eq(feedback.event_id, eventId))

    res.json(result)
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