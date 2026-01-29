import { Hono } from 'hono'
import { generateId, getTodayDate } from '@shared/utils'
import type { Env, DbHabit, DbHabitTime, DbHabitCheck } from '../types'
import type { Habit, HabitTime, HabitCheck, HabitTimeWithCheck } from '@shared/types'
import { syncUserNotifications } from '../notification-sync'
import { confirmPendingDays, updateDailyLog } from './journey'

export const habitsRoutes = new Hono<{ Bindings: Env }>()

// Get all habits with times and today's checks
habitsRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')
  const date = c.req.query('date') || getTodayDate()

  // Get habits
  const habits = await c.env.DB.prepare(
    'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC'
  )
    .bind(userId)
    .all<DbHabit>()

  const result: (Habit & { times: HabitTimeWithCheck[] })[] = []

  for (const habit of habits.results || []) {
    // Get times for this habit
    const times = await c.env.DB.prepare(
      'SELECT * FROM habit_times WHERE habit_id = ? ORDER BY time ASC'
    )
      .bind(habit.id)
      .all<DbHabitTime>()

    const timesWithChecks: HabitTimeWithCheck[] = []

    for (const time of times.results || []) {
      // Get check for this time and date
      const check = await c.env.DB.prepare(
        'SELECT * FROM habit_checks WHERE habit_time_id = ? AND date = ?'
      )
        .bind(time.id, date)
        .first<DbHabitCheck>()

      timesWithChecks.push({
        id: time.id,
        habit_id: time.habit_id,
        time: time.time,
        notification_enabled: !!time.notification_enabled,
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

    result.push({
      id: habit.id,
      user_id: habit.user_id,
      title: habit.title,
      icon: habit.icon,
      created_at: habit.created_at,
      times: timesWithChecks
    })
  }

  return c.json({ success: true, data: result })
})

// Create habit
habitsRoutes.post('/', async (c) => {
  const { userId } = c.get('auth')
  const { title, icon, times } = await c.req.json<{
    title: string
    icon?: string
    times: string[]
  }>()

  if (!title || title.length === 0 || title.length > 50) {
    return c.json({ success: false, error: 'Invalid title' }, 400)
  }

  if (!times || times.length === 0 || times.length > 5) {
    return c.json({ success: false, error: 'Must have 1-5 times' }, 400)
  }

  // Check max 3 habits
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM habits WHERE user_id = ?'
  )
    .bind(userId)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 3) {
    return c.json({ success: false, error: 'Maximum 3 habits' }, 400)
  }

  // 習慣追加「前」に過去の未確定日を確定（古い習慣設定でスナップショット）
  await confirmPendingDays(c.env.DB, userId)

  const habitId = generateId()
  const now = Date.now()

  await c.env.DB.prepare(
    'INSERT INTO habits (id, user_id, title, icon, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(habitId, userId, title, icon || null, now)
    .run()

  // Create times
  const createdTimes: HabitTime[] = []
  for (const time of times) {
    const timeId = generateId()
    await c.env.DB.prepare(
      'INSERT INTO habit_times (id, habit_id, time, notification_enabled) VALUES (?, ?, ?, 1)'
    )
      .bind(timeId, habitId, time)
      .run()

    createdTimes.push({
      id: timeId,
      habit_id: habitId,
      time,
      notification_enabled: true
    })
  }

  const habit: Habit & { times: HabitTime[] } = {
    id: habitId,
    user_id: userId,
    title,
    icon: icon || null,
    created_at: now,
    times: createdTimes
  }

  // 当日を新しい習慣設定で更新
  const today = getTodayDate()
  await updateDailyLog(c.env.DB, userId, today)

  // Durable Objectに通知スケジュールを同期
  await syncUserNotifications(c.env, userId)

  return c.json({ success: true, data: habit }, 201)
})

// Update habit
habitsRoutes.patch('/:id', async (c) => {
  const { userId } = c.get('auth')
  const habitId = c.req.param('id')
  const updates = await c.req.json<{ title?: string; icon?: string }>()

  // Verify ownership
  const existing = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first<DbHabit>()

  if (!existing) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  const fields: string[] = []
  const values: (string | null)[] = []

  if (updates.title !== undefined) {
    if (updates.title.length === 0 || updates.title.length > 50) {
      return c.json({ success: false, error: 'Invalid title' }, 400)
    }
    fields.push('title = ?')
    values.push(updates.title)
  }

  if (updates.icon !== undefined) {
    fields.push('icon = ?')
    values.push(updates.icon || null)
  }

  if (fields.length === 0) {
    return c.json({ success: false, error: 'No updates provided' }, 400)
  }

  values.push(habitId)

  await c.env.DB.prepare(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  // 当日のスナップショットを更新（タイトル/アイコンが変わる）
  const today = getTodayDate()
  await updateDailyLog(c.env.DB, userId, today)

  // タイトル変更時はDurable Objectに同期（通知メッセージに影響）
  if (updates.title !== undefined) {
    await syncUserNotifications(c.env, userId)
  }

  return c.json({ success: true })
})

// Delete habit
habitsRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const habitId = c.req.param('id')

  // 習慣削除「前」に過去の未確定日を確定（削除前の習慣設定でスナップショット）
  await confirmPendingDays(c.env.DB, userId)

  const result = await c.env.DB.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .run()

  if (!result.meta.changes) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  // 当日を新しい習慣設定で更新
  const today = getTodayDate()
  await updateDailyLog(c.env.DB, userId, today)

  // Durable Objectに通知スケジュールを同期（削除した習慣の通知を除去）
  await syncUserNotifications(c.env, userId)

  return c.json({ success: true })
})

// Add time to habit
habitsRoutes.post('/:id/times', async (c) => {
  const { userId } = c.get('auth')
  const habitId = c.req.param('id')
  const { time } = await c.req.json<{ time: string }>()

  // Verify ownership
  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first<DbHabit>()

  if (!habit) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  // Check max 5 times
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM habit_times WHERE habit_id = ?'
  )
    .bind(habitId)
    .first<{ count: number }>()

  if (countResult && countResult.count >= 5) {
    return c.json({ success: false, error: 'Maximum 5 times per habit' }, 400)
  }

  // 時刻チップ追加「前」に過去の未確定日を確定
  await confirmPendingDays(c.env.DB, userId)

  const timeId = generateId()

  await c.env.DB.prepare(
    'INSERT INTO habit_times (id, habit_id, time, notification_enabled) VALUES (?, ?, ?, 1)'
  )
    .bind(timeId, habitId, time)
    .run()

  const habitTime: HabitTime = {
    id: timeId,
    habit_id: habitId,
    time,
    notification_enabled: true
  }

  // 当日を新しい習慣設定で更新
  const today = getTodayDate()
  await updateDailyLog(c.env.DB, userId, today)

  // Durable Objectに通知スケジュールを同期
  await syncUserNotifications(c.env, userId)

  return c.json({ success: true, data: habitTime }, 201)
})

// Update habit time
habitsRoutes.patch('/:habitId/times/:timeId', async (c) => {
  const { userId } = c.get('auth')
  const habitId = c.req.param('habitId')
  const timeId = c.req.param('timeId')
  const updates = await c.req.json<{ time?: string; notification_enabled?: boolean }>()

  // Verify ownership
  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first<DbHabit>()

  if (!habit) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.time !== undefined) {
    fields.push('time = ?')
    values.push(updates.time)
  }

  if (updates.notification_enabled !== undefined) {
    fields.push('notification_enabled = ?')
    values.push(updates.notification_enabled ? 1 : 0)
  }

  if (fields.length === 0) {
    return c.json({ success: false, error: 'No updates provided' }, 400)
  }

  values.push(timeId)
  values.push(habitId)

  await c.env.DB.prepare(
    `UPDATE habit_times SET ${fields.join(', ')} WHERE id = ? AND habit_id = ?`
  )
    .bind(...values)
    .run()

  // 時刻変更時はスナップショットの時刻も更新（habits_totalは変わらないのでconfirmPendingDaysは不要）
  if (updates.time !== undefined) {
    const today = getTodayDate()
    await updateDailyLog(c.env.DB, userId, today)
  }

  // Durable Objectに通知スケジュールを同期
  await syncUserNotifications(c.env, userId)

  return c.json({ success: true })
})

// Delete habit time
habitsRoutes.delete('/:habitId/times/:timeId', async (c) => {
  const { userId } = c.get('auth')
  const habitId = c.req.param('habitId')
  const timeId = c.req.param('timeId')

  // Verify ownership
  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first<DbHabit>()

  if (!habit) {
    return c.json({ success: false, error: 'Habit not found' }, 404)
  }

  // Check at least 1 time remains
  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM habit_times WHERE habit_id = ?'
  )
    .bind(habitId)
    .first<{ count: number }>()

  if (countResult && countResult.count <= 1) {
    return c.json({ success: false, error: 'Must have at least 1 time' }, 400)
  }

  // 時刻チップ削除「前」に過去の未確定日を確定
  await confirmPendingDays(c.env.DB, userId)

  await c.env.DB.prepare('DELETE FROM habit_times WHERE id = ? AND habit_id = ?')
    .bind(timeId, habitId)
    .run()

  // 当日を新しい習慣設定で更新
  const today = getTodayDate()
  await updateDailyLog(c.env.DB, userId, today)

  // Durable Objectに通知スケジュールを同期
  await syncUserNotifications(c.env, userId)

  return c.json({ success: true })
})

// Toggle habit check
habitsRoutes.post('/times/:timeId/check', async (c) => {
  const { userId } = c.get('auth')
  const timeId = c.req.param('timeId')
  const { date, completed } = await c.req.json<{ date?: string; completed: boolean }>()

  const checkDate = date || getTodayDate()

  // Verify ownership through habit_times -> habits
  const time = await c.env.DB.prepare(
    `SELECT ht.* FROM habit_times ht
     JOIN habits h ON ht.habit_id = h.id
     WHERE ht.id = ? AND h.user_id = ?`
  )
    .bind(timeId, userId)
    .first<DbHabitTime>()

  if (!time) {
    return c.json({ success: false, error: 'Time not found' }, 404)
  }

  // Check if record exists
  const existing = await c.env.DB.prepare(
    'SELECT * FROM habit_checks WHERE habit_time_id = ? AND date = ?'
  )
    .bind(timeId, checkDate)
    .first<DbHabitCheck>()

  let checkData: HabitCheck
  if (existing) {
    await c.env.DB.prepare('UPDATE habit_checks SET completed = ? WHERE id = ?')
      .bind(completed ? 1 : 0, existing.id)
      .run()

    checkData = { ...existing, completed }
  } else {
    const checkId = generateId()
    await c.env.DB.prepare(
      'INSERT INTO habit_checks (id, habit_time_id, date, completed) VALUES (?, ?, ?, ?)'
    )
      .bind(checkId, timeId, checkDate, completed ? 1 : 0)
      .run()

    checkData = {
      id: checkId,
      habit_time_id: timeId,
      date: checkDate,
      completed
    }
  }

  // 習慣チェック後にdaily_logを更新（習慣設定は変わらないのでconfirmPendingDaysは不要）
  await updateDailyLog(c.env.DB, userId, checkDate)

  return c.json({ success: true, data: checkData }, existing ? 200 : 201)
})
