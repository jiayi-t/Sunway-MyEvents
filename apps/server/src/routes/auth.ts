import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm'
import { db } from '../db'
import { users, password_reset_tokens } from '../database/schema'
import { authenticate, type AuthRequest } from '../middleware/auth'
import {
  loginLimiter, loginAccountLimiter, forgotPasswordLimiter, registerLimiter, resetPasswordLimiter,
} from '../middleware/rate-limit'
import { sendEmail, forgotPasswordEmail } from '../email'

const router = Router()

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '1d') as jwt.SignOptions['expiresIn']

// POST /api/auth/login
router.post('/login', loginLimiter, loginAccountLimiter, async (req, res) => {
  const { sunwayId, password } = req.body

  if (!sunwayId || !password) {
    return res.status(400).json({ error: 'ID and password are required' })
  }

  try {
    const result = await db.select().from(users).where(eq(users.sunway_id, sunwayId))
    let user = result[0]

    // public accounts have no Sunway ID and log in with their email instead
    if (!user && sunwayId.includes('@')) {
      const byEmail = await db.select().from(users).where(eq(users.email, sunwayId))
      user = byEmail[0]
    }

    // UAT (no live Sunway DB): auto-provision a student for an unrecognised 8-digit student ID.
    const studentId = sunwayId.trim()
    if (!user && /^\d{8}$/.test(studentId)) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }
      // the password they typed becomes their password, so the check below passes
      const hashedPassword = await bcrypt.hash(password, 10)
      try {
        const [created] = await db.insert(users).values({
          sunway_id: studentId,
          email: `${studentId}@imail.sunway.edu.my`,
          password: hashedPassword,
          name: 'Student',
          role: 'student',
        }).returning()
        // they finish their profile via onboarding (needs_onboarding is true until then)
        user = created
      } catch (e: any) {
        // if another account has the same iMail
        if (e?.code === '23505' || e?.cause?.code === '23505') {
          return res.status(400).json({ error: 'Invalid credentials' })
        }
        throw e
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, sunway_id: user.sunway_id, role: user.role, tv: user.token_version },
      process.env.JWT_SECRET!,
      { expiresIn: jwtExpiresIn }
    )

    res.json({
      user: {
        id: user.id,
        sunway_id: user.sunway_id,
        email: user.email,
        name: user.name,
        role: user.role,
        image_url: user.image_url ?? null,
        interests: (user.interests as string[] | null) ?? null,
        tour_completed_at: user.tour_completed_at ?? null
      },
      token,
      // students whose profile has not been filled yet (auto-provisioned UAT accounts)
      needs_onboarding: user.role === 'student' && !user.faculty,
    })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register/organizer
router.post('/register/organizer', registerLimiter, async (req, res) => {
  const { name, username, email, category, password } = req.body

  if (!name || !username || !email || !category || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    if (username.length > 8) {
      return res.status(400).json({ error: 'Username must be 8 characters or less. Try using your SLB or C&S shortform.' })
    }

    const existingUsername = await db.select({ id: users.id }).from(users).where(eq(users.sunway_id, username))
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
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
    // if two users try to register with the same email or username at the same time, the database will throw a unique constraint violation error
    if (error.code === '23505') {
      if (typeof error.constraint === 'string' && error.constraint.includes('email')) {
        return res.status(400).json({ error: 'Email already registered' })
      }
      return res.status(400).json({ error: 'Username already taken' })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register/public
router.post('/register/public', registerLimiter, async (req, res) => {
  const { name, email, password, gender, mobile_number, alumni } = req.body

  if (!name || !email || !password || !gender || !mobile_number || typeof alumni !== 'boolean') {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    // public accounts have no real Sunway ID, generate a placeholder to satisfy the NOT NULL UNIQUE
    const sunwayId = 'pub' + crypto.randomBytes(4).toString('hex').slice(0, 5)

    const result = await db.insert(users).values({
      sunway_id: sunwayId,
      email,
      password: hashedPassword,
      name,
      role: 'public',
      gender,
      mobile_number,
      alumni
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role })

    res.status(201).json({
      message: 'Account created successfully',
      user: result[0]
    })
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already registered' })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/auth/tour-completed 
router.patch('/tour-completed', authenticate, async (req: AuthRequest, res) => {
  try {
    const tour_completed_at = new Date()
    await db.update(users).set({ tour_completed_at }).where(eq(users.id, req.user!.id))
    res.json({ tour_completed_at })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/interests
router.get('/interests', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db.select({ interests: users.interests }).from(users).where(eq(users.id, req.user!.id))
    const interests = (result[0]?.interests as string[] | null) ?? []
    res.json({ interests })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/auth/interests
router.put('/interests', authenticate, async (req: AuthRequest, res) => {
  const { interests } = req.body
  if (!Array.isArray(interests)) {
    return res.status(400).json({ error: 'interests must be an array' })
  }
  try {
    await db.update(users).set({ interests }).where(eq(users.id, req.user!.id))
    res.json({ interests })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/time-preferences
router.get('/time-preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await db.select({ preferred_time_ranges: users.preferred_time_ranges }).from(users).where(eq(users.id, req.user!.id))
    const preferred_time_ranges = result[0]?.preferred_time_ranges ?? null
    res.json({ preferred_time_ranges })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/auth/time-preferences
router.put('/time-preferences', authenticate, async (req: AuthRequest, res) => {
  const timeRange = req.body.preferred_time_ranges ?? null
  const isValid =
    timeRange === null ||
    (typeof timeRange === 'object' && !Array.isArray(timeRange) &&
      typeof timeRange.from === 'string' && typeof timeRange.to === 'string')
  if (!isValid) {
    return res.status(400).json({ error: 'preferred_time_ranges must be { from, to } or null' })
  }
  try {
    await db.update(users).set({ preferred_time_ranges: timeRange }).where(eq(users.id, req.user!.id))
    res.json({ preferred_time_ranges: timeRange })
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
        year_of_study: users.year_of_study,
        mobile_number: users.mobile_number,
        personal_email: users.personal_email,
        notification_preferences: users.notification_preferences,
        alumni: users.alumni,
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

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  const { image_url } = req.body
  if (image_url !== undefined && image_url !== null && typeof image_url !== 'string') {
    return res.status(400).json({ error: 'Invalid image_url' })
  }
  try {
    await db.update(users).set({ image_url: image_url ?? null }).where(eq(users.id, req.user!.id))
    const [updated] = await db.select({ image_url: users.image_url }).from(users).where(eq(users.id, req.user!.id))
    res.json(updated)
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

// GET /api/auth/organizer-profile
router.get('/organizer-profile', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  try {
    const result = await db
      .select({
        id: users.id,
        sunway_id: users.sunway_id,
        email: users.email,
        name: users.name,
        role: users.role,
        category: users.category,
        image_url: users.image_url,
        social_links: users.social_links,
        about: users.about,
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

// PUT /api/auth/organizer-profile
router.put('/organizer-profile', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer') return res.status(403).json({ error: 'Forbidden' })
  const name: string | undefined = typeof req.body.name === 'string' ? req.body.name.trim() || undefined : undefined
  const sunway_id: string | undefined = typeof req.body.sunway_id === 'string' ? req.body.sunway_id.trim() : undefined
  const email: string | undefined = typeof req.body.email === 'string' ? req.body.email.trim() : undefined
  const { category, social_links, about, image_url } = req.body

  if (!Array.isArray(social_links)) return res.status(400).json({ error: 'social_links must be an array' })

  if (sunway_id !== undefined) {
    if (sunway_id.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' })
    if (sunway_id.length > 8) return res.status(400).json({ error: 'Username must be 8 characters or less. Try using your SLB or C&S shortform.' })
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.sunway_id, sunway_id), ne(users.id, req.user!.id))).limit(1)
    if (taken) return res.status(400).json({ error: 'Username already taken' })
  }

  if (email !== undefined) {
    if (!email.includes('@')) return res.status(400).json({ error: 'Invalid email address' })
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, email), ne(users.id, req.user!.id))).limit(1)
    if (taken) return res.status(400).json({ error: 'Email already in use' })
  }

  try {
    const updates: Record<string, unknown> = { social_links, about: about ?? null }
    if (name !== undefined) updates.name = name
    if (sunway_id !== undefined) updates.sunway_id = sunway_id
    if (email !== undefined) updates.email = email
    if (category !== undefined) updates.category = category
    if (image_url !== undefined) updates.image_url = image_url

    await db.update(users).set(updates).where(eq(users.id, req.user!.id))

    const [updated] = await db.select({
      id: users.id,
      name: users.name,
      sunway_id: users.sunway_id,
      email: users.email,
      role: users.role,
      category: users.category,
      image_url: users.image_url,
      social_links: users.social_links,
      about: users.about,
    }).from(users).where(eq(users.id, req.user!.id))

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  // Always return 200, don't reveal whether the email exists
  res.json({ message: 'If that email is registered, a reset link has been sent.' })

  try {
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(eq(users.email, email)).limit(1)
    if (!user || (user.role !== 'organizer' && user.role !== 'public')) return

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.insert(password_reset_tokens).values({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

    const resetUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`
    await sendEmail(user.email, 'Reset your Sunway MyEvents password', forgotPasswordEmail(user.name, resetUrl))
  } catch (err) {
    console.error('[auth] forgot-password error:', err)
  }
})

// GET /api/auth/validate-reset-token?token=xxx
router.get('/validate-reset-token', async (req, res) => {
  const { token } = req.query
  if (!token || typeof token !== 'string') return res.status(400).json({ valid: false })

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const [row] = await db.select({ id: password_reset_tokens.id })
      .from(password_reset_tokens)
      .where(and(
        eq(password_reset_tokens.token_hash, tokenHash),
        isNull(password_reset_tokens.used_at),
        gt(password_reset_tokens.expires_at, new Date()),
      ))
      .limit(1)

    res.json({ valid: !!row })
  } catch {
    res.status(500).json({ valid: false })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Password reset token and new password are required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const [row] = await db.select({ id: password_reset_tokens.id, user_id: password_reset_tokens.user_id })
      .from(password_reset_tokens)
      .where(and(
        eq(password_reset_tokens.token_hash, tokenHash),
        isNull(password_reset_tokens.used_at),
        gt(password_reset_tokens.expires_at, new Date()),
      ))
      .limit(1)

    if (!row) return res.status(400).json({ error: 'Invalid or expired reset link.' })

    const hashedPassword = await bcrypt.hash(password, 10)
    // bump token_version so any JWTs issued before this reset are rejected by authenticate
    await db.update(users)
      .set({ password: hashedPassword, token_version: sql`${users.token_version} + 1` })
      .where(eq(users.id, row.user_id))
    // void every outstanding reset token for this user, not just the one used,
    // so any other reset links already sent can't be replayed
    await db.update(password_reset_tokens)
      .set({ used_at: new Date() })
      .where(and(eq(password_reset_tokens.user_id, row.user_id), isNull(password_reset_tokens.used_at)))

    res.json({ message: 'Password reset successfully.' })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/change-password - change password while logged in (organizer/public only)
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'organizer' && req.user?.role !== 'public') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from the current one' })
  }

  try {
    const [user] = await db.select({ password: users.password }).from(users).where(eq(users.id, req.user!.id)).limit(1)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    // bump token_version to invalidate sessions on other devices, then reissue a token for the current session so the user who just changed it stays logged in here
    const [updated] = await db.update(users)
      .set({ password: hashedPassword, token_version: sql`${users.token_version} + 1` })
      .where(eq(users.id, req.user!.id))
      .returning({ id: users.id, sunway_id: users.sunway_id, role: users.role, token_version: users.token_version })

    const token = jwt.sign(
      { id: updated.id, sunway_id: updated.sunway_id, role: updated.role, tv: updated.token_version },
      process.env.JWT_SECRET!,
      { expiresIn: jwtExpiresIn }
    )
    res.json({ message: 'Password changed successfully', token })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/auth/student-onboarding - UAT students 
router.put('/student-onboarding', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'student') return res.status(403).json({ error: 'Forbidden' })
  const name: string = typeof req.body.name === 'string' ? req.body.name.trim() : ''
  const { program, faculty, year_of_study, gender, mobile_number, personal_email } = req.body

  if (!name || !program || !faculty || !year_of_study || !gender) {
    return res.status(400).json({ error: 'Please fill in all required fields' })
  }

  const cleanedEmail = typeof personal_email === 'string' && personal_email.trim() ? personal_email.trim() : null
  if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email' })
  }

  try {
    await db.update(users).set({
      name,
      program: String(program).trim(),
      faculty,
      year_of_study,
      gender,
      mobile_number: typeof mobile_number === 'string' && mobile_number.trim() ? mobile_number.trim() : null,
      personal_email: cleanedEmail,
    }).where(eq(users.id, req.user!.id))

    const [updated] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.user!.id))
    res.json({ message: 'Profile saved', name: updated.name })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router