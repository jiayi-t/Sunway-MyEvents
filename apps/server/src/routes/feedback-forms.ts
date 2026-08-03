import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { feedback_forms, events } from '../database/schema'
import { authenticate, AuthRequest } from '../middleware/auth'
import { resolveEventPk } from '../utils/resolve-public-id'
import { DEFAULT_QUESTIONS, type FeedbackQuestion } from '../constants/feedback-defaults'
import { captureError } from '../instrument'

const router = Router()

// GET /api/events/:id/feedback-form
router.get('/:id/feedback-form', async (req, res) => {
  const eventId = await resolveEventPk(req.params.id)
  if (eventId === null) return res.status(404).json({ error: 'Event not found' })
  try {
    const [row] = await db
      .select({ questions: feedback_forms.questions })
      .from(feedback_forms)
      .where(eq(feedback_forms.event_id, eventId))
      .limit(1)

    res.json({ questions: row ? row.questions : DEFAULT_QUESTIONS })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/events/:id/feedback-form (organizer only)
router.put('/:id/feedback-form', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'Only organizers can edit feedback forms' })
  }
  const eventId = await resolveEventPk(req.params.id)
  if (eventId === null) return res.status(404).json({ error: 'Event not found' })
  const { questions } = req.body

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Questions must be a non-empty array' })
  }
  if (questions[0]?.id !== 'q_rating' || questions[0]?.type !== 'rating') {
    return res.status(400).json({ error: 'The first question must be the rating question' })
  }

  try {
    const [event] = await db
      .select({ organizer_id: events.organizer_id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) return res.status(404).json({ error: 'Event not found' })
    if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

    // insert if no form exists yet, otherwise update
    await db.insert(feedback_forms)
      .values({ event_id: eventId, questions })
      .onConflictDoUpdate({
        target: feedback_forms.event_id,
        set: { questions, updated_at: new Date() }
      })

    res.json({ message: 'Saved', questions })
  } catch (err) {
    captureError(err, req)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
