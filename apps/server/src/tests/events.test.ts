import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'
import app from '../app'
import { db } from '../db'
import { users, events, registrations, sessions } from '../database/schema'
import { createSession } from '../utils/sessions'
import { SESSION_COOKIE } from '../utils/cookies'

const TEST_ORG_SUNWAY_ID = 'orgtest'
const TEST_STU_SUNWAY_ID = '26060621'
// pin tests need a second organizer (ownership) and a public user (students_only visibility)
const TEST_ORG2_SUNWAY_ID = 'orgtest2'
const TEST_PUB_SUNWAY_ID = 'PINPUB01'

let organizerCookie: string
let organizer2Cookie: string
let studentCookie: string
let publicCookie: string
let organizerId: number
let organizerPublicId: string

const VALID_EVENT = {
  name: 'Test Event',
  date: '2027-06-21T00:00:00',
  start_time: '2027-06-21T09:00:00',
  end_time: '2027-06-21T11:00:00',
  venue: 'Test Hall',
  pricing: 0,
  category: 'Sports',
  image_url: '/uploads/test.jpg',
}

const ALL_TEST_SUNWAY_IDS = [
  TEST_ORG_SUNWAY_ID,
  TEST_ORG2_SUNWAY_ID,
  TEST_STU_SUNWAY_ID,
  TEST_PUB_SUNWAY_ID,
]

async function cleanupTestData() {
  const existingOrgs = await db.select({ id: users.id }).from(users)
    .where(inArray(users.sunway_id, [TEST_ORG_SUNWAY_ID, TEST_ORG2_SUNWAY_ID]))
  for (const existingOrg of existingOrgs) {
    const orgEvents = await db.select({ id: events.id }).from(events).where(eq(events.organizer_id, existingOrg.id))
    if (orgEvents.length > 0) {
      await db.delete(registrations).where(inArray(registrations.event_id, orgEvents.map(e => e.id)))
    }
    await db.delete(events).where(eq(events.organizer_id, existingOrg.id))
  }
  const testUsers = await db.select({ id: users.id }).from(users)
    .where(inArray(users.sunway_id, ALL_TEST_SUNWAY_IDS))
  if (testUsers.length > 0) {
    await db.delete(sessions).where(inArray(sessions.user_id, testUsers.map(u => u.id)))
  }
  await db.delete(users).where(inArray(users.sunway_id, ALL_TEST_SUNWAY_IDS))
}

beforeAll(async () => {
  await cleanupTestData()

  const [org] = await db.insert(users).values({
    sunway_id: TEST_ORG_SUNWAY_ID,
    email: 'testorg@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Organizer',
    role: 'organizer',
    category: 'Sports',
  }).returning({ id: users.id, public_id: users.public_id, sunway_id: users.sunway_id, role: users.role })

  organizerId = org.id
  organizerPublicId = org.public_id
  const { sessionId: orgSessionId } = await createSession(org.id)
  organizerCookie = `${SESSION_COOKIE}=${orgSessionId}`

  const [org2] = await db.insert(users).values({
    sunway_id: TEST_ORG2_SUNWAY_ID,
    email: 'testorg2@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Other Test Organizer',
    role: 'organizer',
    category: 'Sports',
  }).returning({ id: users.id })

  const { sessionId: org2SessionId } = await createSession(org2.id)
  organizer2Cookie = `${SESSION_COOKIE}=${org2SessionId}`

  const [stu] = await db.insert(users).values({
    sunway_id: TEST_STU_SUNWAY_ID,
    email: 'teststu@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Student',
    role: 'student',
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })

  const { sessionId: stuSessionId } = await createSession(stu.id)
  studentCookie = `${SESSION_COOKIE}=${stuSessionId}`

  const [pub] = await db.insert(users).values({
    sunway_id: TEST_PUB_SUNWAY_ID,
    email: 'testpub@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Public User',
    role: 'public',
  }).returning({ id: users.id })

  const { sessionId: pubSessionId } = await createSession(pub.id)
  publicCookie = `${SESSION_COOKIE}=${pubSessionId}`
})

afterAll(async () => {
  await cleanupTestData()
})

describe('GET /api/events', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/events', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/events').send(VALID_EVENT)
    expect(res.status).toBe(401)
  })

  it('returns 403 for student token', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', studentCookie)
      .send(VALID_EVENT)
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', organizerCookie)
      .send({ name: 'No dates' })
    expect(res.status).toBe(400)
  })

  it('returns 201 on successful creation', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', organizerCookie)
      .send(VALID_EVENT)
    expect(res.status).toBe(201)
    expect(res.body.name).toBe(VALID_EVENT.name)
  })
})

describe('POST /api/events/:id/register', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/events/1/register')
    expect(res.status).toBe(401)
  })

  it('returns 400 when registering for a cancelled event', async () => {
    const [cancelled] = await db.insert(events).values({
      name: 'Cancelled Test Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
      cancelled_at: new Date(),
    }).returning()

    const res = await request(app)
      .post(`/api/events/${cancelled.public_id}/register`)
      .set('Cookie', studentCookie)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('This event has been cancelled')

    await db.delete(events).where(eq(events.id, cancelled.id))
  })

  it('returns 400 when registering for a sold out event', async () => {
    const [soldOut] = await db.insert(events).values({
      name: 'Sold Out Test Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
      capacity: 1,
    }).returning()

    // fill the one spot so the event is at capacity
    await db.insert(registrations).values({ user_id: organizerId, event_id: soldOut.id })

    const res = await request(app)
      .post(`/api/events/${soldOut.public_id}/register`)
      .set('Cookie', studentCookie)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('This event is sold out')

    await db.delete(registrations).where(eq(registrations.event_id, soldOut.id))
    await db.delete(events).where(eq(events.id, soldOut.id))
  })
})

describe('GET /api/events/:id public_id resolution', () => {
  it('resolves by public_id but not by the raw integer id of a new event', async () => {
    const [ev] = await db.insert(events).values({
      name: 'UUID Resolution Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
    }).returning()

    // the uuid is the public identifier and resolves
    const byUuid = await request(app).get(`/api/events/${ev.public_id}`)
    expect(byUuid.status).toBe(200)
    expect(byUuid.body.id).toBe(ev.public_id)
    // the response never leaks the internal integer id or legacy id
    expect(byUuid.body.legacy_numeric_id).toBeUndefined()

    // a new event has no legacy_numeric_id, so its integer id is not reachable by number
    const byInt = await request(app).get(`/api/events/${ev.id}`)
    expect(byInt.status).toBe(404)

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('returns 404 (not a server error) for a malformed or out-of-range id', async () => {
    // a non-uuid string would make postgres reject the uuid comparison if it reached the query
    const malformed = await request(app).get('/api/events/not-a-uuid')
    expect(malformed.status).toBe(404)
    // a number larger than postgres integer would overflow the legacy_numeric_id comparison
    const overflow = await request(app).get('/api/events/99999999999999999999')
    expect(overflow.status).toBe(404)
  })

  it('resolves a legacy numeric id for events that predate the migration (old bookmarks)', async () => {
    const [ev] = await db.insert(events).values({
      name: 'Legacy Bookmark Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
    }).returning()
    // simulate a pre-migration row by backfilling its legacy id
    await db.update(events).set({ legacy_numeric_id: ev.id }).where(eq(events.id, ev.id))

    const byLegacy = await request(app).get(`/api/events/${ev.id}`)
    expect(byLegacy.status).toBe(200)
    // even via the legacy url, the response carries the uuid, not the integer id
    expect(byLegacy.body.id).toBe(ev.public_id)

    await db.delete(events).where(eq(events.id, ev.id))
  })
})

describe('PATCH /api/events/:id/pin and /unpin', () => {
  // upcoming by default, pass overrides for past, cancelled, archived or students_only cases
  async function createEvent(overrides: Record<string, unknown> = {}) {
    const [ev] = await db.insert(events).values({
      name: 'Pin Test Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
      ...overrides,
    }).returning()
    return ev
  }

  const pinnedAtOf = async (id: number) => {
    const [row] = await db.select({ pinned_at: events.pinned_at }).from(events).where(eq(events.id, id))
    return row.pinned_at
  }

  it('pins an upcoming event and unpins it again', async () => {
    const ev = await createEvent()

    const pinRes = await request(app)
      .patch(`/api/events/${ev.public_id}/pin`)
      .set('Cookie', organizerCookie)
    expect(pinRes.status).toBe(200)
    expect(await pinnedAtOf(ev.id)).not.toBeNull()

    const unpinRes = await request(app)
      .patch(`/api/events/${ev.public_id}/unpin`)
      .set('Cookie', organizerCookie)
    expect(unpinRes.status).toBe(200)
    expect(await pinnedAtOf(ev.id)).toBeNull()

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('pins a past event too', async () => {
    const ev = await createEvent({
      date: new Date('2020-01-01'),
      start_time: new Date('2020-01-01T09:00:00'),
      end_time: new Date('2020-01-01T11:00:00'),
    })

    const res = await request(app)
      .patch(`/api/events/${ev.public_id}/pin`)
      .set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    expect(await pinnedAtOf(ev.id)).not.toBeNull()

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('returns 401 without a session and 403 for a student', async () => {
    const ev = await createEvent()

    const anon = await request(app).patch(`/api/events/${ev.public_id}/pin`)
    expect(anon.status).toBe(401)

    const student = await request(app)
      .patch(`/api/events/${ev.public_id}/pin`)
      .set('Cookie', studentCookie)
    expect(student.status).toBe(403)

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('returns 403 when another organizer tries to pin the event', async () => {
    const ev = await createEvent()

    const res = await request(app)
      .patch(`/api/events/${ev.public_id}/pin`)
      .set('Cookie', organizer2Cookie)
    expect(res.status).toBe(403)
    expect(await pinnedAtOf(ev.id)).toBeNull()

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('refuses to pin a cancelled or an archived event', async () => {
    const cancelled = await createEvent({ cancelled_at: new Date() })
    const archived = await createEvent({ archived_at: new Date() })

    const cancelledRes = await request(app)
      .patch(`/api/events/${cancelled.public_id}/pin`)
      .set('Cookie', organizerCookie)
    expect(cancelledRes.status).toBe(400)
    expect(cancelledRes.body.error).toBe('Cancelled events cannot be pinned')

    const archivedRes = await request(app)
      .patch(`/api/events/${archived.public_id}/pin`)
      .set('Cookie', organizerCookie)
    expect(archivedRes.status).toBe(400)
    expect(archivedRes.body.error).toBe('Archived events cannot be pinned')

    await db.delete(events).where(inArray(events.id, [cancelled.id, archived.id]))
  })

  it('caps an organizer at 3 pinned events, and pinning twice does not spend a second slot', async () => {
    const created = [await createEvent(), await createEvent(), await createEvent(), await createEvent()]

    for (const ev of created.slice(0, 3)) {
      const res = await request(app).patch(`/api/events/${ev.public_id}/pin`).set('Cookie', organizerCookie)
      expect(res.status).toBe(200)
    }

    // re-pinning an already pinned event is a no-op, not a slot
    const again = await request(app).patch(`/api/events/${created[0].public_id}/pin`).set('Cookie', organizerCookie)
    expect(again.status).toBe(200)

    const fourth = await request(app).patch(`/api/events/${created[3].public_id}/pin`).set('Cookie', organizerCookie)
    expect(fourth.status).toBe(400)
    expect(fourth.body.error).toBe('You can pin up to 3 events')
    expect(await pinnedAtOf(created[3].id)).toBeNull()

    // a freed slot lets the fourth event in
    await request(app).patch(`/api/events/${created[0].public_id}/unpin`).set('Cookie', organizerCookie)
    const retry = await request(app).patch(`/api/events/${created[3].public_id}/pin`).set('Cookie', organizerCookie)
    expect(retry.status).toBe(200)

    await db.delete(events).where(inArray(events.id, created.map(e => e.id)))
  })

  it('drops the pin when the event is archived', async () => {
    const ev = await createEvent({
      date: new Date('2020-01-01'),
      start_time: new Date('2020-01-01T09:00:00'),
      end_time: new Date('2020-01-01T11:00:00'),
    })

    await request(app).patch(`/api/events/${ev.public_id}/pin`).set('Cookie', organizerCookie)
    expect(await pinnedAtOf(ev.id)).not.toBeNull()

    const archiveRes = await request(app)
      .patch(`/api/events/${ev.public_id}/archive`)
      .set('Cookie', organizerCookie)
    expect(archiveRes.status).toBe(200)
    expect(await pinnedAtOf(ev.id)).toBeNull()

    await db.delete(events).where(eq(events.id, ev.id))
  })

  it('exposes pinned_at on the organizer-events list', async () => {
    const ev = await createEvent()
    await request(app).patch(`/api/events/${ev.public_id}/pin`).set('Cookie', organizerCookie)

    const res = await request(app).get('/api/events/organizer-events').set('Cookie', organizerCookie)
    expect(res.status).toBe(200)
    const row = res.body.find((e: any) => e.id === ev.public_id)
    expect(row.pinned_at).not.toBeNull()

    await db.delete(events).where(eq(events.id, ev.id))
  })
})

describe('GET /api/organizers/:id pinned_events', () => {
  it('returns the pinned event to a student, and hides a students_only pin from a public user', async () => {
    const [everyone] = await db.insert(events).values({
      name: 'Pinned Everyone Event',
      date: new Date('2027-06-21'),
      start_time: new Date('2027-06-21T09:00:00'),
      end_time: new Date('2027-06-21T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
    }).returning()

    const [studentsOnly] = await db.insert(events).values({
      name: 'Pinned Students Only Event',
      date: new Date('2027-06-22'),
      start_time: new Date('2027-06-22T09:00:00'),
      end_time: new Date('2027-06-22T11:00:00'),
      venue: 'Test Hall',
      pricing: '0',
      category: 'Sports',
      audience: 'students_only',
      image_url: '/uploads/test.jpg',
      organizer_id: organizerId,
    }).returning()

    for (const ev of [everyone, studentsOnly]) {
      const res = await request(app).patch(`/api/events/${ev.public_id}/pin`).set('Cookie', organizerCookie)
      expect(res.status).toBe(200)
    }

    const asStudent = await request(app)
      .get(`/api/organizers/${organizerPublicId}`)
      .set('Cookie', studentCookie)
    expect(asStudent.status).toBe(200)
    const studentPinnedIds = asStudent.body.pinned_events.map((e: any) => e.id)
    expect(studentPinnedIds).toContain(everyone.public_id)
    expect(studentPinnedIds).toContain(studentsOnly.public_id)

    const asPublic = await request(app)
      .get(`/api/organizers/${organizerPublicId}`)
      .set('Cookie', publicCookie)
    expect(asPublic.status).toBe(200)
    const publicPinnedIds = asPublic.body.pinned_events.map((e: any) => e.id)
    expect(publicPinnedIds).toContain(everyone.public_id)
    expect(publicPinnedIds).not.toContain(studentsOnly.public_id)

    await db.delete(events).where(inArray(events.id, [everyone.id, studentsOnly.id]))
  })

  it('returns an empty pinned_events array when nothing is pinned', async () => {
    const res = await request(app)
      .get(`/api/organizers/${organizerPublicId}`)
      .set('Cookie', studentCookie)
    expect(res.status).toBe(200)
    expect(res.body.pinned_events).toEqual([])
  })
})
