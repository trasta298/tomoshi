import { useState, useRef, useEffect } from 'react'
import type { Task } from '@shared/types'
import { CompleteCheck } from './CompleteCheck'

interface TaskCardProps {
  task: Task
  onToggle: (completed: boolean) => void
  onDelete: () => void
  onEdit?: (newTitle: string) => void
  onMoveToTomorrow?: () => void
  isNewlyPromoted?: boolean
}

export function TaskCard({ task, onToggle, onDelete, onEdit, onMoveToTomorrow, isNewlyPromoted }: TaskCardProps) {
  const [animating, setAnimating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const longPressTimer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleToggle = () => {
    if (editing || showMenu) return
    if (!task.completed) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }
    onToggle(!task.completed)
  }

  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setShowMenu(true)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleEdit = () => {
    setShowMenu(false)
    setEditing(true)
    setEditTitle(task.title)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title && onEdit) {
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
        <button
          onClick={handleCancelEdit}
          className="p-2 opacity-50"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      className={`card flex items-center gap-3 transition-all relative ${animating ? 'task-complete' : ''} ${isNewlyPromoted ? 'promote-fade-in' : ''}`}
      style={{
        background: task.completed ? 'var(--mint)' : 'var(--bg-card)'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <button
        onClick={handleToggle}
        className="checkbox-custom-wrapper"
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && animating ? (
          <CompleteCheck size="sm" />
        ) : task.completed ? (
          <div className="checkbox-custom checked">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <div className="checkbox-custom" />
        )}
      </button>

      <span
        className="flex-1 cursor-pointer"
        onClick={handleToggle}
        style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)'
        }}
      >
        {task.title}
      </span>

      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="More options"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-lg overflow-hidden"
            style={{ background: 'var(--bg-card)' }}
          >
            <button
              onClick={handleEdit}
              className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
            >
              <span>✏️</span>
              <span>編集</span>
            </button>
            {onMoveToTomorrow && !task.completed && (
              <button
                onClick={() => {
                  setShowMenu(false)
                  onMoveToTomorrow()
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
              >
                <span>📅</span>
                <span>明日へ</span>
              </button>
            )}
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
          </div>
        </>
      )}
    </div>
  )
}

interface EmptyTaskSlotProps {
  onClick: () => void
  disabled?: boolean
}

export function EmptyTaskSlot({ onClick, disabled }: EmptyTaskSlotProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors"
      style={{
        borderColor: 'var(--text-secondary)',
        color: 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <span>＋</span>
      <span>タスクを追加</span>
    </button>
  )
}
