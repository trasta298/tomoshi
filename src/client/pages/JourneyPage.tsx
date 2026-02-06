import { useState, useEffect } from 'react'
import { JourneyView } from '../components/JourneyView'
import { ModalWrapper } from '../components/ModalWrapper'
import { useDataCache } from '../hooks/useDataCache'
import type { JourneyDay } from '@shared/types'

interface JourneyResponse {
  success: boolean
  data?: JourneyDay[]
  streak?: { count: number; shields: number }
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
  const { fetchWithCache } = useDataCache()

  useEffect(() => {
    async function fetchData() {
      try {
        const [journeyJson, settingsJson] = await Promise.all([
          fetchWithCache<JourneyResponse>('/api/journey/history'),
          fetchWithCache<SettingsResponse>('/api/settings')
        ])

        if (journeyJson.success && journeyJson.data) {
          setData({
            journey: journeyJson.data,
            streakCount: journeyJson.streak?.count ?? 0,
            streakShields: journeyJson.streak?.shields ?? 0,
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
  }, [fetchWithCache])

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
          {(() => {
            // Calculate the day of week for the first date (0 = Sunday, 6 = Saturday)
            const firstDate = new Date(data.journey[0].date + 'T00:00:00+09:00')
            const firstDayOfWeek = firstDate.getDay()

            // Generate padding cells for previous month dates
            const paddingCells = []
            for (let i = firstDayOfWeek - 1; i >= 0; i--) {
              const paddingDate = new Date(firstDate)
              paddingDate.setDate(paddingDate.getDate() - (i + 1))
              paddingCells.push(
                <div
                  key={`padding-${i}`}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs"
                  style={{
                    background: 'var(--bg-card)',
                    opacity: 0.4
                  }}
                >
                  <span>{paddingDate.getDate()}</span>
                </div>
              )
            }

            // Generate actual journey day cells
            const dayCells = data.journey.map((day) => {
              const date = new Date(day.date + 'T00:00:00+09:00')
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
            })

            return [...paddingCells, ...dayCells]
          })()}
        </div>
      </section>

      {/* Selected day details */}
      {selectedDay && (
        <DayDetailModal day={selectedDay} journey={data.journey} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}

interface DayDetailModalProps {
  day: JourneyDay
  journey: JourneyDay[]
  onClose: () => void
}

function getNonAchievedMessage(
  day: JourneyDay,
  journey: JourneyDay[]
): { emoji: string; heading: string; sub: string } {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const tasksTotal = day.tasks_total ?? 0
  const habitsTotal = day.habits_total ?? 0

  // Today: encouraging
  if (day.date === today) {
    return { emoji: '🔥', heading: '今日はまだこれから！', sub: '一歩ずつ進もう' }
  }

  // No tasks or habits set that day
  if (tasksTotal === 0 && habitsTotal === 0) {
    return { emoji: '☁️', heading: 'のんびりした日', sub: 'こういう日も大事' }
  }

  // Previous day was achieved (streak broke here)
  const dayIndex = journey.findIndex((d) => d.date === day.date)
  const prevDay = dayIndex > 0 ? journey[dayIndex - 1] : null
  if (prevDay?.achieved) {
    return { emoji: '🌱', heading: 'また新しい旅が始まるね', sub: '大丈夫、いつでも始められるよ' }
  }

  // Some progress made
  const tasksCompleted = day.tasks_completed ?? 0
  const habitsCompleted = day.habits_completed ?? 0
  if (tasksCompleted > 0 || habitsCompleted > 0) {
    return { emoji: '🌿', heading: 'あと少しだったね', sub: 'やったことはちゃんと残ってるよ' }
  }

  // Default
  return { emoji: '🌱', heading: 'また歩き出そう', sub: '大丈夫、いつでも始められるよ' }
}

function DayDetailModal({ day, journey, onClose }: DayDetailModalProps) {
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
          (() => {
            const msg = getNonAchievedMessage(day, journey)
            return (
              <div className="text-center mb-4">
                <span className="text-4xl">{msg.emoji}</span>
                <p className="heading mt-2">{msg.heading}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {msg.sub}
                </p>
              </div>
            )
          })()
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
