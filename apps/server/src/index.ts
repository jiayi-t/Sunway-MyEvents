import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import registrationRoutes from './routes/registrations'
import path from 'path'
import uploadsRoutes from './routes/uploads'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/registrations', registrationRoutes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/api/uploads', uploadsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sunway MyEvents API running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})