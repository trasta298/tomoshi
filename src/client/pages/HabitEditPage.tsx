import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Habit, HabitTime, HabitWithTimes } from '@shared/types'
import { ModalWrapper } from '../components/ModalWrapper'

interface HabitsResponse {
  success: boolean
  data?: (Habit & { times: HabitTime[] })[]
}

interface HabitResponse {
  success: boolean
  data?: Habit & { times: HabitTime[] }
  error?: string
}

interface TimeResponse {
  success: boolean
  data?: HabitTime
  error?: string
}

const EMOJI_OPTIONS = ['💊', '🚶', '💧', '📖', '🏃', '🧘', '💪', '🍎', '😴', '✨']

export function HabitEditPage() {
  const navigate = useNavigate()
  const [habits, setHabits] = useState<(Habit & { times: HabitTime[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<(Habit & { times: HabitTime[] }) | null>(null)

  useEffect(() => {
    fetchHabits()
  }, [])

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits')
      const json: HabitsResponse = await res.json()
      if (json.success && json.data) {
        setHabits(json.data)
      }
    } catch {
      console.error('Failed to load habits')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('この習慣を削除しますか？')) return

    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' })
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== habitId))
      }
    } catch {
      console.error('Failed to delete habit')
    }
  }

  const canAddHabit = habits.length < 3

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 -ml-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← 戻る
        </button>
        <h1 className="heading text-xl">まいにちの習慣</h1>
        <div className="w-10" />
      </div>

      {/* Habit list */}
      <div className="space-y-4">
        {habits.map((habit) => (
          <HabitEditCard
            key={habit.id}
            habit={habit}
            onEdit={() => setEditingHabit(habit)}
            onDelete={() => handleDeleteHabit(habit.id)}
            onUpdate={fetchHabits}
          />
        ))}

        {/* Add new habit button */}
        {canAddHabit ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2"
            style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}
          >
            <span>＋</span>
            <span>習慣を追加</span>
          </button>
        ) : (
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            習慣は最大3つまでです
          </p>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchHabits()
          }}
        />
      )}

      {/* Edit modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSuccess={() => {
            setEditingHabit(null)
            fetchHabits()
          }}
        />
      )}
    </div>
  )
}

interface HabitEditCardProps {
  habit: Habit & { times: HabitTime[] }
  onEdit: () => void
  onDelete: () => void
  onUpdate: () => void
}

function HabitEditCard({ habit, onEdit, onDelete, onUpdate }: HabitEditCardProps) {
  const [addingTime, setAddingTime] = useState(false)
  const [newTime, setNewTime] = useState('12:00')

  const handleAddTime = async () => {
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

  const handleDeleteTime = async (timeId: string) => {
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

  const handleUpdateTime = async (timeId: string, newTimeValue: string) => {
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

  const handleToggleNotification = async (timeId: string, enabled: boolean) => {
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
          <button
            onClick={onEdit}
            className="p-2 rounded-full"
            style={{ background: 'var(--bg-primary)' }}
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-full opacity-50 hover:opacity-100"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Time chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {habit.times.map((time) => (
          <TimeChipEditable
            key={time.id}
            time={time}
            onDelete={() => handleDeleteTime(time.id)}
            onUpdate={(newTime) => handleUpdateTime(time.id, newTime)}
            onToggleNotification={(enabled) => handleToggleNotification(time.id, enabled)}
          />
        ))}

        {/* Add time button */}
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

      {/* Add time input */}
      {addingTime && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="p-2 rounded-lg"
            style={{ background: 'var(--bg-primary)' }}
          />
          <button
            onClick={handleAddTime}
            className="button button--primary px-4 py-2"
          >
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

interface TimeChipEditableProps {
  time: HabitTime
  onDelete: () => void
  onUpdate: (newTime: string) => void
  onToggleNotification: (enabled: boolean) => void
}

function TimeChipEditable({ time, onDelete, onUpdate, onToggleNotification }: TimeChipEditableProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(time.time.slice(0, 5))

  const handleSave = () => {
    onUpdate(editValue + ':00')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="p-1 rounded text-sm"
          style={{ background: 'var(--bg-primary)' }}
          autoFocus
        />
        <button onClick={handleSave} className="text-sm">✓</button>
        <button onClick={() => setEditing(false)} className="text-sm">×</button>
      </div>
    )
  }

  return (
    <div
      className="chip chip--time flex items-center gap-1"
      style={{ cursor: 'pointer' }}
    >
      <span onClick={() => setEditing(true)}>{time.time.slice(0, 5)}</span>
      <button
        onClick={() => onToggleNotification(!time.notification_enabled)}
        className="text-xs"
        title={time.notification_enabled ? '通知ON' : '通知OFF'}
      >
        {time.notification_enabled ? '🔔' : '🔕'}
      </button>
      <button
        onClick={onDelete}
        className="text-xs opacity-50 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

interface AddHabitModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddHabitModal({ onClose, onSuccess }: AddHabitModalProps) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('✨')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [submitting, setSubmitting] = useState(false)

  const handleAddTime = () => {
    if (times.length >= 5) return
    setTimes([...times, '12:00'])
  }

  const handleRemoveTime = (index: number) => {
    if (times.length <= 1) return
    setTimes(times.filter((_, i) => i !== index))
  }

  const handleUpdateTime = (index: number, value: string) => {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('名前を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          times: times.map((t) => t + ':00')
        })
      })
      const json: HabitResponse = await res.json()
      if (json.success) {
        onSuccess()
      } else {
        alert(json.error || 'エラーが発生しました')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div
        className="overflow-y-auto p-6"
        style={{ maxHeight: 'calc(85vh - 64px - 80px)' }}
      >
        <h2 className="heading text-lg mb-4">あたらしい習慣</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            なまえ
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: くすり"
            maxLength={50}
            className="w-full p-3 rounded-xl"
            style={{ background: 'var(--bg-primary)' }}
          />
        </div>

        {/* Icon */}
        <div className="mb-4">
          <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            アイコン
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  icon === emoji ? 'ring-2 ring-[var(--coral)]' : ''
                }`}
                style={{ background: 'var(--bg-primary)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Times */}
        <div className="mb-4">
          <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            いつ？
          </label>
          <div className="flex flex-wrap gap-2">
            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-1">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleUpdateTime(index, e.target.value)}
                  className="p-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-primary)' }}
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(index)}
                    className="text-sm opacity-50"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {times.length < 5 && (
              <button
                type="button"
                onClick={handleAddTime}
                className="chip chip--sky"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                ＋ 時間を追加
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom button area */}
      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="button button--primary w-full"
          style={{
            opacity: submitting || !title.trim() ? 0.5 : 1,
            cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          できた！
        </button>

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

interface EditHabitModalProps {
  habit: Habit & { times: HabitTime[] }
  onClose: () => void
  onSuccess: () => void
}

function EditHabitModal({ habit, onClose, onSuccess }: EditHabitModalProps) {
  const [title, setTitle] = useState(habit.title)
  const [icon, setIcon] = useState(habit.icon || '✨')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('名前を入力してください')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon
        })
      })
      if (res.ok) {
        onSuccess()
      } else {
        alert('エラーが発生しました')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} position="bottom">
      <div
        className="overflow-y-auto p-6"
        style={{ maxHeight: 'calc(85vh - 64px - 80px)' }}
      >
        <h2 className="heading text-lg mb-4">習慣を編集</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            なまえ
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            className="w-full p-3 rounded-xl"
            style={{ background: 'var(--bg-primary)' }}
          />
        </div>

        {/* Icon */}
        <div className="mb-4">
          <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            アイコン
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  icon === emoji ? 'ring-2 ring-[var(--coral)]' : ''
                }`}
                style={{ background: 'var(--bg-primary)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed bottom button area */}
      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="button button--primary w-full"
          style={{
            opacity: submitting || !title.trim() ? 0.5 : 1,
            cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          保存
        </button>

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
