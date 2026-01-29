import { useState } from 'react'
import type { Task } from '@shared/types'
import { carryOverTask, deletePendingTask } from '../hooks/useToday'

interface PendingTasksModalProps {
  tasks: Task[]
  onComplete: () => void
  canCarryOver: (count: number) => boolean // 今日のタスク数に応じて持ち越し可能か判定
}

export function PendingTasksModal({ tasks, onComplete, canCarryOver }: PendingTasksModalProps) {
  const [pendingTasks, setPendingTasks] = useState(tasks)
  const [processing, setProcessing] = useState<string | null>(null)
  const [carryOverCount, setCarryOverCount] = useState(0)

  if (pendingTasks.length === 0) {
    return null
  }

  const handleCarryOver = async (task: Task) => {
    if (!canCarryOver(carryOverCount + 1)) {
      return
    }
    setProcessing(task.id)
    const success = await carryOverTask(task.id)
    if (success) {
      setCarryOverCount((c) => c + 1)
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id))
    }
    setProcessing(null)
  }

  const handleDelete = async (task: Task) => {
    setProcessing(task.id)
    const success = await deletePendingTask(task.id)
    if (success) {
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id))
    }
    setProcessing(null)
  }

  const handleComplete = () => {
    onComplete()
  }

  // 残りタスクがなくなったら自動で閉じる
  if (pendingTasks.length === 0) {
    setTimeout(onComplete, 100)
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleComplete} />

      <div
        className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-2xl p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <span className="text-4xl">📋</span>
          <h2 className="heading text-lg mt-2">やり残しタスク</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            持ち越すか、削除するか選んでね
          </p>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {pendingTasks.map((task) => {
            const taskDate = new Date(task.date)
            const dateStr = taskDate.toLocaleDateString('ja-JP', {
              month: 'numeric',
              day: 'numeric'
            })
            const isProcessing = processing === task.id
            const canAdd = canCarryOver(carryOverCount + 1)

            return (
              <div
                key={task.id}
                className="card flex items-center gap-3"
                style={{ opacity: isProcessing ? 0.5 : 1 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate">{task.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {dateStr}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCarryOver(task)}
                    disabled={isProcessing || !canAdd}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{
                      background: canAdd ? 'var(--mint)' : 'var(--text-secondary)',
                      opacity: canAdd ? 1 : 0.5
                    }}
                    title={canAdd ? '今日に持ち越し' : '今日のタスクがいっぱい'}
                  >
                    ↑持越
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{ background: 'var(--coral)' }}
                  >
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={handleComplete} className="button button--secondary w-full mt-4">
          あとで決める
        </button>
      </div>
    </div>
  )
}
