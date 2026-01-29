// User
export interface User {
  id: string
  created_at: number
  monthly_goal: string | null
  streak_count: number
  streak_shields: number
}

// Credential (Passkey)
export interface Credential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  created_at: number
}

// Task
export interface Task {
  id: string
  user_id: string
  title: string
  completed: boolean
  date: string
  created_at: number
}

// Habit
export interface Habit {
  id: string
  user_id: string
  title: string
  icon: string | null
  created_at: number
}

// HabitTime
export interface HabitTime {
  id: string
  habit_id: string
  time: string
  notification_enabled: boolean
}

// HabitCheck
export interface HabitCheck {
  id: string
  habit_time_id: string
  date: string
  completed: boolean
}

// Moya
export interface Moya {
  id: string
  user_id: string
  content: string
  created_at: number
  extended_at: number | null
}

// DailyLog
export interface DailyLog {
  id: string
  user_id: string
  date: string
  tasks_completed: number
  habits_completed: number
}

// UserSettings
export interface UserSettings {
  user_id: string
  theme: 'light' | 'dark' | 'auto'
  character_id: string
  timezone: string
  notify_enabled: boolean
}

// PushSubscription
export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Habit with times
export interface HabitWithTimes extends Habit {
  times: HabitTime[]
}

// HabitTime with check status
export interface HabitTimeWithCheck extends HabitTime {
  check?: HabitCheck
}

// Today's data
export interface TodayData {
  tasks: Task[]
  habits: (Habit & { times: HabitTimeWithCheck[] })[]
  moyas: Moya[]
  streak: {
    count: number
    shields: number
    level: 1 | 2 | 3 | 4 | 5
    shieldConsumedAt?: number // シールドが消費された時刻（当日消費された場合のみ）
  }
  characterId?: string // 選択されたキャラクターID
}

// Journey data (30 days)
export interface JourneyDay {
  date: string
  achieved: boolean
  tasks_completed: number
  habits_completed: number
}

// Flame level calculation
export function getFlameLevel(streakCount: number): 1 | 2 | 3 | 4 | 5 {
  if (streakCount >= 31) return 5
  if (streakCount >= 15) return 4
  if (streakCount >= 8) return 3
  if (streakCount >= 4) return 2
  return 1
}

// Moya opacity calculation
export function getMoyaOpacity(createdAt: number, extendedAt: number | null): number {
  const baseTime = extendedAt ?? createdAt
  const daysPassed = Math.floor((Date.now() - baseTime) / (1000 * 60 * 60 * 24))

  if (daysPassed <= 7) return 1
  if (daysPassed <= 14) return 0.7
  if (daysPassed <= 21) return 0.4
  return 0.2
}
