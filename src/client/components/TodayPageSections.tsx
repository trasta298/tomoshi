import { AnimatePresence } from 'framer-motion'
import { MiniJourney } from './JourneyView'
import { HabitCard } from './HabitCard'
import { TaskCard, EmptyTaskSlot } from './TaskCard'
import { MoyaList } from './MoyaList'
import type { Task, Moya, Habit, HabitTimeWithCheck } from '@shared/types'

// Journey Section
interface JourneySectionProps {
  streakCount: number
  characterId?: string
}

export function JourneySection({ streakCount, characterId }: JourneySectionProps) {
  return <MiniJourney streakCount={streakCount} characterId={characterId} />
}

// Habits Section
type HabitWithTimes = Habit & { times: HabitTimeWithCheck[] }

interface HabitsSectionProps {
  habits: HabitWithTimes[]
  onToggleCheck: (timeId: string, completed: boolean) => void
  online: boolean
}

export function HabitsSection({ habits, onToggleCheck, online }: HabitsSectionProps) {
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
  onAddTask: () => void
  online: boolean
  newlyPromotedTaskId: string | null
}

export function TasksSection({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  onMoveToTomorrow,
  onAddTask,
  online,
  newlyPromotedTaskId
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
              isNewlyPromoted={task.id === newlyPromotedTaskId}
            />
          ))}
        </AnimatePresence>

        {tasks.length < 3 && (
          <EmptyTaskSlot onClick={onAddTask} disabled={!online} />
        )}
      </div>
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
  promotingMoyaId: string | null
}

export function MoyasSection({
  moyas,
  onDelete,
  onExtend,
  onPromote,
  onAdd,
  online,
  canAddTask,
  promotingMoyaId
}: MoyasSectionProps) {
  return (
    <section>
      <MoyaList
        moyas={moyas}
        onDelete={(id) => online && onDelete(id)}
        onExtend={(id) => online && onExtend(id)}
        onPromote={(id) => online && canAddTask && onPromote(id)}
        canPromote={online && canAddTask}
        promotingMoyaId={promotingMoyaId}
        onAdd={online ? onAdd : undefined}
      />
    </section>
  )
}
