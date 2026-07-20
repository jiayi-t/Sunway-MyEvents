import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
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

// in prod, trust the proxy's first hop so req.ip is the real client IP (needed for rate limiting)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// security headers, CSP off (would block the served SPA), CORP relaxed so uploaded images embed
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

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
