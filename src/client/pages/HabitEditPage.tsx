import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Habit, HabitTime } from '@shared/types'
import { HabitEditCard, AddHabitModal, EditHabitModal } from '../components/habit'
import { useDataCache } from '../hooks/useDataCache'

interface HabitsResponse {
  success: boolean
  data?: (Habit & { times: HabitTime[] })[]
}

const MAX_HABITS = 3

export function HabitEditPage(): JSX.Element {
  const navigate = useNavigate()
  const [habits, setHabits] = useState<(Habit & { times: HabitTime[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<(Habit & { times: HabitTime[] }) | null>(null)
  const { fetchWithCache, invalidate } = useDataCache()

  useEffect(() => {
    fetchHabits()
  }, [])

  async function fetchHabits(): Promise<void> {
    try {
      const json = await fetchWithCache<HabitsResponse>('/api/habits')
      if (json.success && json.data) {
        setHabits(json.data)
      }
    } catch {
      console.error('Failed to load habits')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteHabit(habitId: string): Promise<void> {
    if (!confirm('この習慣を削除しますか？')) return

    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' })
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== habitId))
        invalidate('habits', 'today')
      }
    } catch {
      console.error('Failed to delete habit')
    }
  }

  function handleHabitUpdated(): void {
    invalidate('habits', 'today')
    fetchHabits()
  }

  function handleAddSuccess(): void {
    setShowAddModal(false)
    handleHabitUpdated()
  }

  function handleEditSuccess(): void {
    setEditingHabit(null)
    handleHabitUpdated()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
      </div>
    )
  }

  const canAddHabit = habits.length < MAX_HABITS

  return (
    <div className="space-y-6 pt-4">
      <Header onBack={() => navigate('/settings')} />

      <HabitList
        habits={habits}
        canAddHabit={canAddHabit}
        onEdit={setEditingHabit}
        onDelete={handleDeleteHabit}
        onUpdate={handleHabitUpdated}
        onAdd={() => setShowAddModal(true)}
      />

      {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />}

      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

interface HeaderProps {
  onBack: () => void
}

function Header({ onBack }: HeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} className="p-2 -ml-2" style={{ color: 'var(--text-secondary)' }}>
        ← 戻る
      </button>
      <h1 className="heading text-xl">まいにちの習慣</h1>
      <div className="w-10" />
    </div>
  )
}

interface HabitListProps {
  habits: (Habit & { times: HabitTime[] })[]
  canAddHabit: boolean
  onEdit: (habit: Habit & { times: HabitTime[] }) => void
  onDelete: (habitId: string) => void
  onUpdate: () => void
  onAdd: () => void
}

function HabitList({
  habits,
  canAddHabit,
  onEdit,
  onDelete,
  onUpdate,
  onAdd
}: HabitListProps): JSX.Element {
  return (
    <div className="space-y-4">
      {habits.map((habit) => (
        <HabitEditCard
          key={habit.id}
          habit={habit}
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit.id)}
          onUpdate={onUpdate}
        />
      ))}

      {canAddHabit ? (
        <button
          onClick={onAdd}
          className="w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}
        >
          <span>＋</span>
          <span>つづけたいこと</span>
        </button>
      ) : (
        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          習慣は最大3つまでです
        </p>
      )}
    </div>
  )
}
