import express from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import registrationRoutes from './routes/registrations'
import uploadsRoutes from './routes/uploads'
import feedbackRoutes from './routes/feedback'
import feedbackFormRoutes from './routes/feedback-forms'
import analyticsRoutes from './routes/analytics'
import notificationRoutes from './routes/notifications'
import organizerRoutes from './routes/organizers'

const app = express()

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true }))
app.use(express.json())

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Sunway MyEvents API running' })
})

export default app
