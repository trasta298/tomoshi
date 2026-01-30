import { useState, useCallback } from 'react'
import type { Task, ApiResponse } from '@shared/types'
import { useDataCache } from './useDataCache.js'

interface UseTomorrowTasksReturn {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  addTask: (title: string) => Promise<Task | null>
  moveToToday: (taskId: string) => Promise<{ success: boolean; error?: string }>
  edit: (taskId: string, title: string) => Promise<boolean>
  remove: (taskId: string) => Promise<boolean>
}

/** 明日の日付を YYYY-MM-DD 形式で取得（Asia/Tokyo） */
function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

/**
 * 明日のタスク取得・操作フック
 */
export function useTomorrowTasks(): UseTomorrowTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const { invalidate } = useDataCache()

  const fetchTasks = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const tomorrow = getTomorrowDateString()
      const res = await window.fetch(`/api/tasks?date=${tomorrow}`)
      const json: ApiResponse<Task[]> = await res.json()
      if (json.success && json.data) {
        setTasks(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const addTask = useCallback(
    async (title: string): Promise<Task | null> => {
      const tomorrow = getTomorrowDateString()
      const res = await window.fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: tomorrow })
      })
      const json: ApiResponse<Task> = await res.json()
      if (json.success && json.data) {
        const newTask = json.data
        setTasks((prev) => [...prev, newTask])
        invalidate('journey')
        return newTask
      }
      return null
    },
    [invalidate]
  )

  const moveToToday = useCallback(
    async (taskId: string): Promise<{ success: boolean; error?: string }> => {
      const res = await window.fetch(`/api/tasks/${taskId}/move-to-today`, { method: 'POST' })
      const json: ApiResponse<void> = await res.json()
      if (json.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        invalidate('today', 'journey')
      }
      return { success: json.success, error: json.error }
    },
    [invalidate]
  )

  const edit = useCallback(async (taskId: string, title: string): Promise<boolean> => {
    const res = await window.fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    const json: ApiResponse<Task> = await res.json()
    if (json.success && json.data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title } : t)))
    }
    return json.success
  }, [])

  const remove = useCallback(
    async (taskId: string): Promise<boolean> => {
      const res = await window.fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      const json: ApiResponse<void> = await res.json()
      if (json.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        invalidate('journey')
      }
      return json.success
    },
    [invalidate]
  )

  return { tasks, loading, fetchTasks, addTask, moveToToday, edit, remove }
}

/** 明日のタスク件数を取得 */
export async function fetchTomorrowTaskCount(): Promise<number> {
  try {
    const tomorrow = getTomorrowDateString()
    const res = await fetch(`/api/tasks?date=${tomorrow}`)
    const json: ApiResponse<Task[]> = await res.json()
    return json.success && json.data ? json.data.length : 0
  } catch {
    return 0
  }
}
