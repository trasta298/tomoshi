import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import type { UserSettings, Habit } from '@shared/types'

interface SettingsResponse {
  success: boolean
  data?: UserSettings
}

interface GoalResponse {
  success: boolean
  data?: { monthly_goal: string | null }
}

interface HabitsResponse {
  success: boolean
  data?: Habit[]
}

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, goalRes, habitsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/settings/goal'),
          fetch('/api/habits')
        ])

        const settingsJson: SettingsResponse = await settingsRes.json()
        const goalJson: GoalResponse = await goalRes.json()
        const habitsJson: HabitsResponse = await habitsRes.json()

        if (settingsJson.success && settingsJson.data) setSettings(settingsJson.data)
        if (goalJson.success && goalJson.data) setMonthlyGoal(goalJson.data.monthly_goal || '')
        if (habitsJson.success && habitsJson.data) setHabits(habitsJson.data)
      } catch {
        console.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await logout()
      navigate('/login')
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    })
  }

  const handleGoalSave = async () => {
    await fetch('/api/settings/goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_goal: monthlyGoal || null })
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="heading text-2xl">せってい</h1>

      {/* User info */}
      <section className="card">
        <h2 className="heading text-lg mb-2">アカウント</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{user?.id}</p>
      </section>

      {/* Monthly goal */}
      <section className="card">
        <h2 className="heading text-lg mb-3">今月の目標</h2>
        <input
          type="text"
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(e.target.value)}
          onBlur={handleGoalSave}
          placeholder="今月達成したいことを1つ..."
          maxLength={100}
          className="w-full p-3 rounded-xl"
          style={{ background: 'var(--bg-primary)' }}
        />
      </section>

      {/* Habits management */}
      <section className="card">
        <h2 className="heading text-lg mb-3">まいにちの習慣</h2>
        {habits.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>習慣がまだありません</p>
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'var(--bg-primary)' }}
              >
                <span>{habit.icon || '✨'}</span>
                <span className="flex-1">{habit.title}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => navigate('/settings/habits')}
          className="button button--secondary w-full mt-3"
        >
          習慣を編集
        </button>
      </section>

      {/* Theme */}
      <section className="card">
        <h2 className="heading text-lg mb-3">テーマ</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'auto'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`flex-1 py-2 rounded-xl text-sm transition-colors ${
                theme === t ? 'bg-[var(--coral)]' : 'bg-[var(--bg-primary)]'
              }`}
            >
              {t === 'light' && '☀️ ライト'}
              {t === 'dark' && '🌙 ダーク'}
              {t === 'auto' && '🔄 自動'}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="card">
        <h2 className="heading text-lg mb-3">通知</h2>
        <div className="flex items-center justify-between">
          <span>プッシュ通知</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.notify_enabled ?? true}
              onChange={async (e) => {
                const enabled = e.target.checked
                setSettings((s) => (s ? { ...s, notify_enabled: enabled } : s))

                if (enabled) {
                  // Request notification permission
                  const permission = await Notification.requestPermission()
                  if (permission === 'granted') {
                    // Register push subscription
                    // This would require service worker registration
                  }
                }

                await fetch('/api/settings', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notify_enabled: enabled })
                })
              }}
              className="sr-only"
            />
            <div
              className="w-11 h-6 rounded-full transition-colors"
              style={{
                background: settings?.notify_enabled ? 'var(--coral)' : 'var(--text-secondary)'
              }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: settings?.notify_enabled ? 'translateX(22px)' : 'translateX(2px)',
                  marginTop: '2px'
                }}
              />
            </div>
          </label>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="button button--secondary w-full"
        style={{ color: '#e57373' }}
      >
        ログアウト
      </button>

      {/* App info */}
      <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
        tomoshi v1.0.0
      </p>
    </div>
  )
}
