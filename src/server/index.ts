import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { tasksRoutes } from './routes/tasks'
import { habitsRoutes } from './routes/habits'
import { moyasRoutes } from './routes/moyas'
import { journeyRoutes } from './routes/journey'
import { settingsRoutes } from './routes/settings'
import { authMiddleware } from './middleware/auth'
import type { Env } from './types'

export { NotificationScheduler } from '../worker/notification-scheduler'

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Public routes
app.route('/api/auth', authRoutes)

// Protected routes
app.use('/api/*', authMiddleware)
app.route('/api/tasks', tasksRoutes)
app.route('/api/habits', habitsRoutes)
app.route('/api/moyas', moyasRoutes)
app.route('/api/journey', journeyRoutes)
app.route('/api/settings', settingsRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// 404 for API routes
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404)
})

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ success: false, error: 'Internal server error' }, 500)
})

export default app
