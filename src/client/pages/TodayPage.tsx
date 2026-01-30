import { useState, useEffect, useRef } from 'react'
import { useToday } from '../hooks/useToday.js'
import { useDataCache } from '../hooks/useDataCache.js'
import { useOnline, OfflineBanner } from '../components/OfflineBanner.js'
import { Confetti } from '../components/Confetti.js'
import { AchievementOverlay } from '../components/AchievementOverlay.js'
import {
  JourneySection,
  HabitsSection,
  TasksSection,
  MoyasSection
} from '../components/TodayPageSections.js'
import { AddModal } from '../components/AddModal.js'
import { PendingTasksModal } from '../components/PendingTasksModal.js'
import { MonthlyGoalPrompt, shouldShowMonthlyGoalPrompt } from '../components/MonthlyGoalPrompt.js'
import { ShieldToast } from '../components/ShieldToast.js'
import { MilestoneToast } from '../components/MilestoneToast.js'
import { WelcomeBackToast } from '../components/WelcomeBackToast.js'
import { MoveToTomorrowToast } from '../components/MoveToTomorrowToast.js'
import { TomorrowTasksModal } from '../components/TomorrowTasksModal.js'
import { fetchTomorrowTaskCount } from '../hooks/useTomorrowTasks.js'
import type { Task } from '@shared/types'

interface PendingTasksResponse {
  success: boolean
  data?: Task[]
}

function formatTodayDate(): string {
  const today = new Date()
  return today.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  })
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
    moveToTomorrow,
    demoteToMoya
  } = useToday()
  const { fetchWithCache } = useDataCache()
  const online = useOnline()

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalMode, setAddModalMode] = useState<'task' | 'moya' | 'both'>('both')
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [showMonthlyGoalPrompt, setShowMonthlyGoalPrompt] = useState(() => shouldShowMonthlyGoalPrompt())
  const [showTomorrowTasksModal, setShowTomorrowTasksModal] = useState(false)

  // Toast state
  const [showMoveToTomorrowToast, setShowMoveToTomorrowToast] = useState(false)

  // Tomorrow tasks count
  const [tomorrowTaskCount, setTomorrowTaskCount] = useState(0)

  // Achievement animation state
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAchievement, setShowAchievement] = useState(false)

  // Refs for tracking state
  const prevAllCompletedRef = useRef(false)
  const pendingCheckedRef = useRef(false)

  // Check for pending tasks on mount
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

  // Fetch tomorrow task count on mount and after relevant updates
  useEffect(() => {
    if (!online) return
    fetchTomorrowTaskCount().then(setTomorrowTaskCount)
  }, [online, data?.tasks.length])

  // Achievement effect when all 3 tasks completed
  useEffect(() => {
    if (!data) return

    const allTasksCompleted =
      data.tasks.length === 3 && data.tasks.every((t) => t.completed)

    if (allTasksCompleted && !prevAllCompletedRef.current) {
      setShowConfetti(true)
      setShowAchievement(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }

    prevAllCompletedRef.current = allTasksCompleted
  }, [data])

  // Task toggle with confetti
  async function handleToggleTask(taskId: string, completed: boolean): Promise<void> {
    if (completed) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1500)
    }
    await toggleTask(taskId, completed)
  }

  // Move to tomorrow with toast
  async function handleMoveToTomorrow(taskId: string): Promise<void> {
    const success = await moveToTomorrow(taskId)
    if (success) {
      setShowMoveToTomorrowToast(true)
    }
  }

  // Moya promotion
  function handlePromoteMoya(moyaId: string): void {
    promoteMoya(moyaId)
  }

  function openAddModal(mode: 'task' | 'moya' | 'both'): void {
    setAddModalMode(mode)
    setShowAddModal(true)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">&#128293;</div>
          <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!data) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }}>データを読み込めませんでした</p>
      </div>
    )
  }

  const canAddTask = data.tasks.length < 3

  return (
    <>
      <OfflineBanner />

      {/* Toast notifications */}
      <ShieldToast shieldConsumedAt={data.streak.shieldConsumedAt} />
      <MilestoneToast streakCount={data.streak.count} />
      <WelcomeBackToast
        lastActiveDate={data.streak.lastActiveDate}
        streakCount={data.streak.count}
      />
      <MoveToTomorrowToast
        show={showMoveToTomorrowToast}
        onClose={() => setShowMoveToTomorrowToast(false)}
        onViewTomorrowTasks={() => setShowTomorrowTasksModal(true)}
      />

      {/* Achievement animations */}
      {showConfetti && <Confetti />}
      {showAchievement && (
        <AchievementOverlay onClose={() => setShowAchievement(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="heading text-2xl page-title">きょう</h1>
          <span style={{ color: 'var(--text-secondary)' }}>{formatTodayDate()}</span>
        </div>

        {/* Monthly goal (subtle display) */}
        {data.monthlyGoal && (
          <div
            className="text-sm truncate"
            style={{ color: 'var(--text-secondary)', marginTop: '-0.5rem' }}
          >
            &#127919; {data.monthlyGoal}
          </div>
        )}

        {/* Main sections */}
        <JourneySection
          streakCount={data.streak.count}
          characterId={data.characterId ?? undefined}
        />

        <HabitsSection
          habits={data.habits}
          onToggleCheck={toggleHabitCheck}
          online={online}
        />

        <TasksSection
          tasks={data.tasks}
          onToggle={handleToggleTask}
          onDelete={deleteTask}
          onEdit={editTask}
          onMoveToTomorrow={handleMoveToTomorrow}
          onDemoteToMoya={demoteToMoya}
          onAddTask={() => openAddModal('task')}
          onOpenTomorrowTasks={() => setShowTomorrowTasksModal(true)}
          tomorrowTaskCount={tomorrowTaskCount}
          online={online}
        />

        <MoyasSection
          moyas={data.moyas}
          onDelete={deleteMoya}
          onExtend={extendMoya}
          onPromote={handlePromoteMoya}
          onAdd={() => openAddModal('moya')}
          online={online}
          canAddTask={canAddTask}
        />
      </div>

      {/* Modals */}
      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={addTask}
        onAddMoya={addMoya}
        canAddTask={canAddTask}
        initialMode={addModalMode}
      />

      <TomorrowTasksModal
        isOpen={showTomorrowTasksModal}
        onClose={() => {
          setShowTomorrowTasksModal(false)
          refresh()
          fetchTomorrowTaskCount().then(setTomorrowTaskCount)
        }}
        todayTaskCount={data.tasks.length}
      />

      {showPendingModal && pendingTasks.length > 0 && (
        <PendingTasksModal
          tasks={pendingTasks}
          onComplete={() => {
            setShowPendingModal(false)
            refresh()
          }}
          onRefresh={refresh}
          todayTaskCount={data?.tasks.length || 0}
        />
      )}

      {showMonthlyGoalPrompt && !showPendingModal && (
        <MonthlyGoalPrompt onClose={() => setShowMonthlyGoalPrompt(false)} />
      )}
    </>
  )
}
