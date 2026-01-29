import { useState, useRef, useEffect } from 'react'
import { ModalWrapper } from './ModalWrapper'

type AddModalMode = 'task' | 'moya' | 'both'

interface AddModalProps {
  isOpen: boolean
  onClose: () => void
  onAddTask: (title: string) => void
  onAddMoya: (content: string) => void
  canAddTask: boolean
  /** 'task' = タスク追加のみ, 'moya' = もやもや追加のみ, 'both' = タブで切り替え */
  initialMode?: AddModalMode
}

export function AddModal({ isOpen, onClose, onAddTask, onAddMoya, canAddTask, initialMode = 'both' }: AddModalProps) {
  const [mode, setMode] = useState<'task' | 'moya'>('task')
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      // initialModeに基づいてモードを設定
      if (initialMode === 'task') {
        setMode('task')
      } else if (initialMode === 'moya') {
        setMode('moya')
      } else {
        // 'both'の場合、タスク追加可能ならtask、そうでなければmoya
        setMode(canAddTask ? 'task' : 'moya')
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, canAddTask, initialMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    if (mode === 'task') {
      onAddTask(value.trim())
    } else {
      onAddMoya(value.trim())
    }

    setValue('')
    onClose()
  }

  if (!isOpen) return null

  // タブを表示するかどうか
  const showTabs = initialMode === 'both'

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div className="p-6 pb-8">
        {/* ヘッダー（タブなしの場合） */}
        {!showTabs && (
          <h2 className="heading text-lg mb-4 text-center">
            {mode === 'task' ? 'きょうの3つに追加' : 'もやもやを追加'}
          </h2>
        )}

        {/* Mode tabs（'both'モードのみ表示） */}
        {showTabs && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('task')}
              disabled={!canAddTask}
              className={`flex-1 py-2 rounded-full heading text-sm transition-colors ${
                mode === 'task' ? 'bg-[var(--coral)]' : 'bg-transparent'
              }`}
              style={{
                opacity: canAddTask ? 1 : 0.5,
                cursor: canAddTask ? 'pointer' : 'not-allowed'
              }}
            >
              きょうの3つ
            </button>
            <button
              onClick={() => setMode('moya')}
              className={`flex-1 py-2 rounded-full heading text-sm transition-colors ${
                mode === 'moya' ? 'bg-[var(--lavender)]' : 'bg-transparent'
              }`}
            >
              もやもや
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'task' ? '今日やることを入力...' : '気になることを入れておこう...'}
            maxLength={mode === 'task' ? 100 : 200}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            className="w-full p-4 rounded-2xl mb-4"
            style={{ background: 'var(--bg-primary)' }}
          />

          <button
            type="submit"
            disabled={!value.trim()}
            className="button button--primary w-full"
            style={{
              opacity: value.trim() ? 1 : 0.5,
              cursor: value.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            追加する
          </button>
        </form>

        {/* Close handle */}
        <div className="flex justify-center mt-4">
          <div
            className="w-12 h-1 rounded-full"
            style={{ background: 'var(--text-secondary)', opacity: 0.3 }}
          />
        </div>
      </div>
    </ModalWrapper>
  )
}

// Floating add button
interface FloatingButtonProps {
  onClick: () => void
}

export function FloatingButton({ onClick }: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center floating-button z-40"
      style={{
        background: 'var(--coral)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      aria-label="Add new item"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
