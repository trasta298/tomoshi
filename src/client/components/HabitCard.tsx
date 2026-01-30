import { motion, AnimatePresence } from 'framer-motion'
import type { Habit, HabitTimeWithCheck } from '@shared/types'
import { cardVariants } from '../styles/animations'

interface HabitCardProps {
  habit: Habit & { times: HabitTimeWithCheck[] }
  onToggleCheck: (habitTimeId: string, completed: boolean) => void
}

export function HabitCard({ habit, onToggleCheck }: HabitCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="card card--compact"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{habit.icon || '✨'}</span>
        <span className="font-medium">{habit.title}</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar p-1">
        {habit.times.map((time) => (
          <TimeChip
            key={time.id}
            time={time.time}
            completed={time.check?.completed ?? false}
            onClick={() => onToggleCheck(time.id, !(time.check?.completed ?? false))}
          />
        ))}
      </div>
    </motion.div>
  )
}

interface TimeChipProps {
  time: string
  completed: boolean
  onClick: () => void
}

function TimeChip({ time, completed, onClick }: TimeChipProps) {
  const displayTime = time.slice(0, 5)

  const chipClass = [
    'chip',
    completed ? 'chip--completed' : 'chip--time',
  ].filter(Boolean).join(' ')

  return (
    <motion.button
      onClick={onClick}
      className={chipClass}
      whileTap={{ scale: 0.9 }}
    >
      <span>{displayTime}</span>
      <div className="relative w-3 h-3 flex items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {completed ? (
            <motion.svg
              key="check"
              className="chip-checkmark-svg absolute"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <path d="M4 12l6 6L20 6" />
            </motion.svg>
          ) : (
            <motion.span
              key="circle"
              className="chip-circle-dashed block w-3 h-3 absolute"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}
