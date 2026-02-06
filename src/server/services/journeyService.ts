import {
  getLastNDays,
  getTodayDate,
  getYesterdayDate,
  getDateRange,
  parseDate,
  generateId,
  calculateStreakUpdate,
  isDayAchieved
} from '@shared/utils'
import { getFlameLevel } from '@shared/types'
import type { JourneyDay, TodayData, Task, Moya, Habit, HabitTimeWithCheck } from '@shared/types'
import * as repo from '../repositories/journeyRepository.js'

// ==================== Types ====================

export interface DailyLogResult {
  achieved: boolean
  dailyLogId: string
}

export interface StreakUpdateResult {
  newStreakCount: number
  newShields: number
  shieldConsumed: boolean
  shieldConsumedAt?: number
}

export interface LogUpdateResult {
  date: string
  tasks_completed: number
  habits_completed: number
  achieved: boolean
  streakUpdate: StreakUpdateResult | null
}

// ==================== Core Business Logic ====================

/**
 * Update only task-related fields in daily_logs.
 * Does NOT touch daily_log_habits to preserve historical habit snapshots.
 * Used when carrying over or deleting tasks from past dates.
 */
export async function updateDailyLogTasks(
  db: D1Database,
  userId: string,
  date: string
): Promise<void> {
  const taskStats = await repo.getTaskStats(db, userId, date)

  // Use getDailyLogStats to get existing log with habit info
  const existing = await repo.getDailyLogStats(db, userId, date)

  if (existing) {
    // Existing log: update only task info, preserve habit info
    const achieved = isDayAchieved(
      taskStats.total,
      taskStats.completed,
      existing.habits_total,
      existing.habits_completed
    )
    await db
      .prepare(
        `UPDATE daily_logs
         SET tasks_total = ?, tasks_completed = ?, achieved = ?
         WHERE user_id = ? AND date = ?`
      )
      .bind(taskStats.total, taskStats.completed, achieved ? 1 : 0, userId, date)
      .run()
  } else {
    // No existing log: create with task info only (habits = 0)
    const achieved = isDayAchieved(taskStats.total, taskStats.completed, 0, 0)
    const dailyLogId = generateId()
    await repo.insertDailyLog(
      db,
      dailyLogId,
      userId,
      date,
      taskStats.total,
      taskStats.completed,
      0, // habits_total
      0, // habits_completed
      achieved
    )
  }
}

/**
 * Update daily_logs and daily_log_habits for a specific date.
 * Called after task/habit operations.
 */
export async function updateDailyLog(
  db: D1Database,
  userId: string,
  date: string
): Promise<DailyLogResult> {
  const [taskStats, habitStats] = await Promise.all([
    repo.getTaskStats(db, userId, date),
    repo.getHabitStats(db, userId, date)
  ])

  const achieved = isDayAchieved(
    taskStats.total,
    taskStats.completed,
    habitStats.total,
    habitStats.completed
  )

  const dailyLogId = await upsertDailyLog(
    db,
    userId,
    date,
    taskStats,
    habitStats,
    achieved
  )

  await updateDailyLogHabits(db, userId, date, dailyLogId, habitStats.total)

  return { achieved, dailyLogId }
}

/**
 * Confirm pending days before habit configuration changes.
 * This preserves historical habit snapshots with old settings.
 */
export async function confirmPendingDays(db: D1Database, userId: string): Promise<void> {
  const today = getTodayDate()
  const days = getLastNDays(30)

  const existingDates = await repo.getExistingLogDates(db, userId, days[0])
  const pendingDates = days.filter((date) => date !== today && !existingDates.has(date))

  if (pendingDates.length === 0) {
    return
  }

  await Promise.all(pendingDates.map((date) => updateDailyLog(db, userId, date)))
}

// ==================== Data Retrieval ====================

/**
 * Get today's complete data including tasks, habits, moyas, and streak info.
 * Streak is calculated once per day on app startup based on yesterday's achievement.
 */
export async function getTodayData(db: D1Database, userId: string): Promise<TodayData> {
  const today = getTodayDate()

  await confirmPendingDays(db, userId)
  await ensureStreakCalculatedToday(db, userId)

  // Fetch all data (user re-fetched to get updated streak)
  const [user, userSettings, tasks, habits, moyas, lastActiveDate, todayLog] = await Promise.all([
    repo.getUserStreakInfo(db, userId),
    repo.getUserCharacter(db, userId),
    repo.getTasksByDate(db, userId, today),
    repo.getHabitsWithTimesAndChecks(db, userId, today),
    repo.getRecentMoyas(db, userId, Date.now() - 30 * 24 * 60 * 60 * 1000),
    repo.getLastActiveDate(db, userId),
    repo.getDailyLogStats(db, userId, today)
  ])

  const displayStreak = computeDisplayStreak(user?.streak_count ?? 0, todayLog)

  return {
    tasks: transformTasks(tasks),
    habits: transformHabits(habits),
    moyas: transformMoyas(moyas),
    streak: {
      count: displayStreak,
      shields: user?.streak_shields ?? 0,
      level: getFlameLevel(displayStreak),
      shieldConsumedAt: user?.shield_consumed_at ?? undefined,
      lastActiveDate
    },
    characterId: userSettings?.character_id ?? 'default',
    monthlyGoal: user?.monthly_goal
  }
}

/**
 * Get journey history for the last 30 days, including display streak.
 */
export async function getJourneyHistory(
  db: D1Database,
  userId: string
): Promise<{ days: JourneyDay[]; streak: { count: number; shields: number } }> {
  const today = getTodayDate()
  const days = getLastNDays(30)

  // confirmPendingDays is NOT called here (concurrent INSERT prevention).
  // Missing daily_logs are safely treated as "not achieved".
  await ensureStreakCalculatedToday(db, userId)

  const [logs, user] = await Promise.all([
    repo.getDailyLogsByDateRange(db, userId, days[0]),
    repo.getUserStreakInfo(db, userId)
  ])

  const logsMap = new Map(logs.map((log) => [log.date, log]))

  const displayStreak = computeDisplayStreak(user?.streak_count ?? 0, logsMap.get(today) ?? null)

  const journeyDays = days.map((date) => {
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

  return {
    days: journeyDays,
    streak: {
      count: displayStreak,
      shields: user?.streak_shields ?? 0
    }
  }
}

/**
 * Get specific day's details including tasks and habit checks.
 */
export async function getDayDetails(
  db: D1Database,
  userId: string,
  date: string
): Promise<{
  date: string
  tasks: Task[]
  habitChecks: { id: string; title: string; icon: string | null; time: string; completed: boolean }[]
}> {
  const [tasks, dailyLog] = await Promise.all([
    repo.getTasksByDate(db, userId, date),
    repo.getDailyLogByDate(db, userId, date)
  ])

  let habitChecks: { id: string; title: string; icon: string | null; time: string; completed: boolean }[] = []

  if (dailyLog) {
    const habits = await repo.getDailyLogHabits(db, dailyLog.id)
    habitChecks = habits.map((h) => ({
      id: h.id,
      title: h.habit_title,
      icon: h.habit_icon,
      time: h.time,
      completed: !!h.completed
    }))
  }

  return {
    date,
    tasks: transformTasks(tasks),
    habitChecks
  }
}

/**
 * Update daily log (streak is calculated on app startup, not here).
 */
export async function updateLogAndStreak(
  db: D1Database,
  userId: string,
  date: string
): Promise<LogUpdateResult> {
  const { achieved } = await updateDailyLog(db, userId, date)

  const logStats = await repo.getDailyLogStats(db, userId, date)
  const tasksCompleted = logStats?.tasks_completed ?? 0
  const habitsCompleted = logStats?.habits_completed ?? 0

  // Streak update is now handled by getTodayData on app startup
  return {
    date,
    tasks_completed: tasksCompleted,
    habits_completed: habitsCompleted,
    achieved,
    streakUpdate: null
  }
}

// ==================== Private Helpers ====================

function computeDisplayStreak(
  baseStreak: number,
  todayLog: { tasks_total: number; tasks_completed: number; habits_total: number; habits_completed: number } | null
): number {
  const todayAchieved = todayLog
    ? isDayAchieved(todayLog.tasks_total, todayLog.tasks_completed, todayLog.habits_total, todayLog.habits_completed)
    : false
  return baseStreak + (todayAchieved ? 1 : 0)
}

async function ensureStreakCalculatedToday(db: D1Database, userId: string): Promise<void> {
  const today = getTodayDate()
  const user = await repo.getUserStreakInfo(db, userId)
  if (user?.streak_calculated_date !== today) {
    await calculateAndUpdateStreak(db, userId, today)
  }
}

async function upsertDailyLog(
  db: D1Database,
  userId: string,
  date: string,
  taskStats: repo.TaskStats,
  habitStats: repo.HabitStats,
  achieved: boolean
): Promise<string> {
  const existing = await repo.getDailyLogByDate(db, userId, date)

  if (existing) {
    await repo.updateDailyLogStats(
      db,
      existing.id,
      taskStats.total,
      taskStats.completed,
      habitStats.total,
      habitStats.completed,
      achieved
    )
    return existing.id
  }

  const dailyLogId = generateId()
  await repo.insertDailyLog(
    db,
    dailyLogId,
    userId,
    date,
    taskStats.total,
    taskStats.completed,
    habitStats.total,
    habitStats.completed,
    achieved
  )
  return dailyLogId
}

async function updateDailyLogHabits(
  db: D1Database,
  userId: string,
  date: string,
  dailyLogId: string,
  habitsTotal: number
): Promise<void> {
  if (habitsTotal === 0) {
    await db.prepare('DELETE FROM daily_log_habits WHERE daily_log_id = ?').bind(dailyLogId).run()
    return
  }

  const habits = await repo.getHabitSnapshots(db, userId, date)

  const statements: D1PreparedStatement[] = [
    await repo.deleteDailyLogHabits(db, dailyLogId)
  ]

  for (const h of habits) {
    statements.push(
      repo.createInsertDailyLogHabitStatement(
        db,
        generateId(),
        dailyLogId,
        h.habit_id,
        h.habit_time_id,
        h.title,
        h.icon,
        h.time,
        h.completed
      )
    )
  }

  await db.batch(statements)
}

async function calculateAndUpdateStreak(
  db: D1Database,
  userId: string,
  today: string
): Promise<void> {
  const user = await db
    .prepare('SELECT streak_count, streak_shields, streak_calculated_date FROM users WHERE id = ?')
    .bind(userId)
    .first<{ streak_count: number; streak_shields: number; streak_calculated_date: string | null }>()

  let currentStreak = user?.streak_count ?? 0
  let currentShields = user?.streak_shields ?? 0
  let shieldConsumedAt: number | null = null
  const lastCalc = user?.streak_calculated_date
  const yesterday = getYesterdayDate()

  // Determine days to process: from lastCalc+1 through yesterday
  let daysToProcess: string[]
  if (!lastCalc) {
    // New user: process yesterday only
    daysToProcess = [yesterday]
  } else {
    const lastCalcDate = parseDate(lastCalc)
    const nextDay = new Date(lastCalcDate)
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    if (nextDayStr > yesterday) {
      daysToProcess = []
    } else {
      daysToProcess = getDateRange(nextDayStr, yesterday)
    }
  }

  if (daysToProcess.length === 0) {
    // No days to process but update streak_calculated_date
    await db.prepare('UPDATE users SET streak_calculated_date = ? WHERE id = ? AND (streak_calculated_date IS NULL OR streak_calculated_date != ?)')
      .bind(today, userId, today).run()
    return
  }

  // Batch fetch daily_logs for the range
  const logs = await repo.getDailyLogsByDateRange(db, userId, daysToProcess[0])
  const logsMap = new Map(logs.map(log => [log.date, log]))

  // Process each day sequentially
  for (const day of daysToProcess) {
    const log = logsMap.get(day)
    const dayAchieved = log ? !!log.achieved : false
    const update = calculateStreakUpdate(currentStreak, currentShields, dayAchieved)
    currentStreak = update.newStreakCount
    currentShields = update.newShields
    if (update.shieldConsumed) {
      shieldConsumedAt = update.shieldConsumedAt ?? null
    }
    // No early break: streak can restart after reset
  }

  // CAS update to prevent race conditions
  await db.prepare(`UPDATE users SET
    streak_count = ?, streak_shields = ?, streak_calculated_date = ?, shield_consumed_at = ?
    WHERE id = ? AND (streak_calculated_date IS NULL OR streak_calculated_date != ?)`)
    .bind(currentStreak, currentShields, today, shieldConsumedAt, userId, today).run()
}

// ==================== Transform Functions ====================

function transformTasks(tasks: repo.TaskStats extends never ? never : Awaited<ReturnType<typeof repo.getTasksByDate>>): Task[] {
  return tasks.map((t) => ({
    ...t,
    completed: !!t.completed
  }))
}

function transformHabits(
  habits: Awaited<ReturnType<typeof repo.getHabitsWithTimesAndChecks>>
): (Habit & { times: HabitTimeWithCheck[] })[] {
  return habits.map((h) => ({
    id: h.id,
    user_id: h.user_id,
    title: h.title,
    icon: h.icon,
    created_at: h.created_at,
    times: h.times.map((t) => ({
      id: t.id,
      habit_id: t.habit_id,
      time: t.time,
      notification_enabled: !!t.notification_enabled,
      check: t.check
        ? {
            id: t.check.id,
            habit_time_id: t.check.habit_time_id,
            date: t.check.date,
            completed: !!t.check.completed
          }
        : undefined
    }))
  }))
}

function transformMoyas(moyas: repo.MoyaRow[]): Moya[] {
  return moyas.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    content: m.content,
    created_at: m.created_at,
    extended_at: m.extended_at
  }))
}
