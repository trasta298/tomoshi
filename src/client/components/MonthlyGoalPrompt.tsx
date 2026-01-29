import { useState, useEffect } from 'react'
import { ModalWrapper } from './ModalWrapper'
import { useDataCache } from '../hooks/useDataCache'

interface MonthlyGoalPromptProps {
  onClose: () => void
}

interface GoalApiResponse {
  success: boolean
  data?: { monthly_goal?: string }
}

type PromptType = 'start' | 'end' | null

function getPromptType(): PromptType {
  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  // 月初（1-3日）
  if (day <= 3) return 'start'
  // 月末（最後の3日）
  if (day >= daysInMonth - 2) return 'end'
  return null
}

function getStorageKey(): string {
  const now = new Date()
  return `monthlyGoalPrompt-${now.getFullYear()}-${now.getMonth()}`
}

export function MonthlyGoalPrompt({ onClose }: MonthlyGoalPromptProps) {
  const [promptType, setPromptType] = useState<PromptType>(null)
  const [currentGoal, setCurrentGoal] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [loading, setLoading] = useState(true)
  const [achieved, setAchieved] = useState<boolean | null>(null)
  const { invalidate } = useDataCache()

  useEffect(() => {
    const type = getPromptType()
    if (!type) {
      onClose()
      return
    }

    // 今月すでに表示済みかチェック
    const key = getStorageKey()
    const shown = localStorage.getItem(key)
    if (shown === type) {
      onClose()
      return
    }

    // 目標を取得
    fetch('/api/settings/goal')
      .then((res) => res.json() as Promise<GoalApiResponse>)
      .then((json) => {
        if (json.success && json.data) {
          setCurrentGoal(json.data.monthly_goal || '')
        }
        setPromptType(type)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        onClose()
      })
  }, [onClose])

  const handleSaveNewGoal = async () => {
    await fetch('/api/settings/goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_goal: newGoal || null })
    })
    invalidate('settings', 'today')
    markAsShown()
    onClose()
  }

  const handleSkip = () => {
    markAsShown()
    onClose()
  }

  const handleAchievement = async (didAchieve: boolean) => {
    setAchieved(didAchieve)
    // 達成記録をログに残す（オプション）
    setTimeout(() => {
      markAsShown()
      onClose()
    }, 2000)
  }

  const markAsShown = () => {
    const key = getStorageKey()
    localStorage.setItem(key, promptType || '')
  }

  if (loading || !promptType) {
    return null
  }

  // 月末：達成チェック
  if (promptType === 'end') {
    if (achieved !== null) {
      return (
        <ModalWrapper onClose={onClose} position="center" maxWidth="max-w-sm">
          <div className="p-6 text-center">
            <span className="text-5xl">{achieved ? '🎉' : '🌱'}</span>
            <h2 className="heading text-xl mt-4">
              {achieved ? 'おめでとう！' : 'また来月がんばろう'}
            </h2>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              {achieved ? '目標を達成したね！すごい！' : '挑戦したことが大切だよ'}
            </p>
          </div>
        </ModalWrapper>
      )
    }

    if (!currentGoal) {
      onClose()
      return null
    }

    return (
      <ModalWrapper onClose={handleSkip} position="center" maxWidth="max-w-sm">
        <div className="p-6">
          <div className="text-center mb-4">
            <span className="text-4xl">📊</span>
            <h2 className="heading text-lg mt-2">今月のふりかえり</h2>
          </div>

          <div
            className="p-4 rounded-xl mb-4 text-center"
            style={{ background: 'var(--lemon)' }}
          >
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              今月の目標
            </p>
            <p className="heading text-lg">{currentGoal}</p>
          </div>

          <p className="text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
            達成できた？
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleAchievement(true)}
              className="flex-1 py-3 rounded-xl text-center"
              style={{ background: 'var(--mint)' }}
            >
              できた！
            </button>
            <button
              onClick={() => handleAchievement(false)}
              className="flex-1 py-3 rounded-xl text-center"
              style={{ background: 'var(--lavender)' }}
            >
              もう少し...
            </button>
          </div>

          <button
            onClick={handleSkip}
            className="w-full mt-3 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            あとで
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // 月初：新しい目標を設定
  return (
    <ModalWrapper onClose={handleSkip} position="center" maxWidth="max-w-sm">
      <div className="p-6">
        <div className="text-center mb-4">
          <span className="text-4xl">🌟</span>
          <h2 className="heading text-lg mt-2">新しい月のはじまり</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            今月の目標を決めよう
          </p>
        </div>

        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="今月達成したいことを1つ..."
          maxLength={100}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          className="w-full p-3 rounded-xl mb-4"
          style={{ background: 'var(--bg-primary)' }}
          autoFocus
        />

        <button
          onClick={handleSaveNewGoal}
          disabled={!newGoal.trim()}
          className="button button--primary w-full"
          style={{ opacity: newGoal.trim() ? 1 : 0.5 }}
        >
          目標を決める
        </button>

        <button
          onClick={handleSkip}
          className="w-full mt-3 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          スキップ
        </button>
      </div>
    </ModalWrapper>
  )
}

// 月初・月末にプロンプトが必要かチェック
export function shouldShowMonthlyGoalPrompt(): boolean {
  const type = getPromptType()
  if (!type) return false

  const key = getStorageKey()
  const shown = localStorage.getItem(key)
  return shown !== type
}
