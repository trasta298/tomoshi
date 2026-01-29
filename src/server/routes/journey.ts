import { Hono } from 'hono'
import { getLastNDays, getTodayDate, generateId } from '@shared/utils'
import { getFlameLevel } from '@shared/types'
import type { Env, DbDailyLog, DbTask, DbHabitCheck, DbUser } from '../types'
import type { JourneyDay, TodayData } from '@shared/types'

export const journeyRoutes = new Hono<{ Bindings: Env }>()

// Get today's complete data
journeyRoutes.get('/today', async (c) => {
  const { userId } = c.get('auth')
  const today = getTodayDate()

  // Get user for streak info
  const user = await c.env.DB.prepare('SELECT streak_count, streak_shields FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>()

  // Get user settings for character
  const userSettings = await c.env.DB.prepare('SELECT character_id FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ character_id: string }>()

  // Get today's tasks
  const tasksResult = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
  )
    .bind(userId, today)
    .all<DbTask>()

  // Get habits with times and checks (reuse habits route logic)
  const habitsResult = await c.env.DB.prepare(
    'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC'
  )
    .bind(userId)
    .all()

  const habits = []
  for (const habit of habitsResult.results || []) {
    const h = habit as {
      id: string
      user_id: string
      title: string
      icon: string | null
      created_at: number
    }
    const timesResult = await c.env.DB.prepare(
      'SELECT * FROM habit_times WHERE habit_id = ? ORDER BY time ASC'
    )
      .bind(h.id)
      .all()

    const times = []
    for (const time of timesResult.results || []) {
      const t = time as { id: string; habit_id: string; time: string; notification_enabled: number }
      const check = await c.env.DB.prepare(
        'SELECT * FROM habit_checks WHERE habit_time_id = ? AND date = ?'
      )
        .bind(t.id, today)
        .first<DbHabitCheck>()

      times.push({
        id: t.id,
        habit_id: t.habit_id,
        time: t.time,
        notification_enabled: !!t.notification_enabled,
        check: check
          ? {
              id: check.id,
              habit_time_id: check.habit_time_id,
              date: check.date,
              completed: !!check.completed
            }
          : undefined
      })
    }

    habits.push({
      id: h.id,
      user_id: h.user_id,
      title: h.title,
      icon: h.icon,
      created_at: h.created_at,
      times
    })
  }

  // Get moyas
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const moyasResult = await c.env.DB.prepare(
    `SELECT * FROM moyas
     WHERE user_id = ?
     AND COALESCE(extended_at, created_at) > ?
     ORDER BY created_at DESC`
  )
    .bind(userId, thirtyDaysAgo)
    .all()

  const moyas = (moyasResult.results || []).map((m) => {
    const moya = m as {
      id: string
      user_id: string
      content: string
      created_at: number
      extended_at: number | null
    }
    return {
      id: moya.id,
      user_id: moya.user_id,
      content: moya.content,
      created_at: moya.created_at,
      extended_at: moya.extended_at
    }
  })

  const streakCount = user?.streak_count || 0

  const todayData: TodayData = {
    tasks: (tasksResult.results || []).map((t) => ({
      ...t,
      completed: !!t.completed
    })),
    habits,
    moyas,
    streak: {
      count: streakCount,
      shields: user?.streak_shields || 0,
      level: getFlameLevel(streakCount)
    },
    characterId: userSettings?.character_id || 'default'
  }

  return c.json({ success: true, data: todayData })
})

// Get journey (last 30 days)
journeyRoutes.get('/history', async (c) => {
  const { userId } = c.get('auth')
  const days = getLastNDays(30)

  // Get daily logs
  const logsResult = await c.env.DB.prepare(
    'SELECT * FROM daily_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC'
  )
    .bind(userId, days[0])
    .all<DbDailyLog>()

  const logsMap = new Map<string, DbDailyLog>()
  for (const log of logsResult.results || []) {
    logsMap.set(log.date, log)
  }

  // For today, calculate from current data
  const today = getTodayDate()

  const journey: JourneyDay[] = days.map((date) => {
    const log = logsMap.get(date)
    if (log) {
      return {
        date,
        achieved: log.tasks_completed > 0 || log.habits_completed > 0,
        tasks_completed: log.tasks_completed,
        habits_completed: log.habits_completed
      }
    }
    return {
      date,
      achieved: false,
      tasks_completed: 0,
      habits_completed: 0
    }
  })

  return c.json({ success: true, data: journey })
})

// Get specific day's details
journeyRoutes.get('/day/:date', async (c) => {
  const { userId } = c.get('auth')
  const date = c.req.param('date')

  // Get tasks for this day
  const tasksResult = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
  )
    .bind(userId, date)
    .all<DbTask>()

  // Get habit checks for this day
  const checksResult = await c.env.DB.prepare(
    `SELECT hc.*, ht.time, h.title, h.icon
     FROM habit_checks hc
     JOIN habit_times ht ON hc.habit_time_id = ht.id
     JOIN habits h ON ht.habit_id = h.id
     WHERE h.user_id = ? AND hc.date = ?
     ORDER BY ht.time ASC`
  )
    .bind(userId, date)
    .all()

  return c.json({
    success: true,
    data: {
      date,
      tasks: (tasksResult.results || []).map((t) => ({
        ...t,
        completed: !!t.completed
      })),
      habitChecks: (checksResult.results || []).map((c) => {
        const check = c as {
          id: string
          completed: number
          time: string
          title: string
          icon: string | null
        }
        return {
          ...check,
          completed: !!check.completed
        }
      })
    }
  })
})

// Update daily log (called at end of day or when needed)
journeyRoutes.post('/log', async (c) => {
  const { userId } = c.get('auth')

  let date: string | undefined
  try {
    const body = await c.req.json<{ date?: string }>()
    date = body.date
  } catch {
    // Empty body is valid - date is optional
  }

  const logDate = date || getTodayDate()

  // Count completed tasks
  const tasksCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ? AND completed = 1'
  )
    .bind(userId, logDate)
    .first<{ count: number }>()

  // Count completed habit checks
  const habitsCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM habit_checks hc
     JOIN habit_times ht ON hc.habit_time_id = ht.id
     JOIN habits h ON ht.habit_id = h.id
     WHERE h.user_id = ? AND hc.date = ? AND hc.completed = 1`
  )
    .bind(userId, logDate)
    .first<{ count: number }>()

  const tasksCompleted = tasksCount?.count || 0
  const habitsCompleted = habitsCount?.count || 0

  // Upsert daily log
  const existing = await c.env.DB.prepare(
    'SELECT id FROM daily_logs WHERE user_id = ? AND date = ?'
  )
    .bind(userId, logDate)
    .first<{ id: string }>()

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE daily_logs SET tasks_completed = ?, habits_completed = ? WHERE id = ?'
    )
      .bind(tasksCompleted, habitsCompleted, existing.id)
      .run()
  } else {
    const logId = generateId()
    await c.env.DB.prepare(
      'INSERT INTO daily_logs (id, user_id, date, tasks_completed, habits_completed) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(logId, userId, logDate, tasksCompleted, habitsCompleted)
      .run()
  }

  return c.json({
    success: true,
    data: {
      date: logDate,
      tasks_completed: tasksCompleted,
      habits_completed: habitsCompleted,
      achieved: tasksCompleted > 0 || habitsCompleted > 0
    }
  })
})
