import { useState, useEffect } from 'react'

// マイルストーン定義
const MILESTONES = [
  { days: 7, name: '草原', emoji: '🌱' },
  { days: 14, name: '森', emoji: '🌳' },
  { days: 21, name: '川', emoji: '🏞️' },
  { days: 30, name: '山', emoji: '⛰️' },
  { days: 50, name: '砂漠', emoji: '🏜️' },
  { days: 100, name: '城', emoji: '🏰' }
]

interface MilestoneToastProps {
  streakCount: number
}

export function MilestoneToast({ streakCount }: MilestoneToastProps) {
  const [visible, setVisible] = useState(false)
  const [milestone, setMilestone] = useState<{ days: number; name: string; emoji: string } | null>(
    null
  )

  useEffect(() => {
    // マイルストーンに達しているかチェック
    const reachedMilestone = MILESTONES.find((m) => m.days === streakCount)
    if (!reachedMilestone) return

    // 今日すでに表示済みかチェック
    const today = new Date().toISOString().split('T')[0]
    const key = `milestoneToastShown-${reachedMilestone.days}-${today}`
    if (localStorage.getItem(key)) return

    // 表示してローカルストレージに記録
    setMilestone(reachedMilestone)
    setVisible(true)
    localStorage.setItem(key, 'true')

    // 5秒後に消える
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [streakCount])

  if (!visible || !milestone) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setVisible(false)}
      />
      <div
        className="relative bg-[var(--bg-card)] rounded-2xl p-8 text-center animate-fade-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{milestone.emoji}</div>
        <h2 className="heading text-xl mb-2">
          {milestone.name}に到着！
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {streakCount}日連続達成おめでとう！
        </p>
        <div className="mt-4 flex justify-center gap-1">
          <span className="text-xl">✨</span>
          <span className="text-xl">🎉</span>
          <span className="text-xl">✨</span>
        </div>
      </div>
    </div>
  )
}
