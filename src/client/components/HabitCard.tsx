import type { Habit, HabitTimeWithCheck } from '@shared/types'

interface HabitCardProps {
  habit: Habit & { times: HabitTimeWithCheck[] }
  onToggleCheck: (habitTimeId: string, completed: boolean) => void
}

export function HabitCard({ habit, onToggleCheck }: HabitCardProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{habit.icon || '✨'}</span>
        <span className="font-medium">{habit.title}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {habit.times.map((time) => (
          <TimeChip
            key={time.id}
            time={time.time}
            completed={time.check?.completed ?? false}
            onClick={() => onToggleCheck(time.id, !(time.check?.completed ?? false))}
          />
        ))}
      </div>
    </div>
  )
}

interface TimeChipProps {
  time: string
  completed: boolean
  onClick: () => void
}

function TimeChip({ time, completed, onClick }: TimeChipProps) {
  const displayTime = time.slice(0, 5)

  return (
    <button
      onClick={onClick}
      className={`chip ${completed ? 'chip--completed' : 'chip--time'}`}
    >
      <span>{displayTime}</span>
      {completed ? <span className="chip-checkmark" /> : <span className="chip-circle-dashed" />}
    </button>
  )
}
