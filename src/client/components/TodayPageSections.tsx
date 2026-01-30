import { AnimatePresence } from 'framer-motion'
import { MiniJourney } from './JourneyView.js'
import { HabitCard } from './HabitCard.js'
import { TaskCard, EmptyTaskSlot } from './TaskCard.js'
import { MoyaList } from './MoyaList.js'
import type { Task, Moya, Habit, HabitTimeWithCheck } from '@shared/types'

// Journey Section
interface JourneySectionProps {
  streakCount: number
  characterId?: string
}

export function JourneySection({ streakCount, characterId }: JourneySectionProps) {
  return (
    <div className="-mt-1">
      <MiniJourney streakCount={streakCount} characterId={characterId} />
    </div>
  )
}

// Habits Section
type HabitWithTimes = Habit & { times: HabitTimeWithCheck[] }

interface HabitsSectionProps {
  habits: HabitWithTimes[]
  onToggleCheck: (timeId: string, completed: boolean) => void
  online: boolean
}

export function HabitsSection({
  habits,
  onToggleCheck,
  online
}: HabitsSectionProps) {
  if (habits.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="heading text-lg mb-3 flex items-center gap-2">まいにち</h2>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggleCheck={(timeId, completed) =>
                online && onToggleCheck(timeId, completed)
              }
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

// Tasks Section
interface TasksSectionProps {
  tasks: Task[]
  onToggle: (taskId: string, completed: boolean) => void
  onDelete: (taskId: string) => void
  onEdit: (taskId: string, newTitle: string) => void
  onMoveToTomorrow: (taskId: string) => void
  onDemoteToMoya: (taskId: string) => void
  onAddTask: () => void
  onOpenTomorrowTasks: () => void
  tomorrowTaskCount: number
  online: boolean
}

export function TasksSection({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  onMoveToTomorrow,
  onDemoteToMoya,
  onAddTask,
  onOpenTomorrowTasks,
  tomorrowTaskCount,
  online
}: TasksSectionProps) {
  const allTasksCompleted = tasks.length > 0 && tasks.every((t) => t.completed)

  return (
    <section>
      <h2 className="heading text-lg mb-3 flex items-center gap-2">
        きょうの3つ
        {allTasksCompleted && <span className="text-xl">&#127881;</span>}
      </h2>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(completed) => online && onToggle(task.id, completed)}
              onDelete={() => online && onDelete(task.id)}
              onEdit={(newTitle) => online && onEdit(task.id, newTitle)}
              onMoveToTomorrow={online ? () => onMoveToTomorrow(task.id) : undefined}
              onDemoteToMoya={online ? () => onDemoteToMoya(task.id) : undefined}
              tomorrowTaskCount={tomorrowTaskCount}
            />
          ))}
        </AnimatePresence>

        {tasks.length < 3 && (
          <EmptyTaskSlot onClick={onAddTask} disabled={!online} />
        )}
      </div>

      {/* あしたやりたいことをみるリンク */}
      <button
        onClick={onOpenTomorrowTasks}
        className="w-full mt-4 py-2 text-sm flex items-center justify-center gap-2 transition-opacity"
        style={{
          color: 'var(--text-secondary)',
          opacity: tomorrowTaskCount > 0 ? 1 : 0.6
        }}
      >
        <span>📅</span>
        <span>
          あしたやりたいことをみる
          {tomorrowTaskCount > 0 && ` (${tomorrowTaskCount})`}
        </span>
      </button>
    </section>
  )
}

// Moyas Section
interface MoyasSectionProps {
  moyas: Moya[]
  onDelete: (id: string) => void
  onExtend: (id: string) => void
  onPromote: (id: string) => void
  onAdd: () => void
  online: boolean
  canAddTask: boolean
}

export function MoyasSection({
  moyas,
  onDelete,
  onExtend,
  onPromote,
  onAdd,
  online,
  canAddTask
}: MoyasSectionProps) {
  return (
    <section>
      <MoyaList
        moyas={moyas}
        onDelete={(id) => online && onDelete(id)}
        onExtend={(id) => online && onExtend(id)}
        onPromote={(id) => online && canAddTask && onPromote(id)}
        canPromote={online && canAddTask}
        onAdd={online ? onAdd : undefined}
      />
    </section>
  )
}
