import { useState, useEffect } from 'react'
import { Toast } from './Toast.js'

interface WelcomeBackToastProps {
  lastActiveDate?: string // 前回アクティブだった日付 (YYYY-MM-DD)
  streakCount: number
}

interface WelcomeMessage {
  emoji: string
  message: string
}

/**
 * 復帰メッセージを取得（design.md 仕様）
 * - 長期離脱後（8日以上）: 「待ってたよ！」
 * - 再開時（2-7日）: 「おかえり！一緒にまた歩こう」
 * - ストリーク途切れ時: 「また新しい旅が始まるね」
 */
function getWelcomeMessage(daysSinceActive: number, streakCount: number): WelcomeMessage | null {
  // ストリークが継続中なら復帰メッセージは不要
  const isStreakActive = streakCount > 0 && daysSinceActive <= 1
  if (isStreakActive) {
    return null
  }

  // 長期離脱後（8日以上）
  if (daysSinceActive >= 8) {
    return { emoji: '🌟', message: '待ってたよ！' }
  }

  // 再開時（2-7日）
  if (daysSinceActive >= 2) {
    return { emoji: '👋', message: 'おかえり！一緒にまた歩こう' }
  }

  // ストリーク途切れた時（前日に達成なし）
  if (streakCount === 0) {
    return { emoji: '🌱', message: 'また新しい旅が始まるね' }
  }

  return null
}

export function WelcomeBackToast({
  lastActiveDate,
  streakCount
}: WelcomeBackToastProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<WelcomeMessage | null>(null)

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

  if (!message) return null

  return (
    <Toast
      visible={visible}
      onClose={() => setVisible(false)}
      emoji={message.emoji}
      message={message.message}
      background="var(--mint)"
    />
  )
}
