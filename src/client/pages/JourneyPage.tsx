import { useState, useEffect } from 'react'
import { JourneyView } from '../components/JourneyView'
import { ModalWrapper } from '../components/ModalWrapper'
import type { JourneyDay, User } from '@shared/types'

interface JourneyResponse {
  success: boolean
  data?: JourneyDay[]
}

interface UserResponse {
  success: boolean
  user?: User
}

interface DayDetailsResponse {
  success: boolean
  data?: {
    tasks: { title: string; completed: boolean }[]
    habitChecks: { title: string; time: string; completed: boolean }[]
  }
}

interface SettingsResponse {
  success: boolean
  data?: { character_id: string }
}

export function JourneyPage() {
  const [data, setData] = useState<{
    journey: JourneyDay[]
    streakCount: number
    streakShields: number
    characterId: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<JourneyDay | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [journeyRes, userRes, settingsRes] = await Promise.all([
          fetch('/api/journey/history'),
          fetch('/api/auth/me'),
          fetch('/api/settings')
        ])
        const journeyJson: JourneyResponse = await journeyRes.json()
        const userJson: UserResponse = await userRes.json()
        const settingsJson: SettingsResponse = await settingsRes.json()

        if (journeyJson.success && userJson.success && journeyJson.data) {
          setData({
            journey: journeyJson.data,
            streakCount: userJson.user?.streak_count || 0,
            streakShields: userJson.user?.streak_shields || 0,
            characterId: settingsJson.data?.character_id || 'default'
          })
        }
      } catch {
        console.error('Failed to load journey data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🚶</div>
          <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }}>データを読み込めませんでした</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="heading text-2xl page-title">あしあと</h1>

      {/* Main journey view */}
      <JourneyView
        streakCount={data.streakCount}
        streakShields={data.streakShields}
        characterId={data.characterId}
        journeyHistory={data.journey}
      />

      {/* Calendar grid */}
      <section>
        <h2 className="heading text-lg mb-4">過去30日</h2>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
            <div
              key={day}
              className="text-center text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {day}
            </div>
          ))}

          {/* Calendar cells */}
          {data.journey.map((day) => {
            const date = new Date(day.date)
            const isToday =
              day.date === new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                  isToday ? 'ring-2 ring-[var(--coral)]' : ''
                }`}
                style={{
                  background: day.achieved ? 'var(--coral)' : 'var(--bg-card)'
                }}
              >
                <span>{date.getDate()}</span>
                {day.achieved && <span className="text-[10px]">●</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Selected day details */}
      {selectedDay && <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  )
}

interface DayDetailModalProps {
  day: JourneyDay
  onClose: () => void
}

function DayDetailModal({ day, onClose }: DayDetailModalProps) {
  const [details, setDetails] = useState<{
    tasks: { title: string; completed: boolean }[]
    habitChecks: { title: string; time: string; completed: boolean }[]
  } | null>(null)

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/journey/day/${day.date}`)
        const json: DayDetailsResponse = await res.json()
        if (json.success && json.data) {
          setDetails(json.data)
        }
      } catch {
        console.error('Failed to load day details')
      }
    }
    fetchDetails()
  }, [day.date])

  const date = new Date(day.date)
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div className="p-6 pb-8 max-h-[70vh] overflow-y-auto">
        <h3 className="heading text-lg mb-4">{dateStr}</h3>

        {day.achieved ? (
          <div className="text-center mb-4">
            <span className="text-4xl">🎉</span>
            <p className="heading mt-2">達成！</p>
          </div>
        ) : (
          <div className="text-center mb-4">
            <span className="text-4xl">🌱</span>
            <p className="heading mt-2">また歩き出そう</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              大丈夫、いつでも始められるよ
            </p>
          </div>
        )}

        {details && (
          <div className="space-y-4">
            {details.tasks.length > 0 && (
              <div>
                <h4 className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  タスク
                </h4>
                <div className="space-y-2">
                  {details.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{task.completed ? '✓' : '○'}</span>
                      <span
                        style={{
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)'
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {details.habitChecks.length > 0 && (
              <div>
                <h4 className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  習慣
                </h4>
                <div className="space-y-2">
                  {details.habitChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{check.completed ? '✓' : '○'}</span>
                      <span>{check.title}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {check.time.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="button w-full mt-6"
          style={{ background: 'var(--bg-primary)' }}
        >
          閉じる
        </button>
      </div>
    </ModalWrapper>
  )
}
