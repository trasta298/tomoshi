import { Hono } from 'hono'
import {
  generateId,
  getTodayDate,
  getTomorrowDate,
  getYesterdayDate,
  calculateStreakUpdate,
  type StreakUpdate
} from '@shared/utils'
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

  // If task was completed, check if all 3 tasks are done and update streak
  let streakUpdate: StreakUpdate | null = null
  if (updates.completed === true) {
    const taskDate = updated!.date
    const today = getTodayDate()

    // Only update streak for today's tasks
    if (taskDate === today) {
      // Count completed tasks for today
      const completedCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ? AND completed = 1'
      )
        .bind(userId, today)
        .first<{ count: number }>()

      // If all 3 tasks are completed, update streak
      if (completedCount && completedCount.count >= 3) {
        // Get current user streak info
        const user = await c.env.DB.prepare(
          'SELECT streak_count, streak_shields FROM users WHERE id = ?'
        )
          .bind(userId)
          .first<{ streak_count: number; streak_shields: number }>()

        const currentStreak = user?.streak_count || 0
        const currentShields = user?.streak_shields || 0

        // Check if yesterday was achieved
        const yesterday = getYesterdayDate()
        const yesterdayLog = await c.env.DB.prepare(
          'SELECT tasks_completed, habits_completed FROM daily_logs WHERE user_id = ? AND date = ?'
        )
          .bind(userId, yesterday)
          .first<{ tasks_completed: number; habits_completed: number }>()

        const yesterdayAchieved = yesterdayLog
          ? yesterdayLog.tasks_completed >= 3 || yesterdayLog.habits_completed > 0
          : false

        // Calculate streak update
        streakUpdate = calculateStreakUpdate(
          currentStreak,
          currentShields,
          yesterdayAchieved,
          true // todayAchieved is true since we have 3 completed tasks
        )

        // Update user's streak info
        if (streakUpdate.shieldConsumed) {
          await c.env.DB.prepare(
            'UPDATE users SET streak_count = ?, streak_shields = ?, shield_consumed_at = ? WHERE id = ?'
          )
            .bind(
              streakUpdate.newStreakCount,
              streakUpdate.newShields,
              streakUpdate.shieldConsumedAt,
              userId
            )
            .run()
        } else {
          await c.env.DB.prepare(
            'UPDATE users SET streak_count = ?, streak_shields = ? WHERE id = ?'
          )
            .bind(streakUpdate.newStreakCount, streakUpdate.newShields, userId)
            .run()
        }

        // Also update the daily log
        const logId = generateId()
        const existingLog = await c.env.DB.prepare(
          'SELECT id FROM daily_logs WHERE user_id = ? AND date = ?'
        )
          .bind(userId, today)
          .first<{ id: string }>()

        if (existingLog) {
          await c.env.DB.prepare(
            'UPDATE daily_logs SET tasks_completed = ? WHERE id = ?'
          )
            .bind(completedCount.count, existingLog.id)
            .run()
        } else {
          await c.env.DB.prepare(
            'INSERT INTO daily_logs (id, user_id, date, tasks_completed, habits_completed) VALUES (?, ?, ?, ?, 0)'
          )
            .bind(logId, userId, today, completedCount.count)
            .run()
        }
      }
    }
  }

  return c.json({ success: true, data: task, streakUpdate })
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
