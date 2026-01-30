import { useState, useEffect } from 'react'
import { Toast } from './Toast.js'

interface ShieldToastProps {
  shieldConsumedAt?: number
}

export function ShieldToast({ shieldConsumedAt }: ShieldToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!shieldConsumedAt) return

    // 今日消費されたシールドかチェック
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const consumedDate = new Date(shieldConsumedAt)
    consumedDate.setHours(0, 0, 0, 0)

    if (consumedDate.getTime() !== today.getTime()) return

    // 今日すでに表示済みかチェック
    const key = `shieldToastShown-${today.toISOString().split('T')[0]}`
    if (localStorage.getItem(key)) return

    // 表示してローカルストレージに記録
    setVisible(true)
    localStorage.setItem(key, 'true')

    // 5秒後に消える
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [shieldConsumedAt])

  return (
    <Toast
      visible={visible}
      onClose={() => setVisible(false)}
      emoji="🛡️"
      message="炎が守られた"
      background="var(--lemon)"
    />
  )
}
