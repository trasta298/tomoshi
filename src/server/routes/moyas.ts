import { Hono } from 'hono'
import { generateId } from '@shared/utils'
import type { Env, DbMoya } from '../types'
import type { Moya } from '@shared/types'

export const moyasRoutes = new Hono<{ Bindings: Env }>()

// Get all moyas (not expired)
moyasRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')

  // Get moyas that are not older than 30 days from creation or extension
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const result = await c.env.DB.prepare(
    `SELECT * FROM moyas
     WHERE user_id = ?
     AND COALESCE(extended_at, created_at) > ?
     ORDER BY created_at DESC`
  )
    .bind(userId, thirtyDaysAgo)
    .all<DbMoya>()

  const moyas: Moya[] = (result.results || []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    content: m.content,
    created_at: m.created_at,
    extended_at: m.extended_at
  }))

  return c.json({ success: true, data: moyas })
})

// Create moya
moyasRoutes.post('/', async (c) => {
  const { userId } = c.get('auth')
  const { content } = await c.req.json<{ content: string }>()

  if (!content || content.length === 0 || content.length > 200) {
    return c.json({ success: false, error: 'Invalid content' }, 400)
  }

  const id = generateId()
  const now = Date.now()

  await c.env.DB.prepare(
    'INSERT INTO moyas (id, user_id, content, created_at, extended_at) VALUES (?, ?, ?, ?, NULL)'
  )
    .bind(id, userId, content, now)
    .run()

  const moya: Moya = {
    id,
    user_id: userId,
    content,
    created_at: now,
    extended_at: null
  }

  return c.json({ success: true, data: moya }, 201)
})

// Update moya
moyasRoutes.patch('/:id', async (c) => {
  const { userId } = c.get('auth')
  const moyaId = c.req.param('id')
  const updates = await c.req.json<{ content?: string }>()

  // Verify ownership
  const existing = await c.env.DB.prepare('SELECT * FROM moyas WHERE id = ? AND user_id = ?')
    .bind(moyaId, userId)
    .first<DbMoya>()

  if (!existing) {
    return c.json({ success: false, error: 'Moya not found' }, 404)
  }

  if (updates.content !== undefined) {
    if (updates.content.length === 0 || updates.content.length > 200) {
      return c.json({ success: false, error: 'Invalid content' }, 400)
    }

    await c.env.DB.prepare('UPDATE moyas SET content = ? WHERE id = ?')
      .bind(updates.content, moyaId)
      .run()
  }

  return c.json({ success: true })
})

// Extend moya (reset expiration timer by 14 days)
moyasRoutes.post('/:id/extend', async (c) => {
  const { userId } = c.get('auth')
  const moyaId = c.req.param('id')

  const result = await c.env.DB.prepare(
    'UPDATE moyas SET extended_at = ? WHERE id = ? AND user_id = ?'
  )
    .bind(Date.now(), moyaId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Moya not found' }, 404)
  }

  return c.json({ success: true })
})

// Delete moya
moyasRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const moyaId = c.req.param('id')

  const result = await c.env.DB.prepare('DELETE FROM moyas WHERE id = ? AND user_id = ?')
    .bind(moyaId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Moya not found' }, 404)
  }

  return c.json({ success: true })
})

// Promote moya to task
moyasRoutes.post('/:id/promote', async (c) => {
  const { userId } = c.get('auth')
  const moyaId = c.req.param('id')
  const { date } = await c.req.json<{ date?: string }>()

  // Get moya
  const moya = await c.env.DB.prepare('SELECT * FROM moyas WHERE id = ? AND user_id = ?')
    .bind(moyaId, userId)
    .first<DbMoya>()

  if (!moya) {
    return c.json({ success: false, error: 'Moya not found' }, 404)
  }

  const taskDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  // Check max 3 tasks per day
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ?'
  )
    .bind(userId, taskDate)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 3) {
    return c.json({ success: false, error: 'Maximum 3 tasks per day' }, 400)
  }

  // Create task
  const taskId = generateId()
  const now = Date.now()

  await c.env.DB.prepare(
    'INSERT INTO tasks (id, user_id, title, completed, date, created_at) VALUES (?, ?, ?, 0, ?, ?)'
  )
    .bind(taskId, userId, moya.content, taskDate, now)
    .run()

  // Delete moya
  await c.env.DB.prepare('DELETE FROM moyas WHERE id = ?').bind(moyaId).run()

  return c.json({
    success: true,
    data: {
      id: taskId,
      user_id: userId,
      title: moya.content,
      completed: false,
      date: taskDate,
      created_at: now
    }
  })
})
