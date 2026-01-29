export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  NOTIFICATION_SCHEDULER: DurableObjectNamespace
  ASSETS: Fetcher
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
}

export interface Session {
  user_id: string
  created_at: number
  expires_at: number
}

export interface AuthContext {
  userId: string
}

// Database row types (with INTEGER booleans)
export interface DbTask {
  id: string
  user_id: string
  title: string
  completed: number
  date: string
  created_at: number
}

export interface DbHabit {
  id: string
  user_id: string
  title: string
  icon: string | null
  created_at: number
}

export interface DbHabitTime {
  id: string
  habit_id: string
  time: string
  notification_enabled: number
}

export interface DbHabitCheck {
  id: string
  habit_time_id: string
  date: string
  completed: number
}

export interface DbMoya {
  id: string
  user_id: string
  content: string
  created_at: number
  extended_at: number | null
}

export interface DbUserSettings {
  user_id: string
  theme: string
  character_id: string
  timezone: string
  notify_enabled: number
}

export interface DbCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  created_at: number
}

export interface DbUser {
  id: string
  created_at: number
  monthly_goal: string | null
  streak_count: number
  streak_shields: number
  shield_consumed_at: number | null
}

export interface DbDailyLog {
  id: string
  user_id: string
  date: string
  tasks_completed: number
  habits_completed: number
  tasks_total: number
  habits_total: number
  achieved: number
}

export interface DbDailyLogHabit {
  id: string
  daily_log_id: string
  habit_id: string | null
  habit_time_id: string | null
  habit_title: string
  habit_icon: string | null
  time: string
  completed: number
}

export interface DbPushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: number
}
