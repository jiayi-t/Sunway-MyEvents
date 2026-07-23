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

let organizerCookie: string
let studentCookie: string
let organizerId: number

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

async function cleanupTestData() {
  const [existingOrg] = await db.select({ id: users.id }).from(users).where(eq(users.sunway_id, TEST_ORG_SUNWAY_ID))
  if (existingOrg) {
    const orgEvents = await db.select({ id: events.id }).from(events).where(eq(events.organizer_id, existingOrg.id))
    if (orgEvents.length > 0) {
      await db.delete(registrations).where(inArray(registrations.event_id, orgEvents.map(e => e.id)))
    }
    await db.delete(events).where(eq(events.organizer_id, existingOrg.id))
  }
  const testUsers = await db.select({ id: users.id }).from(users)
    .where(inArray(users.sunway_id, [TEST_ORG_SUNWAY_ID, TEST_STU_SUNWAY_ID]))
  if (testUsers.length > 0) {
    await db.delete(sessions).where(inArray(sessions.user_id, testUsers.map(u => u.id)))
  }
  await db.delete(users).where(eq(users.sunway_id, TEST_ORG_SUNWAY_ID))
  await db.delete(users).where(eq(users.sunway_id, TEST_STU_SUNWAY_ID))
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
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })

  organizerId = org.id
  const { sessionId: orgSessionId } = await createSession(org.id)
  organizerCookie = `${SESSION_COOKIE}=${orgSessionId}`

  const [stu] = await db.insert(users).values({
    sunway_id: TEST_STU_SUNWAY_ID,
    email: 'teststu@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Student',
    role: 'student',
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })

  const { sessionId: stuSessionId } = await createSession(stu.id)
  studentCookie = `${SESSION_COOKIE}=${stuSessionId}`
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
