import { useState } from 'react'
import type { HabitTime } from '@shared/types'

interface TimeChipEditableProps {
  time: HabitTime
  onDelete: () => void
  onUpdate: (newTime: string) => void
  onToggleNotification: (enabled: boolean) => void
}

export function TimeChipEditable({
  time,
  onDelete,
  onUpdate,
  onToggleNotification
}: TimeChipEditableProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(time.time.slice(0, 5))

  function handleSave(): void {
    onUpdate(editValue + ':00')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoComplete="off"
          data-form-type="other"
          className="p-1 rounded text-sm"
          style={{ background: 'var(--bg-primary)' }}
          autoFocus
        />
        <button onClick={handleSave} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-base">
          ✓
        </button>
        <button onClick={() => setEditing(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-base opacity-50">
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="chip chip--time flex items-center gap-1" style={{ cursor: 'pointer' }}>
      <span onClick={() => setEditing(true)}>{time.time.slice(0, 5)}</span>
      <button
        onClick={() => onToggleNotification(!time.notification_enabled)}
        className="text-xs"
        title={time.notification_enabled ? '通知ON' : '通知OFF'}
      >
        {time.notification_enabled ? '🔔' : '🔕'}
      </button>
      <button onClick={onDelete} className="text-xs opacity-50 hover:opacity-100">
        ×
      </button>
    </div>
  )
}
