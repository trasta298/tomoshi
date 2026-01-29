import { useState } from 'react'
import type { Habit, HabitTimeWithCheck } from '@shared/types'

interface HabitCardProps {
  habit: Habit & { times: HabitTimeWithCheck[] }
  onToggleCheck: (habitTimeId: string, completed: boolean) => void
}

export function HabitCard({ habit, onToggleCheck }: HabitCardProps) {
  return (
    <div className="card card--compact">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{habit.icon || '✨'}</span>
        <span className="font-medium">{habit.title}</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
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
  const [animating, setAnimating] = useState(false)
  const displayTime = time.slice(0, 5)

  const handleClick = () => {
    if (!completed) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 700)
    }
    onClick()
  }

  const chipClass = [
    'chip',
    completed ? 'chip--completed' : 'chip--time',
    animating ? 'chip--celebrating' : ''
  ].filter(Boolean).join(' ')

  return (
    <button onClick={handleClick} className={chipClass}>
      <span>{displayTime}</span>
      {completed ? (
        <svg
          className={`chip-checkmark-svg ${animating ? 'chip-checkmark-svg--animated' : ''}`}
          viewBox="0 0 24 24"
        >
          <path className="chip-checkmark-svg__path" d="M4 12l6 6L20 6" />
        </svg>
      ) : (
        <span className="chip-circle-dashed" />
      )}
    </button>
  )
}
