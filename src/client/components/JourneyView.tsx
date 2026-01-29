import { useRef, useEffect } from 'react'
import { Sprout, TreePine, Waves, Mountain } from 'lucide-react'
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
// icon: Lucide iconコンポーネント, emoji: フォールバック用
const MILESTONES = [
  { days: 7, name: '草原', emoji: '🌱', icon: Sprout },
  { days: 14, name: '森', emoji: '🌳', icon: TreePine },
  { days: 21, name: '川', emoji: '🏞️', icon: Waves },
  { days: 30, name: '山', emoji: '⛰️', icon: Mountain },
  { days: 50, name: '砂漠', emoji: '🏜️', icon: null },
  { days: 100, name: '城', emoji: '🏰', icon: null }
]

export function JourneyView({ streakCount, streakShields, characterId = 'default', journeyHistory }: JourneyViewProps) {
  const level = getFlameLevel(streakCount)
  const flameEmoji = getFlameEmoji(level)
  const nextMilestone = getNextMilestone(streakCount)
  const characterEmoji = CHARACTER_EMOJIS[characterId] || CHARACTER_EMOJIS.default
  const isLevel5 = level === 5

  return (
    <div className="card card--lemon py-6">
      {/* 30日分の旅路パス */}
      <div className="relative px-2">
        <JourneyPath
          streakCount={streakCount}
          characterEmoji={characterEmoji}
        />
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

// 30日分の旅路パス表示（SVGベース）
interface JourneyPathProps {
  streakCount: number
  characterEmoji?: string
}

// SVG内でのドット位置計算用定数
const SVG_WIDTH = 720
const SVG_HEIGHT = 100
const ROAD_Y = 45
const DOT_RADIUS_ACHIEVED = 6
const DOT_RADIUS_PENDING = 5
const TOTAL_DAYS = 30
const START_X = 30
const END_X = SVG_WIDTH - 30
const DOT_SPACING = (END_X - START_X) / (TOTAL_DAYS - 1)

function JourneyPath({
  streakCount,
  characterEmoji
}: JourneyPathProps) {
  // 達成判定: dayIndex < streakCount なら達成済み
  const getIsAchieved = (dayIndex: number): boolean => dayIndex < streakCount

  // X座標計算
  const getX = (dayIndex: number) => START_X + dayIndex * DOT_SPACING

  // Y座標計算（緩やかなうねり）
  const getY = (dayIndex: number) => {
    const wave = Math.sin((dayIndex / TOTAL_DAYS) * Math.PI * 2) * 8
    return ROAD_Y + wave
  }

  // 道のパス生成（緩やかな曲線）
  const generateRoadPath = () => {
    const points: string[] = []
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const x = getX(i)
      const y = getY(i)
      if (i === 0) {
        points.push(`M${x},${y}`)
      } else {
        const prevX = getX(i - 1)
        const prevY = getY(i - 1)
        const cpX = (prevX + x) / 2
        points.push(`Q${cpX},${prevY} ${x},${y}`)
      }
    }
    return points.join(' ')
  }

  // 現在位置（キャラクター表示位置）
  const currentDayIndex = streakCount > 0 ? Math.min(streakCount - 1, TOTAL_DAYS - 1) : 0
  const characterX = getX(currentDayIndex)
  const characterY = getY(currentDayIndex)

  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i)

  // スクロールコンテナのref
  const scrollRef = useRef<HTMLDivElement>(null)

  // 初期表示時に現在位置を中央にスクロール
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const containerWidth = container.clientWidth
      // キャラクター位置を中央に
      const scrollTo = characterX - containerWidth / 2
      container.scrollLeft = Math.max(0, scrollTo)
    }
  }, [characterX])

  return (
    <div className="journey-scroll-container" ref={scrollRef}>
      <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="journey-svg">
        {/* 道のパス（曲線） */}
        <path d={generateRoadPath()} className="journey-road" />

        {/* 30日分のドット */}
        {days.map((dayIndex) => {
          const isAchieved = getIsAchieved(dayIndex)
          const isCurrent = dayIndex === currentDayIndex
          const x = getX(dayIndex)
          const y = getY(dayIndex)
          const r = isAchieved ? DOT_RADIUS_ACHIEVED : DOT_RADIUS_PENDING

          return (
            <g key={dayIndex}>
              {/* 現在位置のドットにはハイライトリング */}
              {isCurrent && streakCount > 0 && (
                <circle cx={x} cy={y} r={r + 5} className="journey-dot-current-ring" />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                className={isAchieved ? 'journey-dot-achieved' : 'journey-dot-pending'}
              />
            </g>
          )
        })}

        {/* マイルストーン（Lucideアイコン） - 道の下に配置 */}
        {MILESTONES.filter((m) => m.days <= TOTAL_DAYS && m.icon).map((milestone) => {
          const dayIndex = milestone.days - 1
          const x = getX(dayIndex)
          const y = getY(dayIndex)
          const IconComponent = milestone.icon!
          const isReached = getIsAchieved(dayIndex)

          return (
            <g
              key={milestone.days}
              transform={`translate(${x - 10}, ${y + 12})`}
              className={isReached ? 'journey-milestone-reached' : 'journey-milestone-pending'}
            >
              <IconComponent size={20} strokeWidth={1.5} />
            </g>
          )
        })}

        {/* キャラクター位置 - 現在地を示す */}
        {characterEmoji && (
          <text
            x={characterX}
            y={characterY - 20}
            textAnchor="middle"
            fontSize="20"
            className="journey-character-text"
          >
            {characterEmoji}
          </text>
        )}
      </svg>
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

// Mini version for the today page (SVGベース)
interface MiniJourneyProps {
  streakCount: number
  characterId?: string
}

// ミニ版のSVG定数
const MINI_SVG_WIDTH = 160
const MINI_SVG_HEIGHT = 40
const MINI_TOTAL_DAYS = 10
const MINI_DOT_Y = 28 // ラインを下げてマイルストーンアイコンのスペースを確保
const MINI_START_X = 8
const MINI_END_X = MINI_SVG_WIDTH - 8
const MINI_DOT_RADIUS = 3

export function MiniJourney({ streakCount, characterId = 'default' }: MiniJourneyProps) {
  const level = getFlameLevel(streakCount)
  const flameEmoji = getFlameEmoji(level)
  const nextMilestone = getNextMilestone(streakCount)
  const characterEmoji = CHARACTER_EMOJIS[characterId] || CHARACTER_EMOJIS.default
  const isLevel5 = level === 5

  // スライディングウィンドウ: 現在位置が表示範囲の中央〜後半に来るように調整
  // startDay: 表示開始日（1-indexed）
  const startDay = Math.max(1, streakCount - Math.floor(MINI_TOTAL_DAYS * 0.7) + 1)
  const endDay = startDay + MINI_TOTAL_DAYS - 1

  // X座標計算
  const getX = (dayIndex: number) => {
    return MINI_START_X + (dayIndex / (MINI_TOTAL_DAYS - 1)) * (MINI_END_X - MINI_START_X)
  }

  // 表示範囲内のマイルストーン
  const milestonesInRange = MILESTONES.filter((m) => m.days >= startDay && m.days <= endDay && m.icon)

  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-2xl ${isLevel5 ? 'flame-level-5' : 'flame-glow'}`}>{flameEmoji}</span>
      <span className="text-xl">{characterEmoji}</span>

      {/* ミニ旅路パス（10日分, SVG） */}
      <div className="flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${MINI_SVG_WIDTH} ${MINI_SVG_HEIGHT}`} className="mini-journey-svg">
          {/* 道のライン */}
          <line
            x1={MINI_START_X}
            y1={MINI_DOT_Y}
            x2={MINI_END_X}
            y2={MINI_DOT_Y}
            className="mini-journey-road"
          />

          {/* 10日分のドット（スライディングウィンドウ） */}
          {Array.from({ length: MINI_TOTAL_DAYS }).map((_, i) => {
            const day = startDay + i // 実際の日数
            const isAchieved = day <= streakCount
            const isCurrent = day === streakCount && streakCount > 0
            const x = getX(i)

            return (
              <g key={i}>
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={MINI_DOT_Y}
                    r={MINI_DOT_RADIUS + 3}
                    className="mini-journey-dot-current-ring"
                  />
                )}
                <circle
                  cx={x}
                  cy={MINI_DOT_Y}
                  r={MINI_DOT_RADIUS}
                  className={isAchieved ? 'mini-journey-dot-achieved' : 'mini-journey-dot-pending'}
                />
              </g>
            )
          })}

          {/* マイルストーン（表示範囲内のみ） */}
          {milestonesInRange.map((milestone) => {
            const windowIndex = milestone.days - startDay // ウィンドウ内のインデックス
            const x = getX(windowIndex)
            const IconComponent = milestone.icon!
            const isReached = milestone.days <= streakCount

            return (
              <g
                key={milestone.days}
                transform={`translate(${x - 5}, ${MINI_DOT_Y - 14})`}
                className={isReached ? 'journey-milestone-reached' : 'journey-milestone-pending'}
              >
                <IconComponent size={10} strokeWidth={2} />
              </g>
            )
          })}
        </svg>
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
