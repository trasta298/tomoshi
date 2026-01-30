import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { usePushNotification } from '../hooks/usePushNotification'
import { useDataCache } from '../hooks/useDataCache'
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

// 選択可能なキャラクター
const CHARACTERS = [
  { id: 'default', name: 'たびびと' },
  { id: 'runner', name: 'はしる' },
  { id: 'hiker', name: 'やまのぼり' },
  { id: 'dancer', name: 'おどる' },
  { id: 'wizard', name: 'まほうつかい' },
  { id: 'ninja', name: 'にんじゃ' },
  { id: 'astronaut', name: 'うちゅう' },
  { id: 'robot', name: 'ロボット' }
]

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush
  } = usePushNotification()
  const navigate = useNavigate()
  const { fetchWithCache, invalidate } = useDataCache()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsJson, goalJson, habitsJson] = await Promise.all([
          fetchWithCache<SettingsResponse>('/api/settings'),
          fetchWithCache<GoalResponse>('/api/settings/goal'),
          fetchWithCache<HabitsResponse>('/api/habits')
        ])

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
  }, [fetchWithCache])

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
    invalidate('settings', 'today')
  }

  const handleGoalSave = async () => {
    await fetch('/api/settings/goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_goal: monthlyGoal || null })
    })
    invalidate('settings', 'today')
  }

  const handleCharacterChange = async (characterId: string) => {
    setSettings((s) => (s ? { ...s, character_id: characterId } : s))
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId })
    })
    invalidate('settings', 'today')
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
      <h1 className="heading text-2xl page-title">せってい</h1>

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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
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
          className="w-full mt-3 py-3 rounded-full text-sm"
          style={{ background: 'var(--bg-primary)' }}
        >
          習慣を編集
        </button>
      </section>

      {/* Character selection */}
      <section className="card">
        <h2 className="heading text-lg mb-3">キャラクター</h2>
        <div className="grid grid-cols-4 gap-3">
          {CHARACTERS.map((char) => (
            <button
              key={char.id}
              onClick={() => handleCharacterChange(char.id)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                settings?.character_id === char.id ? 'ring-2 ring-[var(--coral)]' : ''
              }`}
              style={{ background: 'var(--bg-primary)' }}
            >
              <img
                src={`/characters/${char.id}.webp`}
                alt={char.name}
                className="w-12 h-12 object-contain"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {char.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section className="card">
        <h2 className="heading text-lg mb-3">テーマ</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'auto'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className="flex-1 py-2 rounded-xl text-sm transition-colors"
              style={{
                background: theme === t ? 'var(--coral)' : 'var(--bg-primary)',
                color: theme === t ? '#3d3d3d' : 'var(--text-primary)'
              }}
            >
              {t === 'light' && '☀️ ライト'}
              {t === 'dark' && '🌙 ダーク'}
              {t === 'auto' && '🔄 自動'}
            </button>
          ))}
        </div>
      </section>

      {/* Install App */}
      {!isInstalled && (isInstallable || isIOS) && (
        <section className="card">
          <h2 className="heading text-lg mb-3">アプリをインストール</h2>
          {isIOS ? (
            <div className="space-y-2">
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                ホーム画面に追加すると、アプリのように使えます
              </p>
              <div
                className="p-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)' }}
              >
                <p className="mb-1">1. 画面下の共有ボタン（📤）をタップ</p>
                <p>2.「ホーム画面に追加」を選択</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                ホーム画面に追加して、オフラインでも使えるようにしましょう
              </p>
              <button onClick={install} className="button button--primary w-full">
                📲 インストール
              </button>
            </div>
          )}
        </section>
      )}

      {/* Notifications */}
      <section className="card">
        <h2 className="heading text-lg mb-3">通知</h2>

        {!isPushSupported ? (
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
            このブラウザはプッシュ通知に対応していません
          </p>
        ) : pushPermission === 'denied' ? (
          <div className="space-y-2">
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
              通知がブロックされています
            </p>
            <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
              ブラウザの設定から通知を許可してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>プッシュ通知</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPushSubscribed}
                  disabled={isPushLoading}
                  onChange={async (e) => {
                    const enabled = e.target.checked

                    if (enabled) {
                      const success = await subscribePush()
                      if (success) {
                        setSettings((s) => (s ? { ...s, notify_enabled: true } : s))
                        await fetch('/api/settings', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notify_enabled: true })
                        })
                        invalidate('settings')
                      }
                    } else {
                      const success = await unsubscribePush()
                      if (success) {
                        setSettings((s) => (s ? { ...s, notify_enabled: false } : s))
                        await fetch('/api/settings', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notify_enabled: false })
                        })
                        invalidate('settings')
                      }
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className="w-11 h-6 rounded-full transition-colors"
                  style={{
                    background: isPushSubscribed ? 'var(--coral)' : 'var(--text-secondary)',
                    opacity: isPushLoading ? 0.5 : 1
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: isPushSubscribed ? 'translateX(22px)' : 'translateX(2px)',
                      marginTop: '2px'
                    }}
                  />
                </div>
              </label>
            </div>

            {pushError && (
              <p style={{ color: '#e57373' }} className="text-sm">
                {pushError}
              </p>
            )}

            {isPushSubscribed && (
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
                習慣の時刻に通知が届きます
              </p>
            )}
          </div>
        )}
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
