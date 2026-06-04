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
        u.name AS organizer_name
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
        u.name AS organizer_name
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

export default router