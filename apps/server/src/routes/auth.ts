import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../database/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '1d') as jwt.SignOptions['expiresIn']

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { sunwayId, password } = req.body

  if (!sunwayId || !password) {
    return res.status(400).json({ error: 'ID and password are required' })
  }

  try {
    const result = await db.select().from(users).where(eq(users.sunway_id, sunwayId))
    const user = result[0]

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, sunway_id: user.sunway_id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: jwtExpiresIn }
    )

    res.json({
      user: {
        id: user.id,
        sunway_id: user.sunway_id,
        name: user.name,
        role: user.role,
        image_url: user.image_url ?? null,
        preferences: (user.preferences as string[] | null) ?? null
      },
      token
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register/organizer
router.post('/register/organizer', async (req, res) => {
  const { name, username, email, category, password } = req.body

  if (!name || !username || !email || !category || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    if (username.length > 8) {
      return res.status(400).json({ error: 'Username must be 8 characters or less. Try using your SLB or C&S shortform.' })
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.sunway_id, username))
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await db.insert(users).values({
      sunway_id: username,
      email,
      password: hashedPassword,
      name,
      role: 'organizer',
      category
    }).returning({ id: users.id, sunway_id: users.sunway_id, name: users.name, role: users.role })

    res.status(201).json({
      message: 'Account created successfully',
      user: result[0]
    })
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already taken' })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, req.user!.id))
    const prefs = (result[0]?.preferences as string[] | null) ?? []
    res.json({ preferences: prefs })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/auth/preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res) => {
  const { preferences } = req.body
  if (!Array.isArray(preferences)) {
    return res.status(400).json({ error: 'preferences must be an array' })
  }
  try {
    await db.update(users).set({ preferences }).where(eq(users.id, req.user!.id))
    res.json({ preferences })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/profile
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({
        id: users.id,
        sunway_id: users.sunway_id,
        email: users.email,
        name: users.name,
        role: users.role,
        program: users.program,
        image_url: users.image_url,
        gender: users.gender,
        faculty: users.faculty,
        semester: users.semester,
        mobile_number: users.mobile_number,
        personal_email: users.personal_email,
        notification_preferences: users.notification_preferences,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
    const user = result[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/auth/notification-preferences
router.put('/notification-preferences', authenticate, async (req: AuthRequest, res) => {
  const { email_enabled, email_channel, course_related, interest_related, suggested } = req.body
  try {
    const prefs = { email_enabled, email_channel, course_related, interest_related, suggested }
    await db.update(users).set({ notification_preferences: prefs }).where(eq(users.id, req.user!.id))
    res.json({ notification_preferences: prefs })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router