import { useState } from 'react'
import type { Habit, HabitTime } from '@shared/types'
import { TimeChipEditable } from './TimeChipEditable'

interface TimeResponse {
  success: boolean
  data?: HabitTime
  error?: string
}

interface HabitEditCardProps {
  habit: Habit & { times: HabitTime[] }
  onEdit: () => void
  onDelete: () => void
  onUpdate: () => void
}

export function HabitEditCard({
  habit,
  onEdit,
  onDelete,
  onUpdate
}: HabitEditCardProps): JSX.Element {
  const [addingTime, setAddingTime] = useState(false)
  const [newTime, setNewTime] = useState('12:00')

  async function handleAddTime(): Promise<void> {
    if (habit.times.length >= 5) {
      alert('時刻は最大5つまでです')
      return
    }

    try {
      const res = await fetch(`/api/habits/${habit.id}/times`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTime })
      })
      const json: TimeResponse = await res.json()
      if (json.success) {
        setAddingTime(false)
        setNewTime('12:00')
        onUpdate()
      } else {
        alert(json.error || 'エラーが発生しました')
      }
    } catch {
      console.error('Failed to add time')
    }
  }

  async function handleDeleteTime(timeId: string): Promise<void> {
    if (habit.times.length <= 1) {
      alert('時刻は最低1つ必要です')
      return
    }

    try {
      const res = await fetch(`/api/habits/${habit.id}/times/${timeId}`, { method: 'DELETE' })
      if (res.ok) {
        onUpdate()
      }
    } catch {
      console.error('Failed to delete time')
    }
  }

  async function handleUpdateTime(timeId: string, newTimeValue: string): Promise<void> {
    try {
      await fetch(`/api/habits/${habit.id}/times/${timeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newTimeValue })
      })
      onUpdate()
    } catch {
      console.error('Failed to update time')
    }
  }

  async function handleToggleNotification(timeId: string, enabled: boolean): Promise<void> {
    try {
      await fetch(`/api/habits/${habit.id}/times/${timeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_enabled: enabled })
      })
      onUpdate()
    } catch {
      console.error('Failed to toggle notification')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{habit.icon || '✨'}</span>
          <span className="font-medium">{habit.title}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 rounded-full">
            ✏️
          </button>
          <button onClick={onDelete} className="p-2 rounded-full opacity-50 hover:opacity-100">
            🗑️
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {habit.times.map((time) => (
          <TimeChipEditable
            key={time.id}
            time={time}
            onDelete={() => handleDeleteTime(time.id)}
            onUpdate={(newTimeVal) => handleUpdateTime(time.id, newTimeVal)}
            onToggleNotification={(enabled) => handleToggleNotification(time.id, enabled)}
          />
        ))}

        {habit.times.length < 5 && !addingTime && (
          <button
            onClick={() => setAddingTime(true)}
            className="chip chip--time"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            ＋ 時間を追加
          </button>
        )}
      </div>

      {addingTime && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            autoComplete="off"
            data-form-type="other"
            className="p-2 rounded-lg"
            style={{ background: 'var(--bg-primary)' }}
          />
          <button onClick={handleAddTime} className="button button--primary px-4 py-2">
            追加
          </button>
          <button
            onClick={() => setAddingTime(false)}
            className="p-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
