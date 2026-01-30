import type { Task, Moya, ApiResponse } from '@shared/types'
import type { ActionContext } from './types.js'
import { apiPost, apiPatch, apiDelete, updateDailyLog } from './api.js'

export interface TaskActions {
  addTask: (title: string, date?: string) => Promise<Task | null>
  toggleTask: (taskId: string, completed: boolean) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  editTask: (taskId: string, newTitle: string) => Promise<void>
  moveToTomorrow: (taskId: string) => Promise<boolean>
  demoteToMoya: (taskId: string) => Promise<Moya | null>
}

export function createTaskActions({ setData, invalidate }: ActionContext): TaskActions {
  async function addTask(title: string, date?: string): Promise<Task | null> {
    const body: { title: string; date?: string } = { title }
    if (date) {
      body.date = date
    }
    const json = await apiPost<Task>('/api/tasks', body)
    if (!json.success || !json.data) {
      return null
    }
    const task = json.data
    // Only update local state if adding to today (no date specified)
    if (!date) {
      setData((prev) => (prev ? { ...prev, tasks: [...prev.tasks, task] } : null))
    }
    await updateDailyLog()
    invalidate('today', 'journey')
    return task
  }

  async function toggleTask(taskId: string, completed: boolean): Promise<void> {
    const json = await apiPatch<Task>(`/api/tasks/${taskId}`, { completed })
    if (!json.success) {
      return
    }
    setData((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t)) }
        : null
    )
    await updateDailyLog()
    invalidate('today', 'journey', 'user')
  }

  async function deleteTask(taskId: string): Promise<void> {
    const json = await apiDelete(`/api/tasks/${taskId}`)
    if (!json.success) {
      return
    }
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null))
    await updateDailyLog()
    invalidate('today', 'journey')
  }

  async function editTask(taskId: string, newTitle: string): Promise<void> {
    const json = await apiPatch<Task>(`/api/tasks/${taskId}`, { title: newTitle })
    if (!json.success || !json.data) {
      return
    }
    setData((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)) }
        : null
    )
    invalidate('today', 'journey')
  }

  async function moveToTomorrow(taskId: string): Promise<boolean> {
    const json = await apiPost<void>(`/api/tasks/${taskId}/move-to-tomorrow`)
    if (!json.success) {
      return false
    }
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null))
    await updateDailyLog()
    invalidate('today', 'journey')
    return true
  }

  async function demoteToMoya(taskId: string): Promise<Moya | null> {
    const json = await apiPost<Moya>(`/api/tasks/${taskId}/demote-to-moya`)
    if (!json.success || !json.data) {
      return null
    }
    const moya = json.data
    setData((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.filter((t) => t.id !== taskId),
            moyas: [moya, ...prev.moyas]
          }
        : null
    )
    await updateDailyLog()
    invalidate('today', 'journey')
    return moya
  }

  return { addTask, toggleTask, deleteTask, editTask, moveToTomorrow, demoteToMoya }
}

/**
 * Fetch pending tasks (from previous days)
 */
export async function fetchPendingTasks(): Promise<Task[]> {
  try {
    const res = await fetch('/api/tasks/pending')
    const json: ApiResponse<Task[]> = await res.json()
    return json.success && json.data ? json.data : []
  } catch {
    return []
  }
}

/**
 * Carry over a task to today
 */
export async function carryOverTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/move-to-today`, { method: 'POST' })
    const json: ApiResponse<unknown> = await res.json()
    if (json.success) {
      await updateDailyLog()
    }
    return json.success
  } catch {
    return false
  }
}

/**
 * Delete a pending task
 */
export async function deletePendingTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    const json: ApiResponse<unknown> = await res.json()
    return json.success
  } catch {
    return false
  }
}
