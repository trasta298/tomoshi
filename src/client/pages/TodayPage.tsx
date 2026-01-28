import { useState } from 'react'
import { useToday } from '../hooks/useToday'
import { useOnline } from '../components/OfflineBanner'
import { MiniJourney } from '../components/JourneyView'
import { TaskCard, EmptyTaskSlot } from '../components/TaskCard'
import { HabitCard } from '../components/HabitCard'
import { MoyaList } from '../components/MoyaList'
import { AddModal, FloatingButton } from '../components/AddModal'
import { OfflineBanner } from '../components/OfflineBanner'

export function TodayPage() {
  const {
    data,
    loading,
    addTask,
    toggleTask,
    deleteTask,
    toggleHabitCheck,
    addMoya,
    deleteMoya,
    extendMoya,
    promoteMoya
  } = useToday()

  const [showAddModal, setShowAddModal] = useState(false)
  const online = useOnline()

  const today = new Date()
  const dateStr = today.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🔥</div>
          <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }}>データを読み込めませんでした</p>
      </div>
    )
  }

  const canAddTask = data.tasks.length < 3
  const completedTasks = data.tasks.filter((t) => t.completed).length
  const allTasksCompleted = data.tasks.length > 0 && completedTasks === data.tasks.length

  return (
    <>
      <OfflineBanner />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="heading text-2xl">きょうの3つ</h1>
          <span style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>
        </div>

        {/* Journey preview */}
        <MiniJourney streakCount={data.streak.count} />

        {/* Habits section */}
        {data.habits.length > 0 && (
          <section>
            <h2 className="heading text-lg mb-3 flex items-center gap-2">まいにち</h2>
            <div className="space-y-3">
              {data.habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggleCheck={(timeId, completed) =>
                    online && toggleHabitCheck(timeId, completed)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Tasks section */}
        <section>
          <h2 className="heading text-lg mb-3 flex items-center gap-2">
            きょうの3つ
            {allTasksCompleted && <span className="text-xl">🎉</span>}
          </h2>
          <div className="space-y-3">
            {data.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(completed) => online && toggleTask(task.id, completed)}
                onDelete={() => online && deleteTask(task.id)}
              />
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - data.tasks.length }).map((_, i) => (
              <EmptyTaskSlot
                key={`empty-${i}`}
                onClick={() => setShowAddModal(true)}
                disabled={!online}
              />
            ))}
          </div>
        </section>

        {/* Moyas section */}
        <section>
          <MoyaList
            moyas={data.moyas}
            onDelete={(id) => online && deleteMoya(id)}
            onExtend={(id) => online && extendMoya(id)}
            onPromote={(id) => online && canAddTask && promoteMoya(id)}
          />
        </section>
      </div>

      {/* Floating add button */}
      <FloatingButton onClick={() => setShowAddModal(true)} />

      {/* Add modal */}
      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={addTask}
        onAddMoya={addMoya}
        canAddTask={canAddTask}
      />
    </>
  )
}
