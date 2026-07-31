import { Router } from 'express'
import { eq, sql, desc, count, countDistinct, and, gt } from 'drizzle-orm'
import { db } from '../db'
import { events, registrations, feedback, feedback_forms, feedback_ai_summaries, users, event_views, followed_organizers } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'
import { resolveEventPk } from '../utils/resolve-public-id'
import { DEFAULT_QUESTIONS, type FeedbackQuestion } from '../constants/feedback-defaults'
import { aiAvailable, summarizeFeedback, type AiSummary, type OpenEndedGroup } from '../ai'

const router = Router()

// an open-ended question needs this many responses before it gets an AI response summary
const MIN_RESPONSES_PER_QUESTION = 3

// recent activities are only shown for the last 14 days
const ACTIVITY_WINDOW_DAYS = 14

// GET /api/analytics/attendance
router.get('/attendance', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })

  try {
    const rows = await db
      .select({
        id: events.public_id,
        name: events.name,
        date: events.date,
        image_url: events.image_url,
        // sql<number> tells TS to treat the string as a number, since pg returns aggregates as strings
        registrations: sql<number>`COUNT(${registrations.id})`, 
        attendees: sql<number>`COUNT(${registrations.checked_in_at})`,
      })
      .from(events)
      .leftJoin(registrations, eq(registrations.event_id, events.id))
      .where(eq(events.organizer_id, req.user!.id))
      .groupBy(events.id, events.name, events.date, events.image_url)
      .orderBy(desc(events.date))

    // calculate aggregate totals across all events
    const total_registrations = rows.reduce((s, r) => s + Number(r.registrations), 0)
    const total_attendees = rows.reduce((s, r) => s + Number(r.attendees), 0)
    const attendance_rate = total_registrations > 0
      ? Math.round((total_attendees / total_registrations) * 1000) / 10
      : 0

    res.json({
      totals: { total_registrations, total_attendees, attendance_rate },
      // convert each raw db row into the final shape sent to the client, converting string counts to numbers
      events: rows.map(r => ({
        id: r.id,
        name: r.name,
        date: r.date,
        image_url: r.image_url,
        // convert from string to number (pg sends aggregates as strings)
        registrations: Number(r.registrations), 
        attendees: Number(r.attendees),
        attendance_rate: Number(r.registrations) > 0
          ? Math.round((Number(r.attendees) / Number(r.registrations)) * 1000) / 10
          : 0,
      })),
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/feedback
router.get('/feedback', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })

  try {
    const rows = await db
      .select({
        id: events.public_id,
        name: events.name,
        date: events.date,
        image_url: events.image_url,
        registrations: sql<number>`COUNT(DISTINCT ${registrations.id})`,
        feedback_count: sql<number>`COUNT(DISTINCT ${feedback.id})`,
        avg_rating: sql<number>`COALESCE(AVG(${feedback.rating}), 0)`,
      })
      .from(events)
      .leftJoin(registrations, eq(registrations.event_id, events.id))
      .leftJoin(feedback, eq(feedback.event_id, events.id))
      .where(eq(events.organizer_id, req.user!.id))
      .groupBy(events.id, events.name, events.date, events.image_url)
      .orderBy(desc(events.date))

    const ratingRows = await db
      .select({
        rating: feedback.rating,
        count: sql<number>`COUNT(*)`,
      })
      .from(feedback)
      .innerJoin(events, eq(feedback.event_id, events.id))
      .where(eq(events.organizer_id, req.user!.id))
      .groupBy(feedback.rating)

    const rating_distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const r of ratingRows) rating_distribution[String(r.rating)] = Number(r.count)

    // calculate aggregate totals across all events
    const total_feedback = rows.reduce((s, r) => s + Number(r.feedback_count), 0)
    const total_registrations = rows.reduce((s, r) => s + Number(r.registrations), 0)
    const totalRatingSum = ratingRows.reduce((s, r) => s + r.rating * Number(r.count), 0)
    const avg_rating = total_feedback > 0 ? Math.round((totalRatingSum / total_feedback) * 10) / 10 : 0
    // percentage with 1 decimal place
    const feedback_rate = total_registrations > 0
      ? Math.round((total_feedback / total_registrations) * 1000) / 10
      : 0

    res.json({
      totals: { total_feedback, total_registrations, avg_rating, feedback_rate },
      rating_distribution,
      events: rows.map(r => ({
        id: r.id,
        name: r.name,
        date: r.date,
        image_url: r.image_url,
        registrations: Number(r.registrations),
        feedback_count: Number(r.feedback_count),
        avg_rating: Math.round(Number(r.avg_rating) * 10) / 10,
        feedback_rate: Number(r.registrations) > 0
          ? Math.round((Number(r.feedback_count) / Number(r.registrations)) * 1000) / 10
          : 0,
      })),
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/events/:id - per-event analytics
router.get('/events/:id', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const eventId = await resolveEventPk(req.params.id)
  if (eventId === null) return res.status(404).json({ error: 'Event not found' })

  try {
    const [eventRow] = await db
      .select({
        id: events.public_id,
        name: events.name,
        date: events.date,
        image_url: events.image_url,
        organizer_id: events.organizer_id,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!eventRow) return res.status(404).json({ error: 'Event not found' })
    if (eventRow.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    // attendance stats
    const [attRow] = await db
      .select({
        registrations: sql<number>`COUNT(${registrations.id})`,
        attendees: sql<number>`COUNT(${registrations.checked_in_at})`,
      })
      .from(registrations)
      .where(eq(registrations.event_id, eventId))

    const regCount = Number(attRow?.registrations ?? 0)
    const attendeeCount = Number(attRow?.attendees ?? 0)

    // view stats
    const [viewRow] = await db
      .select({
        total_views: count(event_views.id),
        unique_viewers: countDistinct(event_views.user_id),
      })
      .from(event_views)
      .where(eq(event_views.event_id, eventId))

    // feedback rows
    const feedbackRows = await db
      .select({ rating: feedback.rating, answers: feedback.answers })
      .from(feedback)
      .where(eq(feedback.event_id, eventId))

    const feedbackCount = feedbackRows.length
    const avgRating = feedbackCount > 0
      ? Math.round((feedbackRows.reduce((s, f) => s + f.rating, 0) / feedbackCount) * 10) / 10
      : 0

    const ratingDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const f of feedbackRows) ratingDist[String(f.rating)] = (ratingDist[String(f.rating)] ?? 0) + 1

    // feedback form questions
    const [formRow] = await db
      .select({ questions: feedback_forms.questions })
      .from(feedback_forms)
      .where(eq(feedback_forms.event_id, eventId))
      .limit(1)

    const questions: FeedbackQuestion[] = formRow
      ? (formRow.questions as FeedbackQuestion[])
      : DEFAULT_QUESTIONS

    type QuestionAnalysis = {
      question: string
      type: string
      options?: string[]
      responses: Record<string, number> | string[]
    }

    const questionAnalyses: QuestionAnalysis[] = []

    if (feedbackCount > 0) {
      for (const q of questions) {
        if (q.type === 'rating') continue

        if (q.type === 'open_ended') {
          const responses: string[] = []
          for (const fb of feedbackRows) {
            const ans = fb.answers as Record<string, unknown> | null
            const val = ans?.[q.id]
            if (val != null && String(val).trim()) responses.push(String(val).trim())
          }
          questionAnalyses.push({ question: q.question, type: q.type, responses })
        } else {
          const responses: Record<string, number> = {}
          for (const fb of feedbackRows) {
            const ans = fb.answers as Record<string, unknown> | null
            const val = ans?.[q.id]
            if (val == null) continue
            const vals = Array.isArray(val) ? val : [val]
            for (const v of vals) {
              const key = String(v)
              responses[key] = (responses[key] ?? 0) + 1
            }
          }
          questionAnalyses.push({ question: q.question, type: q.type, options: q.options, responses })
        }
      }
    }

    const [genderRows, facultyRows, programmeRows, yearRows] = await Promise.all([
      db.select({ gender: users.gender, count: sql<number>`COUNT(*)` })
        .from(registrations).innerJoin(users, eq(registrations.user_id, users.id))
        .where(eq(registrations.event_id, eventId)).groupBy(users.gender),
      db.select({ faculty: users.faculty, count: sql<number>`COUNT(*)` })
        .from(registrations).innerJoin(users, eq(registrations.user_id, users.id))
        .where(eq(registrations.event_id, eventId)).groupBy(users.faculty),
      db.select({ programme: users.program, count: sql<number>`COUNT(*)` })
        .from(registrations).innerJoin(users, eq(registrations.user_id, users.id))
        .where(eq(registrations.event_id, eventId)).groupBy(users.program),
      db.select({ year: users.year_of_study, count: sql<number>`COUNT(*)` })
        .from(registrations).innerJoin(users, eq(registrations.user_id, users.id))
        .where(eq(registrations.event_id, eventId)).groupBy(users.year_of_study),
    ])

    res.json({
      event: { id: eventRow.id, name: eventRow.name, date: eventRow.date, image_url: eventRow.image_url },
      attendance: {
        registrations: regCount,
        attendees: attendeeCount,
        attendance_rate: regCount > 0 ? Math.round((attendeeCount / regCount) * 1000) / 10 : 0,
      },
      views: {
        total_views: Number(viewRow?.total_views ?? 0),
        unique_viewers: Number(viewRow?.unique_viewers ?? 0),
      },
      demographics: {
        gender_distribution: genderRows.map(r => ({ gender: r.gender, count: Number(r.count) })),
        faculty_distribution: facultyRows.map(r => ({ faculty: r.faculty, count: Number(r.count) })),
        programme_distribution: programmeRows.map(r => ({ programme: r.programme, count: Number(r.count) })),
        year_distribution: yearRows.map(r => ({ year: r.year, count: Number(r.count) })),
      },
      feedback: {
        count: feedbackCount,
        avg_rating: avgRating,
        feedback_rate: regCount > 0 ? Math.round((feedbackCount / regCount) * 1000) / 10 : 0,
        rating_distribution: ratingDist,
        questions: questionAnalyses,
      },
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/events/:id/ai-summary - AI summary of open-ended feedback, cached per event
router.get('/events/:id/ai-summary', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const eventId = await resolveEventPk(req.params.id)
  if (eventId === null) return res.status(404).json({ error: 'Event not found' })

  try {
    const [eventRow] = await db
      .select({ id: events.id, name: events.name, organizer_id: events.organizer_id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!eventRow) return res.status(404).json({ error: 'Event not found' })
    if (eventRow.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    if (!aiAvailable()) return res.json({ available: false, reason: 'not_configured' })

    const feedbackRows = await db
      .select({ answers: feedback.answers })
      .from(feedback)
      .where(eq(feedback.event_id, eventId))

    const currentCount = feedbackRows.length

    const [formRow] = await db
      .select({ questions: feedback_forms.questions })
      .from(feedback_forms)
      .where(eq(feedback_forms.event_id, eventId))
      .limit(1)

    const questions: FeedbackQuestion[] = formRow
      ? (formRow.questions as FeedbackQuestion[])
      : DEFAULT_QUESTIONS

    // collect open-ended answers grouped per question, only questions with enough responses get summarized
    const groups: OpenEndedGroup[] = []
    for (const q of questions) {
      if (q.type !== 'open_ended') continue
      const responses: string[] = []
      for (const fb of feedbackRows) {
        const ans = fb.answers as Record<string, unknown> | null
        const val = ans?.[q.id]
        if (val != null && String(val).trim()) responses.push(String(val).trim())
      }
      if (responses.length >= MIN_RESPONSES_PER_QUESTION) groups.push({ question: q.question, responses })
    }

    if (groups.length === 0) return res.json({ available: false, reason: 'not_enough_responses' })

    const [cached] = await db
      .select()
      .from(feedback_ai_summaries)
      .where(eq(feedback_ai_summaries.event_id, eventId))
      .limit(1)

    if (cached && cached.feedback_count === currentCount) {
      return res.json({
        available: true,
        summary: cached.summary as AiSummary,
        feedback_count: cached.feedback_count,
        generated_at: cached.generated_at,
      })
    }

    let summary: AiSummary
    try {
      summary = await summarizeFeedback(eventRow.name, groups)
    } catch {
      // Gemini down / rate limited / timed out: serve the stale cache if there is one
      if (cached) {
        return res.json({
          available: true,
          summary: cached.summary as AiSummary,
          feedback_count: cached.feedback_count,
          generated_at: cached.generated_at,
        })
      }
      return res.json({ available: false, reason: 'generation_failed' })
    }

    // cache the response summary, simultaneous generation requests just overwrite each other
    const generated_at = new Date()
    await db
      .insert(feedback_ai_summaries)
      .values({ event_id: eventId, summary, feedback_count: currentCount, generated_at })
      .onConflictDoUpdate({
        target: feedback_ai_summaries.event_id,
        set: { summary, feedback_count: currentCount, generated_at },
      })

    res.json({ available: true, summary, feedback_count: currentCount, generated_at })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/views
router.get('/views', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })

  try {
    const rows = await db
      .select({
        id: events.public_id,
        name: events.name,
        date: events.date,
        image_url: events.image_url,
        total_views: count(event_views.id),
        unique_viewers: countDistinct(event_views.user_id),
      })
      .from(events)
      .leftJoin(event_views, eq(event_views.event_id, events.id))
      .where(eq(events.organizer_id, req.user!.id))
      .groupBy(events.id, events.name, events.date, events.image_url)
      .orderBy(desc(events.date))

    const total_views = rows.reduce((s, r) => s + Number(r.total_views), 0)
    const unique_viewers = rows.reduce((s, r) => s + Number(r.unique_viewers), 0)
    const eventCount = rows.filter(r => Number(r.total_views) > 0).length
    const avg_views_per_event = eventCount > 0 ? Math.round((total_views / eventCount) * 10) / 10 : 0

    res.json({
      totals: { total_views, unique_viewers, avg_views_per_event },
      events: rows.map(r => ({
        id: r.id,
        name: r.name,
        date: r.date,
        image_url: r.image_url,
        total_views: Number(r.total_views),
        unique_viewers: Number(r.unique_viewers),
      })),
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/analytics/activity - recent activity on the organizer's own events, grouped per event
// no read state is stored, this is a rolling log rather than an inbox
router.get('/activity', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })

  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  try {
    const [registrationRows, feedbackRows, followerRows] = await Promise.all([
      db
        .select({
          event_id: events.public_id,
          event_name: events.name,
          count: sql<number>`COUNT(${registrations.id})`,
          last_at: sql<string>`MAX(${registrations.registered_at})`,
        })
        .from(registrations)
        .innerJoin(events, eq(registrations.event_id, events.id))
        .where(and(eq(events.organizer_id, req.user!.id), gt(registrations.registered_at, since)))
        .groupBy(events.public_id, events.name),

      db
        .select({
          event_id: events.public_id,
          event_name: events.name,
          count: sql<number>`COUNT(${feedback.id})`,
          last_at: sql<string>`MAX(${feedback.created_at})`,
        })
        .from(feedback)
        .innerJoin(events, eq(feedback.event_id, events.id))
        .where(and(eq(events.organizer_id, req.user!.id), gt(feedback.created_at, since)))
        .groupBy(events.public_id, events.name),

      db
        .select({
          count: sql<number>`COUNT(${followed_organizers.id})`,
          last_at: sql<string>`MAX(${followed_organizers.created_at})`,
        })
        .from(followed_organizers)
        .where(and(eq(followed_organizers.organizer_id, req.user!.id), gt(followed_organizers.created_at, since))),
    ])

    const items = [
      ...registrationRows.map(r => ({
        type: 'registration' as const,
        event_id: r.event_id,
        event_name: r.event_name,
        count: Number(r.count),
        last_at: r.last_at,
      })),
      ...feedbackRows.map(r => ({
        type: 'feedback' as const,
        event_id: r.event_id,
        event_name: r.event_name,
        count: Number(r.count),
        last_at: r.last_at,
      })),
      // followers are not tied to an event, so they carry no event reference
      ...followerRows
        .filter(r => Number(r.count) > 0)
        .map(r => ({
          type: 'follower' as const,
          event_id: null,
          event_name: null,
          count: Number(r.count),
          last_at: r.last_at,
        })),
    ]

    items.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
