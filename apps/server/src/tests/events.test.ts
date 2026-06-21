import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq, inArray } from 'drizzle-orm'
import app from '../app'
import { db } from '../db'
import { users, events, registrations } from '../database/schema'

const TEST_ORG_SUNWAY_ID = 'orgtest'
const TEST_STU_SUNWAY_ID = '26060621'

let organizerToken: string
let studentToken: string
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
  organizerToken = jwt.sign(
    { id: org.id, sunway_id: org.sunway_id, role: org.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )

  const [stu] = await db.insert(users).values({
    sunway_id: TEST_STU_SUNWAY_ID,
    email: 'teststu@events.test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Student',
    role: 'student',
  }).returning({ id: users.id, sunway_id: users.sunway_id, role: users.role })

  studentToken = jwt.sign(
    { id: stu.id, sunway_id: stu.sunway_id, role: stu.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )
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
      .set('Authorization', `Bearer ${studentToken}`)
      .send(VALID_EVENT)
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'No dates' })
    expect(res.status).toBe(400)
  })

  it('returns 201 on successful creation', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
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
      .post(`/api/events/${cancelled.id}/register`)
      .set('Authorization', `Bearer ${studentToken}`)

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
      .post(`/api/events/${soldOut.id}/register`)
      .set('Authorization', `Bearer ${studentToken}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('This event is sold out')

    await db.delete(registrations).where(eq(registrations.event_id, soldOut.id))
    await db.delete(events).where(eq(events.id, soldOut.id))
  })
})
