import type { DbDailyLog, DbDailyLogHabit, DbTask, DbUser, DbHabitCheck } from '../types.js'

// ==================== Types ====================

export interface TaskStats {
  total: number
  completed: number
}

export interface HabitStats {
  total: number
  completed: number
}

export interface HabitSnapshot {
  habit_id: string
  habit_time_id: string
  title: string
  icon: string | null
  time: string
  completed: number
}

export interface HabitWithTimes {
  id: string
  user_id: string
  title: string
  icon: string | null
  created_at: number
}

export interface HabitTimeWithCheck {
  id: string
  habit_id: string
  time: string
  notification_enabled: number
  check: DbHabitCheck | null
}

export interface MoyaRow {
  id: string
  user_id: string
  content: string
  created_at: number
  extended_at: number | null
}

// ==================== Task Queries ====================

export async function getTaskStats(
  db: D1Database,
  userId: string,
  date: string
): Promise<TaskStats> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as completed
       FROM tasks WHERE user_id = ? AND date = ?`
    )
    .bind(userId, date)
    .first<{ total: number; completed: number }>()

  return {
    total: result?.total ?? 0,
    completed: result?.completed ?? 0
  }
}

export async function getTasksByDate(
  db: D1Database,
  userId: string,
  date: string
): Promise<DbTask[]> {
  const result = await db
    .prepare('SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY created_at ASC')
    .bind(userId, date)
    .all<DbTask>()

  return result.results ?? []
}

// ==================== Habit Queries ====================

export async function getHabitStats(
  db: D1Database,
  userId: string,
  date: string
): Promise<HabitStats> {
  const result = await db
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

  return {
    total: result?.total ?? 0,
    completed: result?.completed ?? 0
  }
}

export async function getHabitSnapshots(
  db: D1Database,
  userId: string,
  date: string
): Promise<HabitSnapshot[]> {
  const result = await db
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
    .all<HabitSnapshot>()

  return result.results ?? []
}

export async function getHabitsWithTimesAndChecks(
  db: D1Database,
  userId: string,
  date: string
): Promise<(HabitWithTimes & { times: HabitTimeWithCheck[] })[]> {
  const habitsResult = await db
    .prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC')
    .bind(userId)
    .all<HabitWithTimes>()

  const habits: (HabitWithTimes & { times: HabitTimeWithCheck[] })[] = []

  for (const habit of habitsResult.results ?? []) {
    const timesResult = await db
      .prepare('SELECT * FROM habit_times WHERE habit_id = ? ORDER BY time ASC')
      .bind(habit.id)
      .all<{ id: string; habit_id: string; time: string; notification_enabled: number }>()

    const times: HabitTimeWithCheck[] = []
    for (const time of timesResult.results ?? []) {
      const check = await db
        .prepare('SELECT * FROM habit_checks WHERE habit_time_id = ? AND date = ?')
        .bind(time.id, date)
        .first<DbHabitCheck>()

      times.push({
        id: time.id,
        habit_id: time.habit_id,
        time: time.time,
        notification_enabled: time.notification_enabled,
        check
      })
    }

    habits.push({ ...habit, times })
  }

  return habits
}

// ==================== Daily Log Queries ====================

export async function getDailyLogByDate(
  db: D1Database,
  userId: string,
  date: string
): Promise<{ id: string } | null> {
  return db
    .prepare('SELECT id FROM daily_logs WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first<{ id: string }>()
}

export async function getDailyLogStats(
  db: D1Database,
  userId: string,
  date: string
): Promise<{ tasks_total: number; tasks_completed: number; habits_total: number; habits_completed: number } | null> {
  return db
    .prepare(
      'SELECT tasks_total, tasks_completed, habits_total, habits_completed FROM daily_logs WHERE user_id = ? AND date = ?'
    )
    .bind(userId, date)
    .first<{ tasks_total: number; tasks_completed: number; habits_total: number; habits_completed: number }>()
}

export async function getDailyLogsByDateRange(
  db: D1Database,
  userId: string,
  startDate: string
): Promise<DbDailyLog[]> {
  const result = await db
    .prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC')
    .bind(userId, startDate)
    .all<DbDailyLog>()

  return result.results ?? []
}

export async function getExistingLogDates(
  db: D1Database,
  userId: string,
  startDate: string
): Promise<Set<string>> {
  const result = await db
    .prepare('SELECT date FROM daily_logs WHERE user_id = ? AND date >= ?')
    .bind(userId, startDate)
    .all<{ date: string }>()

  return new Set((result.results ?? []).map((l) => l.date))
}

export async function insertDailyLog(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  tasksTotal: number,
  tasksCompleted: number,
  habitsTotal: number,
  habitsCompleted: number,
  achieved: boolean
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_logs (id, user_id, date, tasks_total, tasks_completed, habits_total, habits_completed, achieved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, date, tasksTotal, tasksCompleted, habitsTotal, habitsCompleted, achieved ? 1 : 0)
    .run()
}

export async function updateDailyLogStats(
  db: D1Database,
  dailyLogId: string,
  tasksTotal: number,
  tasksCompleted: number,
  habitsTotal: number,
  habitsCompleted: number,
  achieved: boolean
): Promise<void> {
  await db
    .prepare(
      `UPDATE daily_logs SET tasks_total = ?, tasks_completed = ?, habits_total = ?, habits_completed = ?, achieved = ?
       WHERE id = ?`
    )
    .bind(tasksTotal, tasksCompleted, habitsTotal, habitsCompleted, achieved ? 1 : 0, dailyLogId)
    .run()
}

export async function getDailyLogHabits(
  db: D1Database,
  dailyLogId: string
): Promise<DbDailyLogHabit[]> {
  const result = await db
    .prepare(
      `SELECT id, habit_title, habit_icon, time, completed
       FROM daily_log_habits
       WHERE daily_log_id = ?
       ORDER BY time ASC`
    )
    .bind(dailyLogId)
    .all<DbDailyLogHabit>()

  return result.results ?? []
}

export async function deleteDailyLogHabits(
  db: D1Database,
  dailyLogId: string
): Promise<D1PreparedStatement> {
  return db.prepare('DELETE FROM daily_log_habits WHERE daily_log_id = ?').bind(dailyLogId)
}

export function createInsertDailyLogHabitStatement(
  db: D1Database,
  id: string,
  dailyLogId: string,
  habitId: string,
  habitTimeId: string,
  habitTitle: string,
  habitIcon: string | null,
  time: string,
  completed: number
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO daily_log_habits (id, daily_log_id, habit_id, habit_time_id, habit_title, habit_icon, time, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, dailyLogId, habitId, habitTimeId, habitTitle, habitIcon, time, completed)
}

// ==================== User Queries ====================

export async function getUserStreakInfo(
  db: D1Database,
  userId: string
): Promise<Pick<DbUser, 'streak_count' | 'streak_shields' | 'shield_consumed_at' | 'monthly_goal'> | null> {
  return db
    .prepare('SELECT streak_count, streak_shields, shield_consumed_at, monthly_goal FROM users WHERE id = ?')
    .bind(userId)
    .first<Pick<DbUser, 'streak_count' | 'streak_shields' | 'shield_consumed_at' | 'monthly_goal'>>()
}

export async function getUserCharacter(
  db: D1Database,
  userId: string
): Promise<{ character_id: string } | null> {
  return db
    .prepare('SELECT character_id FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ character_id: string }>()
}

export async function getLastActiveDate(
  db: D1Database,
  userId: string
): Promise<string | undefined> {
  const result = await db
    .prepare('SELECT date FROM daily_logs WHERE user_id = ? AND achieved = 1 ORDER BY date DESC LIMIT 1')
    .bind(userId)
    .first<{ date: string }>()

  return result?.date
}

export async function getYesterdayAchieved(
  db: D1Database,
  userId: string,
  yesterday: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT achieved FROM daily_logs WHERE user_id = ? AND date = ?')
    .bind(userId, yesterday)
    .first<{ achieved: number }>()

  return !!result?.achieved
}

export async function updateUserStreak(
  db: D1Database,
  userId: string,
  streakCount: number,
  shields: number,
  shieldConsumedAt?: number
): Promise<void> {
  if (shieldConsumedAt !== undefined) {
    await db
      .prepare('UPDATE users SET streak_count = ?, streak_shields = ?, shield_consumed_at = ? WHERE id = ?')
      .bind(streakCount, shields, shieldConsumedAt, userId)
      .run()
  } else {
    await db
      .prepare('UPDATE users SET streak_count = ?, streak_shields = ? WHERE id = ?')
      .bind(streakCount, shields, userId)
      .run()
  }
}

// ==================== Moya Queries ====================

export async function getRecentMoyas(
  db: D1Database,
  userId: string,
  thirtyDaysAgo: number
): Promise<MoyaRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM moyas
       WHERE user_id = ?
       AND COALESCE(extended_at, created_at) > ?
       ORDER BY created_at DESC`
    )
    .bind(userId, thirtyDaysAgo)
    .all<MoyaRow>()

  return result.results ?? []
}
