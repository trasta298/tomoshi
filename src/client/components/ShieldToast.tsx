import { useState, useEffect } from 'react'

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

  if (!visible) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in"
      onClick={() => setVisible(false)}
    >
      <div
        className="px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        style={{ background: 'var(--lemon)' }}
      >
        <span className="text-2xl">🛡️</span>
        <span className="heading">炎が守られた</span>
      </div>
    </div>
  )
}
