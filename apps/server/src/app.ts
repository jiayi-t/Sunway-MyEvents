import express from 'express'
import cors from 'cors'
import path from 'path'
import { globalLimiter } from './middleware/rate-limit'
import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import registrationRoutes from './routes/registrations'
import uploadsRoutes from './routes/uploads'
import feedbackRoutes from './routes/feedback'
import feedbackFormRoutes from './routes/feedback-forms'
import analyticsRoutes from './routes/analytics'
import notificationRoutes from './routes/notifications'
import organizerRoutes from './routes/organizers'
import recommendationRoutes from './routes/recommendations'

const app = express()

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true }))
app.use(express.json())

// blanket per-IP rate limit on all API traffic (specific routes add stricter limits)
app.use('/api', globalLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/registrations', registrationRoutes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/api/uploads', uploadsRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/events', feedbackFormRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/organizers', organizerRoutes)
app.use('/api/recommendations', recommendationRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Sunway MyEvents API running' })
})

// in production the server also serves the built client (single-origin deploy), the SPA fallback must skip /api and /uploads so unknown API routes still 404 as JSON
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

export default app
