import { Hono } from 'hono'
import { generateId, getTodayDate, getTomorrowDate } from '@shared/utils'
import type { Env, DbTask } from '../types'
import type { Task } from '@shared/types'

export const tasksRoutes = new Hono<{ Bindings: Env }>()

// Get today's tasks
tasksRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')
  const date = c.req.query('date') || getTodayDate()

  const result = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
  )
    .bind(userId, date)
    .all<DbTask>()

  const tasks: Task[] = (result.results || []).map((t) => ({
    ...t,
    completed: !!t.completed
  }))

  return c.json({ success: true, data: tasks })
})

// Get uncompleted tasks from previous days
tasksRoutes.get('/pending', async (c) => {
  const { userId } = c.get('auth')
  const today = getTodayDate()

  const result = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date < ? AND completed = 0 ORDER BY date DESC, created_at ASC'
  )
    .bind(userId, today)
    .all<DbTask>()

  const tasks: Task[] = (result.results || []).map((t) => ({
    ...t,
    completed: !!t.completed
  }))

  return c.json({ success: true, data: tasks })
})

// Create task
tasksRoutes.post('/', async (c) => {
  const { userId } = c.get('auth')
  const { title, date } = await c.req.json<{ title: string; date?: string }>()

  if (!title || title.length === 0 || title.length > 100) {
    return c.json({ success: false, error: 'Invalid title' }, 400)
  }

  const taskDate = date || getTodayDate()

  // Check max 3 tasks per day
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ?'
  )
    .bind(userId, taskDate)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 3) {
    return c.json({ success: false, error: 'Maximum 3 tasks per day' }, 400)
  }

  const id = generateId()
  const now = Date.now()

  await c.env.DB.prepare(
    'INSERT INTO tasks (id, user_id, title, completed, date, created_at) VALUES (?, ?, ?, 0, ?, ?)'
  )
    .bind(id, userId, title, taskDate, now)
    .run()

  const task: Task = {
    id,
    user_id: userId,
    title,
    completed: false,
    date: taskDate,
    created_at: now
  }

  return c.json({ success: true, data: task }, 201)
})

// Update task
// ストリーク更新は /api/journey/log に集約されているため、ここではタスクの更新のみ行う
tasksRoutes.patch('/:id', async (c) => {
  const { userId } = c.get('auth')
  const taskId = c.req.param('id')
  const updates = await c.req.json<{ title?: string; completed?: boolean; date?: string }>()

  // Verify ownership
  const existing = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .first<DbTask>()

  if (!existing) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.title !== undefined) {
    if (updates.title.length === 0 || updates.title.length > 100) {
      return c.json({ success: false, error: 'Invalid title' }, 400)
    }
    fields.push('title = ?')
    values.push(updates.title)
  }

  if (updates.completed !== undefined) {
    fields.push('completed = ?')
    values.push(updates.completed ? 1 : 0)
  }

  if (updates.date !== undefined) {
    fields.push('date = ?')
    values.push(updates.date)
  }

  if (fields.length === 0) {
    return c.json({ success: false, error: 'No updates provided' }, 400)
  }

  values.push(taskId)

  await c.env.DB.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(taskId)
    .first<DbTask>()

  const task: Task = {
    ...updated!,
    completed: !!updated!.completed
  }

  return c.json({ success: true, data: task })
})

// Delete task
tasksRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const taskId = c.req.param('id')

  const result = await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  return c.json({ success: true })
})

// Move task to today
tasksRoutes.post('/:id/move-to-today', async (c) => {
  const { userId } = c.get('auth')
  const taskId = c.req.param('id')
  const today = getTodayDate()

  // Check max 3 tasks for today
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ?'
  )
    .bind(userId, today)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 3) {
    return c.json({ success: false, error: 'Maximum 3 tasks per day' }, 400)
  }

  const result = await c.env.DB.prepare('UPDATE tasks SET date = ? WHERE id = ? AND user_id = ?')
    .bind(today, taskId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  return c.json({ success: true })
})

// Move task to tomorrow
tasksRoutes.post('/:id/move-to-tomorrow', async (c) => {
  const { userId } = c.get('auth')
  const taskId = c.req.param('id')
  const tomorrow = getTomorrowDate()

  // Check max 3 tasks for tomorrow
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ?'
  )
    .bind(userId, tomorrow)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 3) {
    return c.json({ success: false, error: 'Maximum 3 tasks per day' }, 400)
  }

  const result = await c.env.DB.prepare('UPDATE tasks SET date = ? WHERE id = ? AND user_id = ?')
    .bind(tomorrow, taskId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  return c.json({ success: true })
})

// Demote task to moya
tasksRoutes.post('/:id/demote-to-moya', async (c) => {
  const { userId } = c.get('auth')
  const taskId = c.req.param('id')

  // Get task
  const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .first<DbTask>()

  if (!task) {
    return c.json({ success: false, error: 'Task not found' }, 404)
  }

  if (task.completed) {
    return c.json({ success: false, error: 'Cannot demote completed task' }, 400)
  }

  // Create moya
  const moyaId = generateId()
  const now = Date.now()

  await c.env.DB.prepare(
    'INSERT INTO moyas (id, user_id, content, created_at, extended_at) VALUES (?, ?, ?, ?, NULL)'
  )
    .bind(moyaId, userId, task.title, now)
    .run()

  // Delete task
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run()

  return c.json({
    success: true,
    data: {
      id: moyaId,
      user_id: userId,
      content: task.title,
      created_at: now,
      extended_at: null
    }
  })
})
