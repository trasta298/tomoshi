import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@shared/types'
import { ModalWrapper } from './ModalWrapper.js'
import { useTomorrowTasks } from '../hooks/useTomorrowTasks.js'
import { cardVariants } from '../styles/animations.js'

interface TomorrowTasksModalProps {
  isOpen: boolean
  onClose: () => void
  todayTaskCount: number
}

const errorMessages: Record<string, string> = {
  'Maximum 3 tasks per day': 'あしたは3つまでだよ',
  'Task not found': 'タスクが見つかりません'
}

function translateError(error: string): string {
  return errorMessages[error] || error
}

export function TomorrowTasksModal({
  isOpen,
  onClose,
  todayTaskCount
}: TomorrowTasksModalProps) {
  const { tasks, loading, fetchTasks, addTask, moveToToday, edit, remove } = useTomorrowTasks()
  const [error, setError] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTasks()
      setError(null)
      setShowInput(false)
      setInputValue('')
    }
  }, [isOpen, fetchTasks])

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const canMoveToToday = todayTaskCount < 3
  const canAddMore = tasks.length < 3

  const handleMoveToToday = async (taskId: string) => {
    setError(null)
    const result = await moveToToday(taskId)
    if (!result.success && result.error) {
      setError(translateError(result.error))
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !canAddMore) return

    setError(null)
    const result = await addTask(inputValue.trim())
    if (result) {
      setInputValue('')
      setShowInput(false)
    } else {
      setError('追加に失敗しました')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowInput(false)
      setInputValue('')
    }
  }

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      setShowInput(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div className="p-6 pb-8">
        <h2 className="heading text-lg mb-4 text-center">あしたの3つ</h2>

        {error && (
          <div
            className="p-3 rounded-xl mb-4 text-sm"
            style={{ background: 'var(--coral)', color: 'var(--text-primary)' }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            読み込み中...
          </div>
        ) : (
          <>
            {/* タスク一覧 */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <TomorrowTaskCard
                    key={task.id}
                    task={task}
                    onMoveToToday={() => handleMoveToToday(task.id)}
                    onEdit={(title) => edit(task.id, title)}
                    onDelete={() => remove(task.id)}
                    canMoveToToday={canMoveToToday}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* 空スロット・入力フォーム（スクロール外） */}
            {canAddMore && !showInput && (
              <button
                onClick={() => setShowInput(true)}
                className="w-full mt-3 p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors"
                style={{
                  borderColor: 'var(--text-secondary)',
                  color: 'var(--text-secondary)',
                  opacity: 0.6
                }}
              >
                <span className="text-lg">+</span>
                <span>やりたいこと</span>
              </button>
            )}

            {showInput && (
              <form onSubmit={handleAdd} className="mt-3 space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onBlur={handleInputBlur}
                  placeholder="あしたやりたいこと..."
                  maxLength={100}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  className="input-field"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="button button--primary w-full"
                  style={{
                    opacity: inputValue.trim() ? 1 : 0.5,
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  追加する
                </button>
              </form>
            )}
          </>
        )}

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

interface TomorrowTaskCardProps {
  task: Task
  onMoveToToday: () => void
  onEdit: (title: string) => void
  onDelete: () => void
  canMoveToToday: boolean
}

function TomorrowTaskCard({
  task,
  onMoveToToday,
  onEdit,
  onDelete,
  canMoveToToday
}: TomorrowTaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleEdit = () => {
    setShowMenu(false)
    setEditing(true)
    setEditTitle(task.title)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onEdit(editTitle.trim())
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditTitle(task.title)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleMenuToggle = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      const bottomNav = document.querySelector('.bottom-nav')
      const footerHeight = bottomNav?.getBoundingClientRect().height ?? 0
      const spaceBelow = window.innerHeight - rect.bottom - footerHeight
      const menuHeight = 200 // 推定メニュー高さ
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom')
    }
    setShowMenu(!showMenu)
  }

  if (editing) {
    return (
      <div className="card flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveEdit}
          maxLength={100}
          autoComplete="off"
          data-form-type="other"
          className="flex-1 p-2 rounded-lg"
          style={{ background: 'var(--bg-primary)' }}
        />
        <button
          onClick={handleSaveEdit}
          className="p-2"
          style={{ color: 'var(--text-primary)' }}
        >
          ✓
        </button>
        <button onClick={handleCancelEdit} className="p-2 opacity-50">
          ×
        </button>
      </div>
    )
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="card flex items-center gap-3 relative"
    >
      <span className="flex-1 truncate">{task.title}</span>

      <button
        ref={menuButtonRef}
        onClick={handleMenuToggle}
        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="More options"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: menuPosition === 'bottom' ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: menuPosition === 'bottom' ? 10 : -10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className={`absolute right-0 z-50 rounded-xl shadow-lg overflow-hidden ${
                menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
              }`}
              style={{ background: 'var(--bg-card)' }}
            >
              <button
                onClick={handleEdit}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
              >
                <span>✏️</span>
                <span>編集</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  onMoveToToday()
                }}
                disabled={!canMoveToToday}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
                style={{ opacity: canMoveToToday ? 1 : 0.5 }}
              >
                <span>📅</span>
                <span>きょうへ</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
                style={{ color: '#e57373' }}
              >
                <span>🗑️</span>
                <span>削除</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
