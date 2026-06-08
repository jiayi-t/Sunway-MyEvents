import { Router } from 'express'
import pool from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/registrations/my - get current user's registrations
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.event_id,
        r.registered_at,
        e.name AS event_name,
        e.date AS event_date,
        e.start_time AS event_start_time,
        e.end_time AS event_end_time,
        e.venue AS event_venue,
        e.category AS event_category,
        e.image_url AS event_image_url,
        u.name AS organizer_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE r.user_id = $1
      ORDER BY e.date ASC
    `, [req.user!.id])

    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router