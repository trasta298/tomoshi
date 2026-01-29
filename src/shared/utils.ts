// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Get today's date string (YYYY-MM-DD)
export function getTodayDate(timezone = 'Asia/Tokyo'): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: timezone })
}

// Parse date string to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

// Format time for display (HH:mm)
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

// Check if date is today
export function isToday(dateStr: string, timezone = 'Asia/Tokyo'): boolean {
  return dateStr === getTodayDate(timezone)
}

// Get days between two dates
export function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

// Get last N days as array of date strings
export function getLastNDays(n: number, timezone = 'Asia/Tokyo'): string[] {
  const days: string[] = []
  const today = new Date()

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('sv-SE', { timeZone: timezone }))
  }

  return days
}

// Session token generation
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Cookie parsing
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=')
      return [key, v.join('=')]
    })
  )
}

// Get yesterday's date string (YYYY-MM-DD)
export function getYesterdayDate(timezone = 'Asia/Tokyo'): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toLocaleDateString('sv-SE', { timeZone: timezone })
}

// Get tomorrow's date string (YYYY-MM-DD)
export function getTomorrowDate(timezone = 'Asia/Tokyo'): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('sv-SE', { timeZone: timezone })
}

// Daily achievement calculation
// 達成条件: タスク全完了 AND 習慣全完了 AND (タスクか習慣が1つ以上ある)
export function isDayAchieved(
  tasksTotal: number,
  tasksCompleted: number,
  habitsTotal: number,
  habitsCompleted: number
): boolean {
  // どちらも0個の場合は未達成
  if (tasksTotal === 0 && habitsTotal === 0) {
    return false
  }

  // タスクが全完了かどうか（0個の場合はOK）
  const tasksAllDone = tasksTotal === 0 || tasksCompleted >= tasksTotal

  // 習慣が全完了かどうか（0個の場合はOK）
  const habitsAllDone = habitsTotal === 0 || habitsCompleted >= habitsTotal

  return tasksAllDone && habitsAllDone
}

// Streak calculation result
export interface StreakUpdate {
  newStreakCount: number
  newShields: number
  shieldConsumed: boolean
  shieldConsumedAt?: number
  shieldAwarded: boolean
}

// Maximum shields a user can have
export const MAX_SHIELDS = 3

// Calculate streak update based on previous day's achievement
export function calculateStreakUpdate(
  currentStreak: number,
  currentShields: number,
  yesterdayAchieved: boolean,
  todayAchieved: boolean
): StreakUpdate {
  // If today not achieved yet, no update
  if (!todayAchieved) {
    return {
      newStreakCount: currentStreak,
      newShields: currentShields,
      shieldConsumed: false,
      shieldAwarded: false
    }
  }

  // If yesterday was achieved, continue streak
  if (yesterdayAchieved) {
    const newStreak = currentStreak + 1
    // Award shield every 7 days (at 7, 14, 21, etc.)
    const shieldAwarded = newStreak > 0 && newStreak % 7 === 0 && currentShields < MAX_SHIELDS
    return {
      newStreakCount: newStreak,
      newShields: shieldAwarded ? currentShields + 1 : currentShields,
      shieldConsumed: false,
      shieldAwarded
    }
  }

  // Yesterday not achieved - check if we can use a shield
  if (currentShields > 0) {
    // Use shield to protect streak, then increment
    const newStreak = currentStreak + 1
    const newShields = currentShields - 1
    // Still check for 7-day bonus (though unlikely since we just used a shield)
    const shieldAwarded = newStreak > 0 && newStreak % 7 === 0 && newShields < MAX_SHIELDS
    return {
      newStreakCount: newStreak,
      newShields: shieldAwarded ? newShields + 1 : newShields,
      shieldConsumed: true,
      shieldConsumedAt: Date.now(),
      shieldAwarded
    }
  }

  // No shield, streak resets to 1
  return {
    newStreakCount: 1,
    newShields: currentShields,
    shieldConsumed: false,
    shieldAwarded: false
  }
}
