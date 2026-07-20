import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'
import app from '../app'
import { db } from '../db'
import { users, events, feedback, feedback_forms, feedback_ai_summaries, sessions } from '../database/schema'
import { createSession } from '../utils/sessions'
import { SESSION_COOKIE } from '../utils/cookies'

const TEST_ORG_ID = 'TAISORG1'
const TEST_ORG2_ID = 'TAISORG2'
const TEST_STU_IDS = ['TAISSTU1', 'TAISSTU2', 'TAISSTU3', 'TAISSTU4']

let organizerCookie: string
let organizer2Cookie: string
let studentCookie: string
// 3 responses on one open-ended question
let eventId: number      
// 3 open-ended questions answered by 1 user
let sparseEventId: number 
let studentIds: number[]

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY

const FAKE_SUMMARY = {
  questions: [{ question: 'Any suggestions for improvement?', points: ['More seating', 'Better AC'] }],
}

// mock Gemini response to return a summary without actually calling the Gemini API
function geminiFetchResponse(summary: unknown) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(summary) }] } }],
    }),
  }
}

async function cleanupTestData() {
  const testUsers = await db.select({ id: users.id }).from(users)
    .where(inArray(users.sunway_id, [TEST_ORG_ID, TEST_ORG2_ID, ...TEST_STU_IDS]))
  if (testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id)
    await db.delete(sessions).where(inArray(sessions.user_id, userIds))
    const orgEvents = await db.select({ id: events.id }).from(events)
      .where(inArray(events.organizer_id, userIds))
    if (orgEvents.length > 0) {
      const eventIds = orgEvents.map(e => e.id)
      await db.delete(feedback_ai_summaries).where(inArray(feedback_ai_summaries.event_id, eventIds))
      await db.delete(feedback_forms).where(inArray(feedback_forms.event_id, eventIds))
      await db.delete(feedback).where(inArray(feedback.event_id, eventIds))
      await db.delete(events).where(inArray(events.id, eventIds))
    }
  }
  await db.delete(users).where(inArray(users.sunway_id, [TEST_ORG_ID, TEST_ORG2_ID, ...TEST_STU_IDS]))
}

beforeAll(async () => {
  await cleanupTestData()

  const password = await bcrypt.hash('testing123', 10)
  const cookieFor = async (userId: number) => {
    const { sessionId } = await createSession(userId)
    return `${SESSION_COOKIE}=${sessionId}`
  }

  const [org] = await db.insert(users).values({
    sunway_id: TEST_ORG_ID, email: 'org@aisummary.test.local', password,
    name: 'AI Summary Test Organizer', role: 'organizer', category: 'Sports',
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })
  organizerCookie = await cookieFor(org.id)

  const [org2] = await db.insert(users).values({
    sunway_id: TEST_ORG2_ID, email: 'org2@aisummary.test.local', password,
    name: 'AI Summary Test Organizer 2', role: 'organizer', category: 'Sports',
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })
  organizer2Cookie = await cookieFor(org2.id)

  const students = await db.insert(users).values(TEST_STU_IDS.map((sid, i) => ({
    sunway_id: sid, email: `stu${i}@aisummary.test.local`, password,
    name: `AI Summary Test Student ${i}`, role: 'student',
  }))).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })
  studentIds = students.map(s => s.id)
  studentCookie = await cookieFor(students[0].id)

  const eventValues = {
    date: new Date('2026-07-11'),
    start_time: new Date('2026-07-11T09:00:00'),
    end_time: new Date('2026-07-11T11:00:00'),
    venue: 'Test Hall',
    pricing: '0',
    category: 'Sports',
    organizer_id: org.id,
  }
  const [ev] = await db.insert(events).values({ ...eventValues, name: 'AI Summary Test Event' }).returning()
  eventId = ev.id
  const [sparse] = await db.insert(events).values({ ...eventValues, name: 'AI Summary Sparse Event' }).returning()
  sparseEventId = sparse.id

  // sparse event: custom form with 3 open-ended questions, all answered by a single user, 3 responses in total, but no individual question reaches the per-question minimum
  await db.insert(feedback_forms).values({
    event_id: sparseEventId,
    questions: [
      { id: 'q_rating', type: 'rating', question: 'How would you rate this event overall?', required: true },
      { id: 'q_liked', type: 'open_ended', question: 'What did you like?', required: true },
      { id: 'q_improve', type: 'open_ended', question: 'What could be improved?', required: true },
      { id: 'q_other', type: 'open_ended', question: 'Any other comments?', required: false },
    ],
  })

  // 3 open-ended responses on the main event (default form's q_suggestions), 1 user on the sparse event
  await db.insert(feedback).values([
    { user_id: studentIds[0], event_id: eventId, rating: 4, answers: { q_suggestions: 'More seating please' } },
    { user_id: studentIds[1], event_id: eventId, rating: 5, answers: { q_suggestions: 'Great speakers, better AC needed' } },
    { user_id: studentIds[2], event_id: eventId, rating: 3, answers: { q_suggestions: 'Longer Q&A session' } },
    { user_id: studentIds[0], event_id: sparseEventId, rating: 4, answers: { q_liked: 'The music', q_improve: 'Nothing', q_other: 'All good' } },
  ])
})

afterAll(async () => {
  await cleanupTestData()
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (ORIGINAL_GEMINI_KEY === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY
})

describe('GET /api/analytics/events/:id/ai-summary auth', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`/api/analytics/events/${eventId}/ai-summary`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for student token', async () => {
    const res = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', studentCookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent event', async () => {
    const res = await request(app)
      .get('/api/analytics/events/99999999/ai-summary')
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(404)
  })

  it("returns 403 for another organizer's event", async () => {
    const res = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizer2Cookie)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/analytics/events/:id/ai-summary availability', () => {
  it('returns available: false when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ available: false, reason: 'not_configured' })
  })

  it('returns available: false without calling Gemini when no question has 3+ responses, even if the total is 3', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await request(app)
      .get(`/api/analytics/events/${sparseEventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ available: false, reason: 'not_enough_responses' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns available: false when Gemini fails and no cache exists', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))

    const res = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ available: false, reason: 'generation_failed' })
  })
})

describe('GET /api/analytics/events/:id/ai-summary generation and caching', () => {
  it('generates a summary, caches it, and regenerates when new feedback arrives', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const fetchMock = vi.fn().mockResolvedValue(geminiFetchResponse(FAKE_SUMMARY))
    vi.stubGlobal('fetch', fetchMock)

    // first call generates and persists
    const first = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(first.status).toBe(200)
    expect(first.body.available).toBe(true)
    expect(first.body.summary).toEqual(FAKE_SUMMARY)
    expect(first.body.feedback_count).toBe(3)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [row] = await db.select().from(feedback_ai_summaries)
      .where(eq(feedback_ai_summaries.event_id, eventId))
    expect(row).toBeDefined()
    expect(row.feedback_count).toBe(3)

    // second call is a cache hit, no new Gemini call, same generated_at
    const second = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(second.status).toBe(200)
    expect(second.body.generated_at).toBe(first.body.generated_at)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // new feedback invalidates the cache and regenerates
    await db.insert(feedback).values({
      user_id: studentIds[3], event_id: eventId, rating: 5,
      answers: { q_suggestions: 'Loved the venue' },
    })
    const third = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(third.status).toBe(200)
    expect(third.body.available).toBe(true)
    expect(third.body.feedback_count).toBe(4)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('serves the stale cache when Gemini fails during regeneration', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    // make the cached count differ from the live count so the endpoint attempts a regeneration
    await db.update(feedback_ai_summaries)
      .set({ feedback_count: 1 })
      .where(eq(feedback_ai_summaries.event_id, eventId))

    const res = await request(app)
      .get(`/api/analytics/events/${eventId}/ai-summary`)
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.body.available).toBe(true)
    expect(res.body.summary).toEqual(FAKE_SUMMARY)
    // the stale cached row, not a fresh generation
    expect(res.body.feedback_count).toBe(1) 
  })
})