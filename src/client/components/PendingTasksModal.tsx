import { useState } from 'react'
import type { Task } from '@shared/types'
import { carryOverTask, deletePendingTask } from '../hooks/useToday'
import { useDataCache } from '../hooks/useDataCache'
import { ModalWrapper } from './ModalWrapper'

interface PendingTasksModalProps {
  tasks: Task[]
  onComplete: () => void
  onRefresh: () => Promise<void> // Async refresh to wait for data update
  todayTaskCount: number // Real-time count from parent
}

export function PendingTasksModal({
  tasks,
  onComplete,
  onRefresh,
  todayTaskCount
}: PendingTasksModalProps) {
  const [pendingTasks, setPendingTasks] = useState(tasks)
  const [processing, setProcessing] = useState<string | null>(null)
  const { invalidate } = useDataCache()

  // Use todayTaskCount directly for availability check
  const canAdd = todayTaskCount < 3

  if (pendingTasks.length === 0) {
    return null
  }

  const handleCarryOver = async (task: Task) => {
    if (!canAdd) {
      return
    }
    setProcessing(task.id)
    const success = await carryOverTask(task.id)
    if (success) {
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id))
      invalidate('today', 'journey')
      await onRefresh() // Wait for refresh to complete before updating UI
    }
    setProcessing(null)
  }

  const handleDelete = async (task: Task) => {
    setProcessing(task.id)
    const success = await deletePendingTask(task.id)
    if (success) {
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id))
      invalidate('today', 'journey')
      await onRefresh() // Wait for refresh to complete
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
    <ModalWrapper onClose={handleComplete} position="center" maxWidth="max-w-sm">
      <div className="p-6">
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
    </ModalWrapper>
  )
}
