import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Task } from '@shared/types'
import { CompleteCheck } from './CompleteCheck.js'
import { cardVariants } from '../styles/animations.js'

interface TaskCardProps {
  task: Task
  onToggle: (completed: boolean) => void
  onDelete: () => void
  onEdit?: (newTitle: string) => void
  onMoveToTomorrow?: () => void
  onDemoteToMoya?: () => void
  tomorrowTaskCount?: number
}

export function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  onMoveToTomorrow,
  onDemoteToMoya,
  tomorrowTaskCount
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom')
  const longPressTimer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

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
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="card flex items-center gap-3 relative"
      style={{
        background: task.completed ? 'var(--mint)' : 'var(--bg-card)',
        transition: 'background 0.3s ease'
      }}
    >
      {/* タップ可能な領域（チェックボックスとタイトル） */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="flex items-center gap-3 flex-1"
      >
        <button
          onClick={handleToggle}
          className="checkbox-custom-wrapper relative"
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.completed ? (
            <CompleteCheck size="sm" sparkle={true} />
          ) : (
            <div className="checkbox-custom" />
          )}
        </button>

        <span
          className="flex-1 cursor-pointer select-none transition-colors"
          onClick={handleToggle}
          style={{
            color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
            opacity: task.completed ? 0.6 : 1,
            textDecoration: task.completed ? 'line-through' : 'none'
          }}
        >
          {task.title}
        </span>
      </motion.div>

      {/* 三点リーダーボタン（独立した領域） */}
      <button
        ref={menuButtonRef}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={handleMenuToggle}
        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
        style={{ touchAction: 'manipulation' }}
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
              initial={{ opacity: 0, scale: 0.9, y: menuPosition === 'bottom' ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: menuPosition === 'bottom' ? 10 : -10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className={`absolute right-0 z-50 rounded-xl shadow-lg overflow-hidden ${
                menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
              }`}
              style={{ background: 'var(--bg-card)', maxWidth: 'calc(100vw - 32px)' }}
            >
              <button
                onClick={handleEdit}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
              >
                <span>✏️</span>
                <span>編集</span>
              </button>
              {onMoveToTomorrow && !task.completed && (tomorrowTaskCount ?? 0) < 3 && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onMoveToTomorrow()
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
                >
                  <span>📅</span>
                  <span>あしたへ</span>
                </button>
              )}
              {onDemoteToMoya && !task.completed && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onDemoteToMoya()
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-primary)]"
                >
                  <span>💭</span>
                  <span>もやもやへ</span>
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
