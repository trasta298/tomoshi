import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@shared/types'
import { CompleteCheck } from './CompleteCheck'
import { cardVariants, spring } from '../styles/animations'

interface TaskCardProps {
  task: Task
  onToggle: (completed: boolean) => void
  onDelete: () => void
  onEdit?: (newTitle: string) => void
  onMoveToTomorrow?: () => void
  isNewlyPromoted?: boolean
}

export function TaskCard({ task, onToggle, onDelete, onEdit, onMoveToTomorrow, isNewlyPromoted }: TaskCardProps) {
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
    <motion.div
      layout
      variants={cardVariants}
      initial={isNewlyPromoted ? "hidden" : false}
      animate="visible"
      exit="exit"
      whileTap="tap"
      className="card flex items-center gap-3 relative"
      style={{
        background: task.completed ? 'var(--mint)' : 'var(--bg-card)',
        transition: 'background 0.3s ease'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={handleToggle}
        className="checkbox-custom-wrapper relative"
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <AnimatePresence mode="wait">
          {task.completed ? (
            <motion.div
              key="checked"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={spring.bouncy}
            >
              <CompleteCheck size="sm" sparkle={true} />
            </motion.div>
          ) : (
            <motion.div
              key="unchecked"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={spring.bouncy}
              className="checkbox-custom"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <motion.span
        layout
        className="flex-1 cursor-pointer select-none"
        onClick={handleToggle}
        animate={{
          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
          opacity: task.completed ? 0.6 : 1
        }}
        transition={{ duration: 0.2 }}
        style={{ textDecoration: task.completed ? 'line-through' : 'none' }}
      >
        {task.title}
      </motion.span>

      <button
        onPointerDownCapture={(e) => e.stopPropagation()}
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
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onPointerDownCapture={(e) => {
                e.stopPropagation()
                setShowMenu(false)
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface EmptyTaskSlotProps {
  onClick: () => void
  disabled?: boolean
}

export function EmptyTaskSlot({ onClick, disabled }: EmptyTaskSlotProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
      <span>やりたいこと</span>
    </motion.button>
  )
}
