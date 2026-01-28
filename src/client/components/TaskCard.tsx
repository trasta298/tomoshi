import { useState } from 'react'
import type { Task } from '@shared/types'

interface TaskCardProps {
  task: Task
  onToggle: (completed: boolean) => void
  onDelete: () => void
}

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const [animating, setAnimating] = useState(false)

  const handleToggle = () => {
    if (!task.completed) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }
    onToggle(!task.completed)
  }

  return (
    <div
      className={`card flex items-center gap-3 transition-all ${animating ? 'task-complete' : ''}`}
      style={{
        background: task.completed ? 'var(--mint)' : 'var(--bg-card)'
      }}
    >
      <button
        onClick={handleToggle}
        className={`checkbox-custom ${task.completed ? 'checked' : ''}`}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && (
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
        )}
      </button>

      <span
        className="flex-1"
        style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)'
        }}
      >
        {task.title}
      </span>

      <button
        onClick={onDelete}
        className="p-2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Delete task"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span>タスクを追加</span>
    </button>
  )
}
