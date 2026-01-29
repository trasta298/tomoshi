import { getFlameLevel, type JourneyDay } from '@shared/types'

// キャラクター絵文字マッピング
const CHARACTER_EMOJIS: Record<string, string> = {
  default: '🚶',
  runner: '🏃',
  hiker: '🧗',
  dancer: '💃',
  wizard: '🧙',
  ninja: '🥷',
  astronaut: '🧑‍🚀',
  robot: '🤖'
}

interface JourneyViewProps {
  streakCount: number
  streakShields: number
  characterId?: string
  journeyHistory?: JourneyDay[] // 過去30日の達成履歴（オプション）
}

// マイルストーン定義（設計仕様）
const MILESTONES = [
  { days: 7, name: '草原', emoji: '🌱' },
  { days: 14, name: '森', emoji: '🌳' },
  { days: 21, name: '川', emoji: '🏞️' },
  { days: 30, name: '山', emoji: '⛰️' },
  { days: 50, name: '砂漠', emoji: '🏜️' },
  { days: 100, name: '城', emoji: '🏰' }
]

export function JourneyView({ streakCount, streakShields, characterId = 'default', journeyHistory }: JourneyViewProps) {
  const level = getFlameLevel(streakCount)
  const flameEmoji = getFlameEmoji(level)
  const nextMilestone = getNextMilestone(streakCount)
  const characterEmoji = CHARACTER_EMOJIS[characterId] || CHARACTER_EMOJIS.default

  return (
    <div className="card card--lemon py-6">
      {/* Character and flame */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-1 flame-glow">
          {flameEmoji}
        </div>
        <div className="text-3xl">{characterEmoji}</div>
      </div>

      {/* 30日分の旅路パス */}
      <div className="relative px-4">
        <JourneyPath streakCount={streakCount} journeyHistory={journeyHistory} />
      </div>

      {/* Streak info */}
      <div className="text-center mt-4">
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
            あと{nextMilestone.daysLeft}日で「{nextMilestone.name}」到着 {nextMilestone.emoji}
          </p>
        )}

        {/* Shields */}
        {streakShields > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            🛡️ ×{streakShields}
          </p>
        )}
      </div>
    </div>
  )
}

// 30日分の旅路パス表示
interface JourneyPathProps {
  streakCount: number
  journeyHistory?: JourneyDay[]
}

function JourneyPath({ streakCount, journeyHistory }: JourneyPathProps) {
  // 今日の日付
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  // journeyHistoryがある場合は実際の達成履歴を使用
  // ない場合はstreakCountベースでフォールバック
  const getIsAchieved = (dayIndex: number): boolean => {
    if (journeyHistory && journeyHistory.length > 0) {
      const historyDay = journeyHistory[dayIndex]
      return historyDay?.achieved || false
    }
    // フォールバック: streakCountベース
    return dayIndex < streakCount
  }

  const getIsToday = (dayIndex: number): boolean => {
    if (journeyHistory && journeyHistory.length > 0) {
      const historyDay = journeyHistory[dayIndex]
      return historyDay?.date === today
    }
    // フォールバック
    return dayIndex === streakCount || (streakCount === 0 && dayIndex === 0)
  }

  const days = Array.from({ length: 30 }, (_, i) => i)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max justify-center">
        {days.map((dayIndex) => {
          const isAchieved = getIsAchieved(dayIndex)
          const isToday = getIsToday(dayIndex)
          const dayNumber = dayIndex + 1
          const milestone = MILESTONES.find((m) => m.days === dayNumber)

          return (
            <div key={dayIndex} className="flex flex-col items-center">
              {/* マイルストーン表示 */}
              {milestone && (
                <span className="text-xs mb-1" title={milestone.name}>
                  {milestone.emoji}
                </span>
              )}

              {/* ドット */}
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isToday ? 'ring-2 ring-offset-1 ring-[var(--coral)]' : ''
                }`}
                style={{
                  background: isAchieved ? 'var(--coral)' : 'var(--text-secondary)',
                  opacity: isAchieved ? 1 : 0.3
                }}
                title={`${dayNumber}日目`}
              />

              {/* 日付表示（5日おき） */}
              {dayNumber % 5 === 0 && (
                <span
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {dayNumber}
                </span>
              )}
            </div>
          )
        })}
      </div>
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

function getNextMilestone(
  streakCount: number
): { name: string; daysLeft: number; emoji: string } | null {
  for (const milestone of MILESTONES) {
    if (streakCount < milestone.days) {
      return {
        name: milestone.name,
        daysLeft: milestone.days - streakCount,
        emoji: milestone.emoji
      }
    }
  }
  return null
}

// Mini version for the today page
interface MiniJourneyProps {
  streakCount: number
  characterId?: string
}

export function MiniJourney({ streakCount, characterId = 'default' }: MiniJourneyProps) {
  const level = getFlameLevel(streakCount)
  const flameEmoji = getFlameEmoji(level)
  const nextMilestone = getNextMilestone(streakCount)
  const characterEmoji = CHARACTER_EMOJIS[characterId] || CHARACTER_EMOJIS.default

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-2xl flame-glow">{flameEmoji}</span>
      <span className="text-xl">{characterEmoji}</span>

      {/* ミニ旅路パス（10日分） */}
      <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => {
          const day = i + 1
          const isAchieved = day <= Math.min(streakCount, 10)
          const milestone = MILESTONES.find((m) => m.days === day)

          return (
            <span key={i} className="flex flex-col items-center">
              {milestone && <span className="text-[8px]">{milestone.emoji}</span>}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: isAchieved ? 'var(--coral)' : 'var(--text-secondary)',
                  opacity: isAchieved ? 1 : 0.3
                }}
              />
            </span>
          )
        })}
        {streakCount > 10 && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            ...
          </span>
        )}
      </div>

      <div className="text-right">
        {streakCount > 0 && <span className="text-sm heading">{streakCount}日</span>}
        {nextMilestone && (
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {nextMilestone.emoji} あと{nextMilestone.daysLeft}日
          </div>
        )}
      </div>
    </div>
  )
}
