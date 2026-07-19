import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import app from '../app'
import { db } from '../db'
import { users } from '../database/schema'

const TEST_STUDENT_ID = '26062106'
const TEST_ORG_ID = 'testorg'

beforeAll(async () => {
  await db.delete(users).where(eq(users.sunway_id, TEST_STUDENT_ID))
  await db.insert(users).values({
    sunway_id: TEST_STUDENT_ID,
    email: 'test.student@test.local',
    password: await bcrypt.hash('testing123', 10),
    name: 'Test Student',
    role: 'student',
  })
})

afterAll(async () => {
  await db.delete(users).where(eq(users.sunway_id, TEST_STUDENT_ID))
  await db.delete(users).where(eq(users.sunway_id, TEST_ORG_ID))
})

describe('POST /api/auth/login', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      sunwayId: TEST_STUDENT_ID,
      password: 'wrongpassword',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 400 for non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      // not 8 digits, will not be auto-provisioned as a student account
      sunwayId: 'nonexistent',
      password: 'testing123',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 200 with token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      sunwayId: TEST_STUDENT_ID,
      password: 'testing123',
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.sunway_id).toBe(TEST_STUDENT_ID)
  })
})

describe('POST /api/auth/register/organizer', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register/organizer').send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 when username exceeds 8 characters', async () => {
    const res = await request(app).post('/api/auth/register/organizer').send({
      name: 'Test Organizer', 
      username: 'testorganizer', 
      email: 'test.organizer@test.local',
      category: 'Sports', 
      password: 'testing1234',
    })
    expect(res.status).toBe(400)
  })

  it('returns 201 on successful registration', async () => {
    const res = await request(app).post('/api/auth/register/organizer').send({
      name: 'Test Organizer', 
      username: TEST_ORG_ID, 
      email: 'test.organizer@test.local',
      category: 'Sports', 
      password: 'testing1234',
    })
    expect(res.status).toBe(201)
    expect(res.body.user.sunway_id).toBe(TEST_ORG_ID)
  })

  it('returns 400 for duplicate username', async () => {
    const res = await request(app).post('/api/auth/register/organizer').send({
      name: 'Test Organizer', 
      username: TEST_ORG_ID, 
      email: 'test.organizer2@test.local',
      category: 'Sports', 
      password: 'testing1234',
    })
    expect(res.status).toBe(400)
  })
})
