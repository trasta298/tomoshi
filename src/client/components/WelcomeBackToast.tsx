import { useState, useEffect } from 'react'

interface WelcomeBackToastProps {
  lastActiveDate?: string // 前回アクティブだった日付 (YYYY-MM-DD)
  streakCount: number
}

// メッセージパターン (design.md 仕様)
function getWelcomeMessage(daysSinceActive: number, streakCount: number): { emoji: string; message: string } | null {
  // ストリークが継続中なら復帰メッセージは不要
  if (streakCount > 0 && daysSinceActive <= 1) {
    return null
  }

  // 前回から何日経ったかでメッセージを変える
  if (daysSinceActive >= 8) {
    // 長期離脱後（8日以上）
    return { emoji: '🌟', message: '待ってたよ！' }
  } else if (daysSinceActive >= 2) {
    // 再開時（2-7日）
    return { emoji: '👋', message: 'おかえり！一緒にまた歩こう' }
  } else if (streakCount === 0) {
    // ストリーク途切れた時（前日に達成なし）
    return { emoji: '🌱', message: 'また新しい旅が始まるね' }
  }

  return null
}

export function WelcomeBackToast({ lastActiveDate, streakCount }: WelcomeBackToastProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<{ emoji: string; message: string } | null>(null)

  useEffect(() => {
    // 今日すでに表示済みかチェック
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const storageKey = `welcomeBackToastShown-${today}`

    if (localStorage.getItem(storageKey)) {
      return
    }

    // 前回アクティブ日がない場合は新規ユーザー
    if (!lastActiveDate) {
      return
    }

    // 日数計算
    const lastActive = new Date(lastActiveDate + 'T00:00:00')
    const todayDate = new Date(today + 'T00:00:00')
    const daysSinceActive = Math.floor(
      (todayDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    )

    // メッセージ取得
    const welcomeMessage = getWelcomeMessage(daysSinceActive, streakCount)

    if (welcomeMessage) {
      setMessage(welcomeMessage)
      setVisible(true)
      localStorage.setItem(storageKey, 'true')

      // 5秒後に消える
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [lastActiveDate, streakCount])

  if (!visible || !message) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in"
      onClick={() => setVisible(false)}
    >
      <div
        className="px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        style={{ background: 'var(--mint)' }}
      >
        <span className="text-2xl">{message.emoji}</span>
        <span className="heading">{message.message}</span>
      </div>
    </div>
  )
}
