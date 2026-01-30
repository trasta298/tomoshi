import { useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sprout, TreePine, Waves, Mountain } from 'lucide-react'
import { motion } from 'framer-motion'

// =============================================================================
// 定数定義
// =============================================================================

const CHARACTER_IDS = ['default', 'runner', 'hiker', 'dancer', 'wizard', 'ninja', 'astronaut', 'robot'] as const
type CharacterId = typeof CHARACTER_IDS[number]

function getCharacterImagePath(characterId: string): string {
  const id = CHARACTER_IDS.includes(characterId as CharacterId) ? characterId : 'default'
  return `/characters/${id}.webp`
}

interface Milestone {
  days: number
  name: string
  emoji: string
  icon: LucideIcon | null
}

const MILESTONES: Milestone[] = [
  { days: 7, name: '草原', emoji: '🌱', icon: Sprout },
  { days: 14, name: '森', emoji: '🌳', icon: TreePine },
  { days: 21, name: '川', emoji: '🏞️', icon: Waves },
  { days: 30, name: '山', emoji: '⛰️', icon: Mountain },
  { days: 50, name: '砂漠', emoji: '🏜️', icon: null },
  { days: 100, name: '城', emoji: '🏰', icon: null }
]

// フルサイズJourney用定数
const JOURNEY_CONFIG = {
  dotSpacing: 36,
  svgHeight: 100,
  roadY: 60,
  dotRadiusAchieved: 6,
  dotRadiusPending: 5,
  totalDays: 30,
  startX: 30,
  get svgWidth() { return this.startX + (this.totalDays - 1) * this.dotSpacing + 30 },
  get endX() { return this.svgWidth - 30 }
} as const

// ミニJourney用定数
const MINI_JOURNEY_CONFIG = {
  svgWidth: 160,
  svgHeight: 40,
  totalDays: 10,
  dotY: 28,
  startX: 8,
  get endX() { return this.svgWidth - 8 },
  dotRadius: 3
} as const

// =============================================================================
// 型定義
// =============================================================================

interface JourneyViewProps {
  streakCount: number
  streakShields: number
  characterId?: string
}

export function JourneyView({ streakCount, streakShields, characterId = 'default' }: JourneyViewProps) {
  const nextMilestone = getNextMilestone(streakCount)
  const characterImage = getCharacterImagePath(characterId)

  return (
    <div
      className="card card--lemon py-6"
    >
      {/* 30日分の旅路パス */}
      <div className="relative px-2">
        <JourneyPath
          streakCount={streakCount}
          characterImage={characterImage}
        />
      </div>

      {/* Streak info */}
      <div className="text-center mt-4">
        <p className="heading text-lg">
          {streakCount > 0 ? (
            <>
              <motion.span
                key={streakCount}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="text-2xl font-bold inline-block"
              >
                {streakCount}
              </motion.span>日連続！
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

// =============================================================================
// JourneyPath コンポーネント（30日分の旅路パス表示）
// =============================================================================

interface JourneyPathProps {
  streakCount: number
  characterImage?: string
}

function getJourneyX(dayIndex: number): number {
  return JOURNEY_CONFIG.startX + dayIndex * JOURNEY_CONFIG.dotSpacing
}

function getJourneyY(dayIndex: number): number {
  const wave = Math.sin((dayIndex / JOURNEY_CONFIG.totalDays) * Math.PI * 4) * 12
  return JOURNEY_CONFIG.roadY + wave
}

function generateRoadPath(): string {
  const points: string[] = []
  for (let i = 0; i < JOURNEY_CONFIG.totalDays; i++) {
    const x = getJourneyX(i)
    const y = getJourneyY(i)
    if (i === 0) {
      points.push(`M${x},${y}`)
    } else {
      const prevX = getJourneyX(i - 1)
      const prevY = getJourneyY(i - 1)
      const cpX = (prevX + x) / 2
      points.push(`Q${cpX},${prevY} ${x},${y}`)
    }
  }
  return points.join(' ')
}

function JourneyPath({ streakCount, characterImage }: JourneyPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentDayIndex = streakCount > 0 ? Math.min(streakCount - 1, JOURNEY_CONFIG.totalDays - 1) : 0
  const characterX = getJourneyX(currentDayIndex)
  const characterY = getJourneyY(currentDayIndex)
  const characterSize = 48

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const scrollTo = characterX - container.clientWidth / 2
      container.scrollLeft = Math.max(0, scrollTo)
    }
  }, [characterX])

  const roadPath = generateRoadPath()
  const visibleMilestones = MILESTONES.filter((m) => m.days <= JOURNEY_CONFIG.totalDays && m.icon)

  return (
    <div className="journey-scroll-container" ref={scrollRef}>
      <svg viewBox={`0 0 ${JOURNEY_CONFIG.svgWidth} ${JOURNEY_CONFIG.svgHeight}`} className="journey-svg overflow-visible">
        <path d={roadPath} className="journey-road" />

        {Array.from({ length: JOURNEY_CONFIG.totalDays }, (_, dayIndex) => {
          const isAchieved = dayIndex < streakCount
          const isCurrent = dayIndex === currentDayIndex
          const x = getJourneyX(dayIndex)
          const y = getJourneyY(dayIndex)
          const r = isAchieved ? JOURNEY_CONFIG.dotRadiusAchieved : JOURNEY_CONFIG.dotRadiusPending

          return (
            <g key={dayIndex}>
              {isCurrent && streakCount > 0 && (
                <circle
                  cx={x} cy={y} r={r + 4}
                  className="journey-dot-current-ring"
                />
              )}
              <motion.circle
                cx={x}
                cy={y}
                className={isAchieved ? 'journey-dot-achieved' : 'journey-dot-pending'}
                animate={{ r: isAchieved ? r * 1.2 : r }}
                transition={{ duration: 0.3 }}
              />
            </g>
          )
        })}

        {visibleMilestones.map((milestone) => {
          const dayIndex = milestone.days - 1
          const x = getJourneyX(dayIndex)
          const y = getJourneyY(dayIndex)
          const IconComponent = milestone.icon!
          const isReached = dayIndex < streakCount

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

        {characterImage && (
          <motion.image
            href={characterImage}
            width={characterSize}
            height={characterSize}
            className="journey-character"
            animate={{
              x: characterX - characterSize / 2,
              y: characterY - characterSize - 8,
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        )}
      </svg>
    </div>
  )
}

// =============================================================================
// ヘルパー関数
// =============================================================================

function getNextMilestone(streakCount: number): { name: string; daysLeft: number; emoji: string } | null {
  const next = MILESTONES.find((m) => streakCount < m.days)
  if (!next) return null
  return {
    name: next.name,
    daysLeft: next.days - streakCount,
    emoji: next.emoji
  }
}

function getMiniJourneyX(dayIndex: number): number {
  const { startX, endX, totalDays } = MINI_JOURNEY_CONFIG
  return startX + (dayIndex / (totalDays - 1)) * (endX - startX)
}

// =============================================================================
// MiniJourney コンポーネント（Today画面用の小型版）
// =============================================================================

interface MiniJourneyProps {
  streakCount: number
  characterId?: string
}

export function MiniJourney({ streakCount, characterId = 'default' }: MiniJourneyProps) {
  const nextMilestone = getNextMilestone(streakCount)
  const characterImage = getCharacterImagePath(characterId)

  // スライディングウィンドウ: 現在位置が表示範囲の中央〜後半に来るように調整
  const safeStreak = Math.max(0, streakCount)
  const startDay = Math.max(1, safeStreak - Math.floor(MINI_JOURNEY_CONFIG.totalDays * 0.7) + 1)
  const endDay = startDay + MINI_JOURNEY_CONFIG.totalDays - 1

  const milestonesInRange = MILESTONES.filter((m) => m.days >= startDay && m.days <= endDay && m.icon)
  const { svgWidth, svgHeight, startX, endX, dotY, dotRadius, totalDays } = MINI_JOURNEY_CONFIG

  return (
    <div className="flex items-center gap-2">
      <img
        src={characterImage}
        alt="character"
        className="w-16 h-16 object-contain"
      />

      <div className="flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mini-journey-svg overflow-visible">
          <line x1={startX} y1={dotY} x2={endX} y2={dotY} className="mini-journey-road" />

          {Array.from({ length: totalDays }, (_, i) => {
            const day = startDay + i
            const isAchieved = day <= safeStreak
            const isCurrent = day === safeStreak && safeStreak > 0
            const x = getMiniJourneyX(i)

            const ringRadius = dotRadius + 3

            return (
              <g key={i}>
                {isCurrent && (
                  <circle
                    cx={x} cy={dotY} r={ringRadius}
                    className="mini-journey-dot-current-ring"
                  />
                )}
                <circle
                  cx={x}
                  cy={dotY}
                  r={dotRadius}
                  className={isAchieved ? 'mini-journey-dot-achieved' : 'mini-journey-dot-pending'}
                />
              </g>
            )
          })}

          {milestonesInRange.map((milestone) => {
            const windowIndex = milestone.days - startDay
            const x = getMiniJourneyX(windowIndex)
            const IconComponent = milestone.icon!
            const isReached = milestone.days <= safeStreak

            return (
              <g
                key={milestone.days}
                transform={`translate(${x - 5}, ${dotY - 14})`}
                className={isReached ? 'journey-milestone-reached' : 'journey-milestone-pending'}
              >
                <IconComponent size={10} strokeWidth={2} />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="text-right">
        {safeStreak > 0 && <span className="text-sm heading">{safeStreak}日</span>}
        {nextMilestone && (
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {nextMilestone.emoji} あと{nextMilestone.daysLeft}日
          </div>
        )}
      </div>
    </div>
  )
}
