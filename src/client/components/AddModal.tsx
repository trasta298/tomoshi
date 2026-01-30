import { useState, useRef, useEffect } from 'react'
import { ModalWrapper } from './ModalWrapper.js'
import { fetchTomorrowTaskCount } from '../hooks/useTomorrowTasks.js'

type AddModalMode = 'task' | 'moya' | 'both'
type TargetDate = 'today' | 'tomorrow'

interface AddModalProps {
  isOpen: boolean
  onClose: () => void
  onAddTask: (title: string, date?: string) => void
  onAddMoya: (content: string) => void
  canAddTask: boolean
  /** 'task' = タスク追加のみ, 'moya' = もやもや追加のみ, 'both' = タブで切り替え */
  initialMode?: AddModalMode
}

/** 明日の日付を YYYY-MM-DD 形式で取得（Asia/Tokyo） */
function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export function AddModal({
  isOpen,
  onClose,
  onAddTask,
  onAddMoya,
  canAddTask,
  initialMode = 'both'
}: AddModalProps) {
  const [mode, setMode] = useState<'task' | 'moya'>('task')
  const [targetDate, setTargetDate] = useState<TargetDate>('today')
  const [value, setValue] = useState('')
  const [tomorrowTaskCount, setTomorrowTaskCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const canAddTomorrow = tomorrowTaskCount < 3

  useEffect(() => {
    if (!isOpen) return

    setValue('')
    setTargetDate('today')

    // initialModeに基づいてモードを設定
    switch (initialMode) {
      case 'task':
        setMode('task')
        break
      case 'moya':
        setMode('moya')
        break
      case 'both':
      default:
        // タスク追加可能ならtask、そうでなければmoya
        setMode(canAddTask ? 'task' : 'moya')
        break
    }

    setTimeout(() => inputRef.current?.focus(), 100)

    // 明日のタスク件数を取得
    fetchTomorrowTaskCount().then(setTomorrowTaskCount)
  }, [isOpen, canAddTask, initialMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    if (mode === 'task') {
      if (targetDate === 'tomorrow') {
        onAddTask(value.trim(), getTomorrowDateString())
        // 件数を即座にインクリメント（楽観的更新）
        setTomorrowTaskCount((c) => c + 1)
      } else {
        onAddTask(value.trim())
      }
    } else {
      onAddMoya(value.trim())
    }

    setValue('')
    onClose()
  }

  if (!isOpen) return null

  // タブを表示するかどうか
  const showTabs = initialMode === 'both'
  const isTaskMode = mode === 'task'

  // タイトルの決定
  function getTitle(): string {
    if (mode === 'moya') {
      return 'もやもやを追加'
    }
    if (targetDate === 'today') {
      return 'きょうの3つに追加'
    }
    return 'あしたの3つに追加'
  }

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div className="p-6 pb-8">
        {/* ヘッダー（タブなしの場合） */}
        {!showTabs && (
          <h2 className="heading text-lg mb-4 text-center">{getTitle()}</h2>
        )}

        {/* Mode tabs（'both'モードのみ表示） */}
        {showTabs && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('task')}
              disabled={!canAddTask && targetDate === 'today'}
              className={`flex-1 py-2 rounded-full heading text-sm transition-colors ${
                mode === 'task' ? 'bg-[var(--coral)]' : 'bg-transparent'
              }`}
              style={{
                opacity: canAddTask || targetDate === 'tomorrow' ? 1 : 0.5,
                cursor: canAddTask || targetDate === 'tomorrow' ? 'pointer' : 'not-allowed'
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

        {/* 日付選択（タスクモード時のみ） */}
        {isTaskMode && (
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              いつ?
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetDate('today')}
                disabled={!canAddTask}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  targetDate === 'today' ? 'bg-[var(--mint)]' : 'bg-[var(--bg-primary)]'
                }`}
                style={{
                  opacity: canAddTask ? 1 : 0.5,
                  cursor: canAddTask ? 'pointer' : 'not-allowed'
                }}
              >
                きょう
              </button>
              <button
                onClick={() => setTargetDate('tomorrow')}
                disabled={!canAddTomorrow}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  targetDate === 'tomorrow' ? 'bg-[var(--lavender)]' : 'bg-[var(--bg-primary)]'
                }`}
                style={{
                  opacity: canAddTomorrow ? 1 : 0.5,
                  cursor: canAddTomorrow ? 'pointer' : 'not-allowed'
                }}
              >
                あした
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              mode === 'task'
                ? targetDate === 'today'
                  ? 'きょうやりたいこと...'
                  : 'あしたやりたいこと...'
                : '気になることを入れておこう...'
            }
            maxLength={mode === 'task' ? 100 : 200}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            className="input-field mb-4"
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
