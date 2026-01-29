import { useState, useEffect, useRef } from 'react'
import { useToday } from '../hooks/useToday'
import { useDataCache } from '../hooks/useDataCache'
import { useOnline } from '../components/OfflineBanner'
import { MiniJourney } from '../components/JourneyView'
import { TaskCard, EmptyTaskSlot } from '../components/TaskCard'
import { HabitCard } from '../components/HabitCard'
import { MoyaList } from '../components/MoyaList'
import { AddModal } from '../components/AddModal'
import { OfflineBanner } from '../components/OfflineBanner'
import { PendingTasksModal } from '../components/PendingTasksModal'
import { MonthlyGoalPrompt, shouldShowMonthlyGoalPrompt } from '../components/MonthlyGoalPrompt'
import { ShieldToast } from '../components/ShieldToast'
import { MilestoneToast } from '../components/MilestoneToast'
import { WelcomeBackToast } from '../components/WelcomeBackToast'
import { CompleteCheck } from '../components/CompleteCheck'
import type { Task } from '@shared/types'

// 紙吹雪コンポーネント
function Confetti() {
  const colors = ['#FFDAD6', '#D4F5E4', '#E8DEFF', '#FFF3D1', '#D6EFFF']
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8
  }))

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            background: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  )
}

// 達成オーバーレイコンポーネント
interface AchievementOverlayProps {
  onClose: () => void
}

function AchievementOverlay({ onClose }: AchievementOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="achievement-overlay" onClick={onClose}>
      <div className="achievement-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <CompleteCheck size="lg" sparkle />
        </div>
        <h2 className="heading text-xl mb-2">きょうの3つ達成！</h2>
        <p style={{ color: 'var(--text-secondary)' }}>すごい！おつかれさま</p>
        <div className="mt-4 flex justify-center gap-1">
          <span className="text-2xl">⭐</span>
          <span className="text-2xl">⭐</span>
          <span className="text-2xl">⭐</span>
        </div>
      </div>
    </div>
  )
}

interface PendingTasksResponse {
  success: boolean
  data?: Task[]
}

export function TodayPage() {
  const {
    data,
    loading,
    refresh,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
    toggleHabitCheck,
    addMoya,
    deleteMoya,
    extendMoya,
    promoteMoya,
    moveToTomorrow
  } = useToday()
  const { fetchWithCache } = useDataCache()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalMode, setAddModalMode] = useState<'task' | 'moya' | 'both'>('both')
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAchievement, setShowAchievement] = useState(false)
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [showMonthlyGoalPrompt, setShowMonthlyGoalPrompt] = useState(() => shouldShowMonthlyGoalPrompt())
  const online = useOnline()

  // 昇格アニメーション用: 昇格中のmoyaIdと新しく追加されたタスクID
  const [promotingMoyaId, setPromotingMoyaId] = useState<string | null>(null)
  const [newlyPromotedTaskId, setNewlyPromotedTaskId] = useState<string | null>(null)

  // 3つ達成済みかどうかを追跡
  const prevAllCompletedRef = useRef(false)
  const pendingCheckedRef = useRef(false)

  // 未完了タスクの確認（キャッシュあり）
  useEffect(() => {
    if (pendingCheckedRef.current || !online) return
    pendingCheckedRef.current = true

    fetchWithCache<PendingTasksResponse>('/api/tasks/pending').then((json) => {
      if (json.success && json.data && json.data.length > 0) {
        setPendingTasks(json.data)
        setShowPendingModal(true)
      }
    })
  }, [online, fetchWithCache])

  const today = new Date()
  const dateStr = today.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  })

  // 3つ達成時のエフェクト
  useEffect(() => {
    if (!data) return

    const allTasksCompleted =
      data.tasks.length === 3 && data.tasks.every((t) => t.completed)

    // 前回は未達成で、今回達成した場合にエフェクトを表示
    if (allTasksCompleted && !prevAllCompletedRef.current) {
      setShowConfetti(true)
      setShowAchievement(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }

    prevAllCompletedRef.current = allTasksCompleted
  }, [data])

  // タスク完了時の紙吹雪（個別）
  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (completed) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1500)
    }
    await toggleTask(taskId, completed)
  }

  // フェードアニメーション付きのもやもや昇格
  const handlePromoteMoya = async (moyaId: string) => {
    // 昇格開始（フェードアウト開始）
    setPromotingMoyaId(moyaId)

    // フェードアウトアニメーションを待つ
    await new Promise(resolve => setTimeout(resolve, 200))

    // API呼び出し
    const newTask = await promoteMoya(moyaId)

    setPromotingMoyaId(null)

    if (newTask) {
      // 新しいタスクのフェードインアニメーション
      setNewlyPromotedTaskId(newTask.id)
      setTimeout(() => setNewlyPromotedTaskId(null), 400)
    }
  }

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

      {/* シールド消費メッセージ */}
      <ShieldToast shieldConsumedAt={data.streak.shieldConsumedAt} />

      {/* マイルストーン到達メッセージ */}
      <MilestoneToast streakCount={data.streak.count} />

      {/* 復帰ウェルカムメッセージ */}
      <WelcomeBackToast
        lastActiveDate={data.streak.lastActiveDate}
        streakCount={data.streak.count}
      />

      {/* 紙吹雪 */}
      {showConfetti && <Confetti />}

      {/* 達成オーバーレイ */}
      {showAchievement && (
        <AchievementOverlay onClose={() => setShowAchievement(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="heading text-2xl page-title">きょう</h1>
          <span style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>
        </div>

        {/* Monthly goal (subtle display) */}
        {data.monthlyGoal && (
          <div
            className="text-sm truncate"
            style={{ color: 'var(--text-secondary)', marginTop: '-0.5rem' }}
          >
            🎯 {data.monthlyGoal}
          </div>
        )}

        {/* Journey preview */}
        <MiniJourney streakCount={data.streak.count} characterId={data.characterId} />

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
                onToggle={(completed) => online && handleToggleTask(task.id, completed)}
                onDelete={() => online && deleteTask(task.id)}
                onEdit={(newTitle) => online && editTask(task.id, newTitle)}
                onMoveToTomorrow={online ? () => moveToTomorrow(task.id) : undefined}
                isNewlyPromoted={task.id === newlyPromotedTaskId}
              />
            ))}

            {/* Empty slot (show only one if tasks < 3) */}
            {data.tasks.length < 3 && (
              <EmptyTaskSlot
                onClick={() => {
                  setAddModalMode('task')
                  setShowAddModal(true)
                }}
                disabled={!online}
              />
            )}
          </div>
        </section>

        {/* Moyas section */}
        <section>
          <MoyaList
            moyas={data.moyas}
            onDelete={(id) => online && deleteMoya(id)}
            onExtend={(id) => online && extendMoya(id)}
            onPromote={(id) => online && canAddTask && handlePromoteMoya(id)}
            canPromote={online && canAddTask}
            promotingMoyaId={promotingMoyaId}
            onAdd={online ? () => {
              setAddModalMode('moya')
              setShowAddModal(true)
            } : undefined}
          />
        </section>
      </div>

      {/* Add modal */}
      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={addTask}
        onAddMoya={addMoya}
        canAddTask={canAddTask}
        initialMode={addModalMode}
      />

      {/* Pending tasks modal */}
      {showPendingModal && pendingTasks.length > 0 && (
        <PendingTasksModal
          tasks={pendingTasks}
          onComplete={() => {
            setShowPendingModal(false)
            refresh()
          }}
          canCarryOver={(additionalCount) => {
            const currentTasks = data?.tasks.length || 0
            return currentTasks + additionalCount <= 3
          }}
        />
      )}

      {/* Monthly goal prompt */}
      {showMonthlyGoalPrompt && !showPendingModal && (
        <MonthlyGoalPrompt onClose={() => setShowMonthlyGoalPrompt(false)} />
      )}
    </>
  )
}
