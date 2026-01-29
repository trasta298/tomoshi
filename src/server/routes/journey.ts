import { Hono } from 'hono'
import {
  getLastNDays,
  getTodayDate,
  getYesterdayDate,
  generateId,
  calculateStreakUpdate,
  isDayAchieved
} from '@shared/utils'
import { getFlameLevel } from '@shared/types'
import type { Env, DbDailyLog, DbTask, DbHabitCheck, DbUser, DbDailyLogHabit } from '../types'
import type { JourneyDay, TodayData } from '@shared/types'

export const journeyRoutes = new Hono<{ Bindings: Env }>()

// ==================== 共通関数 ====================

/**
 * 指定日のdaily_logsとdaily_log_habitsを更新する
 * タスク/習慣の操作後に呼び出す
 */
export async function updateDailyLog(
  db: D1Database,
  userId: string,
  date: string
): Promise<{ achieved: boolean; dailyLogId: string }> {
  // 1. タスク集計
  const taskStats = await db
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as completed
       FROM tasks WHERE user_id = ? AND date = ?`
    )
    .bind(userId, date)
    .first<{ total: number; completed: number }>()

  // 2. 習慣集計（現在のhabit_times + habit_checksから）
  const habitStats = await db
    .prepare(
      `SELECT COUNT(ht.id) as total,
              COALESCE(SUM(CASE WHEN hc.completed = 1 THEN 1 ELSE 0 END), 0) as completed
       FROM habit_times ht
       JOIN habits h ON ht.habit_id = h.id
       LEFT JOIN habit_checks hc ON hc.habit_time_id = ht.id AND hc.date = ?
       WHERE h.user_id = ?`
    )
    .bind(date, userId)
    .first<{ total: number; completed: number }>()

  const tasksTotal = taskStats?.total || 0
  const tasksCompleted = taskStats?.completed || 0
  const habitsTotal = habitStats?.total || 0
  const habitsCompleted = habitStats?.completed || 0

  // 3. 達成判定
  const achieved = isDayAchieved(tasksTotal, tasksCompleted, habitsTotal, habitsCompleted)

  // 4. daily_logs UPSERT
  let dailyLogId: string
  const existing = await db
    .prepare('SELECT id FROM daily_logs WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first<{ id: string }>()

  if (existing) {
    dailyLogId = existing.id
    await db
      .prepare(
        `UPDATE daily_logs SET tasks_total = ?, tasks_completed = ?, habits_total = ?, habits_completed = ?, achieved = ?
         WHERE id = ?`
      )
      .bind(tasksTotal, tasksCompleted, habitsTotal, habitsCompleted, achieved ? 1 : 0, dailyLogId)
      .run()
  } else {
    dailyLogId = generateId()
    await db
      .prepare(
        `INSERT INTO daily_logs (id, user_id, date, tasks_total, tasks_completed, habits_total, habits_completed, achieved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        dailyLogId,
        userId,
        date,
        tasksTotal,
        tasksCompleted,
        habitsTotal,
        habitsCompleted,
        achieved ? 1 : 0
      )
      .run()
  }

  // 5. daily_log_habits 再作成（DELETE → INSERT）
  // 習慣が0個の場合はスキップ
  if (habitsTotal > 0) {
    const habits = await db
      .prepare(
        `SELECT h.id as habit_id, ht.id as habit_time_id, h.title, h.icon, ht.time,
                COALESCE(hc.completed, 0) as completed
         FROM habit_times ht
         JOIN habits h ON ht.habit_id = h.id
         LEFT JOIN habit_checks hc ON hc.habit_time_id = ht.id AND hc.date = ?
         WHERE h.user_id = ?
         ORDER BY ht.time ASC`
      )
      .bind(date, userId)
      .all<{
        habit_id: string
        habit_time_id: string
        title: string
        icon: string | null
        time: string
        completed: number
      }>()

    // D1のbatch()でトランザクション化
    const statements: D1PreparedStatement[] = [
      db.prepare('DELETE FROM daily_log_habits WHERE daily_log_id = ?').bind(dailyLogId)
    ]

    for (const h of habits.results || []) {
      statements.push(
        db
          .prepare(
            `INSERT INTO daily_log_habits (id, daily_log_id, habit_id, habit_time_id, habit_title, habit_icon, time, completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(generateId(), dailyLogId, h.habit_id, h.habit_time_id, h.title, h.icon, h.time, h.completed)
      )
    }

    await db.batch(statements)
  } else {
    // 習慣が0個の場合、既存のdaily_log_habitsを削除
    await db.prepare('DELETE FROM daily_log_habits WHERE daily_log_id = ?').bind(dailyLogId).run()
  }

  return { achieved, dailyLogId }
}

/**
 * 過去の未確定日を確定する
 * 習慣追加/削除の「前」に呼び出して、古い習慣設定で過去を確定する
 */
export async function confirmPendingDays(db: D1Database, userId: string): Promise<void> {
  const today = getTodayDate()
  const days = getLastNDays(30)

  // 既存のdaily_logsの日付を取得
  const existingLogs = await db
    .prepare('SELECT date FROM daily_logs WHERE user_id = ? AND date >= ?')
    .bind(userId, days[0])
    .all<{ date: string }>()

  const existingDates = new Set((existingLogs.results || []).map((l) => l.date))

  // 未確定日を特定: daily_logsがない日（当日は除外）
  const pendingDates = days.filter((date) => date !== today && !existingDates.has(date))

  if (pendingDates.length === 0) {
    return
  }

  // 未確定日を全て確定（現在のhabit_timesでスナップショット）
  await Promise.all(pendingDates.map((date) => updateDailyLog(db, userId, date)))
}

// Get today's complete data
journeyRoutes.get('/today', async (c) => {
  const { userId } = c.get('auth')
  const today = getTodayDate()

  // 未操作日の自動確定処理
  await confirmPendingDays(c.env.DB, userId)

  // Get user for streak info and monthly goal
  const user = await c.env.DB.prepare(
    'SELECT streak_count, streak_shields, shield_consumed_at, monthly_goal FROM users WHERE id = ?'
  )
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
  const shieldConsumedAt = user?.shield_consumed_at || undefined

  // Get last active date (most recent day with achievement)
  const lastActiveLog = await c.env.DB.prepare(
    'SELECT date FROM daily_logs WHERE user_id = ? AND achieved = 1 ORDER BY date DESC LIMIT 1'
  )
    .bind(userId)
    .first<{ date: string }>()

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
      level: getFlameLevel(streakCount),
      shieldConsumedAt,
      lastActiveDate: lastActiveLog?.date
    },
    characterId: userSettings?.character_id || 'default',
    monthlyGoal: user?.monthly_goal
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

  const journey: JourneyDay[] = days.map((date) => {
    const log = logsMap.get(date)
    if (log) {
      return {
        date,
        achieved: !!log.achieved,
        tasks_completed: log.tasks_completed,
        habits_completed: log.habits_completed,
        tasks_total: log.tasks_total,
        habits_total: log.habits_total
      }
    }
    return {
      date,
      achieved: false,
      tasks_completed: 0,
      habits_completed: 0,
      tasks_total: 0,
      habits_total: 0
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

  // daily_log_habitsから習慣スナップショットを取得
  const dailyLog = await c.env.DB.prepare(
    'SELECT id FROM daily_logs WHERE user_id = ? AND date = ?'
  )
    .bind(userId, date)
    .first<{ id: string }>()

  let habitChecks: { id: string; title: string; icon: string | null; time: string; completed: boolean }[] = []

  if (dailyLog) {
    // daily_log_habitsがある場合はそこから取得（スナップショット）
    const habitsResult = await c.env.DB.prepare(
      `SELECT id, habit_title, habit_icon, time, completed
       FROM daily_log_habits
       WHERE daily_log_id = ?
       ORDER BY time ASC`
    )
      .bind(dailyLog.id)
      .all<DbDailyLogHabit>()

    habitChecks = (habitsResult.results || []).map((h) => ({
      id: h.id,
      title: h.habit_title,
      icon: h.habit_icon,
      time: h.time,
      completed: !!h.completed
    }))
  }

  return c.json({
    success: true,
    data: {
      date,
      tasks: (tasksResult.results || []).map((t) => ({
        ...t,
        completed: !!t.completed
      })),
      habitChecks
    }
  })
})

// Update daily log and calculate streak (called when task/habit is completed)
journeyRoutes.post('/log', async (c) => {
  const { userId } = c.get('auth')

  let date: string | undefined
  let updateStreak = false
  try {
    const body = await c.req.json<{ date?: string; updateStreak?: boolean }>()
    date = body.date
    updateStreak = body.updateStreak ?? false
  } catch {
    // Empty body is valid - date is optional
  }

  const logDate = date || getTodayDate()

  // updateDailyLog() を使用してdaily_logsとdaily_log_habitsを更新
  let todayAchieved: boolean
  try {
    const result = await updateDailyLog(c.env.DB, userId, logDate)
    todayAchieved = result.achieved
  } catch (error) {
    console.error('Failed to update daily log:', error)
    return c.json({ success: false, error: 'Failed to update daily log' }, 500)
  }

  // 集計結果を取得（レスポンス用）
  const log = await c.env.DB.prepare(
    'SELECT tasks_total, tasks_completed, habits_total, habits_completed FROM daily_logs WHERE user_id = ? AND date = ?'
  )
    .bind(userId, logDate)
    .first<{ tasks_total: number; tasks_completed: number; habits_total: number; habits_completed: number }>()

  // updateDailyLog成功後なのでlogは存在するはずだが、念のためフォールバック
  const tasksCompleted = log?.tasks_completed ?? 0
  const habitsCompleted = log?.habits_completed ?? 0

  // Calculate and update streak if requested and today is achieved
  let streakUpdate = null
  if (updateStreak && todayAchieved) {
    // Get current user streak info
    const user = await c.env.DB.prepare(
      'SELECT streak_count, streak_shields FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<{ streak_count: number; streak_shields: number }>()

    const currentStreak = user?.streak_count || 0
    const currentShields = user?.streak_shields || 0

    // 昨日の達成判定をdaily_logs.achievedカラムから取得
    const yesterday = getYesterdayDate()
    const yesterdayLog = await c.env.DB.prepare(
      'SELECT achieved FROM daily_logs WHERE user_id = ? AND date = ?'
    )
      .bind(userId, yesterday)
      .first<{ achieved: number }>()

    const yesterdayAchieved = !!yesterdayLog?.achieved

    // Calculate streak update
    streakUpdate = calculateStreakUpdate(
      currentStreak,
      currentShields,
      yesterdayAchieved,
      todayAchieved
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
  }

  return c.json({
    success: true,
    data: {
      date: logDate,
      tasks_completed: tasksCompleted,
      habits_completed: habitsCompleted,
      achieved: todayAchieved,
      streakUpdate
    }
  })
})
