import { getFlameLevel } from '@shared/types'

interface JourneyViewProps {
  streakCount: number
  streakShields: number
}

export function JourneyView({ streakCount, streakShields }: JourneyViewProps) {
  const level = getFlameLevel(streakCount)

  const flameEmoji = getFlameEmoji(level)
  const nextMilestone = getNextMilestone(streakCount)

  return (
    <div className="card card--lemon text-center py-6">
      {/* Character and flame */}
      <div className="text-4xl mb-2">
        {flameEmoji}
        <br />
        <span className="text-3xl">🚶</span>
      </div>

      {/* Journey path visualization */}
      <div className="flex items-center justify-center gap-1 my-4 text-sm">
        {Array.from({ length: 7 }).map((_, i) => {
          const dayIndex = Math.max(0, streakCount - 3) + i
          const isToday = i === 3
          const isPast = dayIndex < streakCount
          const isFuture = dayIndex > streakCount

          return (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${
                isToday ? 'ring-2 ring-offset-1 ring-[var(--coral)]' : ''
              }`}
              style={{
                background: isPast || isToday ? 'var(--coral)' : 'var(--text-secondary)',
                opacity: isFuture ? 0.3 : 1
              }}
            />
          )
        })}
      </div>

      {/* Streak info */}
      <p className="heading text-lg">
        {streakCount > 0 ? (
          <>
            <span className="text-2xl font-bold">{streakCount}</span>日連続！
          </>
        ) : (
          '今日から始めよう'
        )}
      </p>

      {/* Next milestone */}
      {nextMilestone && (
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          あと{nextMilestone.daysLeft}日で「{nextMilestone.name}」到着
        </p>
      )}

      {/* Shields */}
      {streakShields > 0 && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          🛡️ ×{streakShields}
        </p>
      )}
    </div>
  )
}

function getFlameEmoji(level: 1 | 2 | 3 | 4 | 5): string {
  switch (level) {
    case 1:
      return '🕯️'
    case 2:
      return '🔥'
    case 3:
      return '🔥✨'
    case 4:
      return '🔥🌟'
    case 5:
      return '🔥💫🌟'
  }
}

function getNextMilestone(streakCount: number): { name: string; daysLeft: number } | null {
  const milestones = [
    { days: 7, name: '草原' },
    { days: 14, name: '森' },
    { days: 21, name: '川' },
    { days: 30, name: '山' },
    { days: 50, name: '砂漠' },
    { days: 100, name: '城' }
  ]

  for (const milestone of milestones) {
    if (streakCount < milestone.days) {
      return {
        name: milestone.name,
        daysLeft: milestone.days - streakCount
      }
    }
  }

  return null
}

// Mini version for the today page
interface MiniJourneyProps {
  streakCount: number
}

export function MiniJourney({ streakCount }: MiniJourneyProps) {
  const level = getFlameLevel(streakCount)
  const flameEmoji = getFlameEmoji(level)

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-2xl">{flameEmoji}</span>
      <span className="text-xl">🚶</span>
      <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => {
          const isPast = i < Math.min(streakCount, 10)
          return (
            <span
              key={i}
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: isPast ? 'var(--coral)' : 'var(--text-secondary)',
                opacity: isPast ? 1 : 0.3
              }}
            />
          )
        })}
        {streakCount > 10 && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            ...
          </span>
        )}
      </div>
      {streakCount > 0 && <span className="text-sm heading">{streakCount}日</span>}
    </div>
  )
}
