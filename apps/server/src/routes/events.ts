import { Router } from 'express'
import pool from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/events - get all events
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.*,
        u.name AS organizer_name,
        u.image_url AS organizer_image_url
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      ORDER BY e.date ASC
    `)
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id - get single event
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.*,
        u.name AS organizer_name,
        u.image_url AS organizer_image_url
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/events/:id/registration-status
router.get('/:id/registration-status', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registrations WHERE user_id = $1 AND event_id = $2',
      [req.user!.id, req.params.id]
    )
    res.json({ registered: result.rows.length > 0 })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/events/:id/register - register for event (protected)
router.post('/:id/register', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM registrations WHERE user_id = $1 AND event_id = $2',
      [req.user!.id, req.params.id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event' })
    }

    await pool.query(
      'INSERT INTO registrations (user_id, event_id) VALUES ($1, $2)',
      [req.user!.id, req.params.id]
    )

    res.status(201).json({ message: 'Successfully registered for event' })
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
    category, capacity, registration_deadline, image_url
  } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO events
       (name, description, date, start_time, end_time, venue, pricing, category, capacity, registration_deadline, image_url, organizer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [name, description, date, start_time, end_time, venue, pricing || 0, category, capacity, registration_deadline, image_url, req.user!.id]
    )
    res.status(201).json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router