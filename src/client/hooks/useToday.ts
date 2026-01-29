import { useState, useEffect, useCallback } from 'react'
import type { TodayData, Task, Moya, HabitCheck } from '@shared/types'
import { useDataCache } from './useDataCache'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 未完了タスク（前日以前）を取得
export async function fetchPendingTasks(): Promise<Task[]> {
  try {
    const res = await fetch('/api/tasks/pending')
    const json: ApiResponse<Task[]> = await res.json()
    return json.success && json.data ? json.data : []
  } catch {
    return []
  }
}

// タスクを今日に持ち越し
export async function carryOverTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/move-to-today`, { method: 'POST' })
    const json: ApiResponse = await res.json()
    if (json.success) {
      // Update daily log (タスク移動でtasks_totalが変わるため)
      await fetch('/api/journey/log', { method: 'POST' })
    }
    return json.success
  } catch {
    return false
  }
}

// タスクを削除
export async function deletePendingTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    const json: ApiResponse = await res.json()
    return json.success
  } catch {
    return false
  }
}

export function useToday() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { fetchWithCache, invalidate } = useDataCache()

  const fetchData = useCallback(async () => {
    try {
      const json = await fetchWithCache<ApiResponse<TodayData>>('/api/journey/today')
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error || 'Failed to load')
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [fetchWithCache])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addTask = async (title: string): Promise<Task | null> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    const json: ApiResponse<Task> = await res.json()
    if (json.success && json.data) {
      setData((prev) => (prev ? { ...prev, tasks: [...prev.tasks, json.data!] } : null))
      // Update daily log (タスク追加でtasks_totalが変わるため)
      await fetch('/api/journey/log', { method: 'POST' })
      invalidate('today', 'journey')
      return json.data
    }
    return null
  }

  const toggleTask = async (taskId: string, completed: boolean) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    })
    const json: ApiResponse = await res.json()
    if (json.success) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t))
            }
          : null
      )
      // Update daily log
      await fetch('/api/journey/log', { method: 'POST' })
      invalidate('today', 'journey', 'user')
    }
  }

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    const json: ApiResponse = await res.json()
    if (json.success) {
      setData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null
      )
      // Update daily log (タスク削除でtasks_totalが変わるため)
      await fetch('/api/journey/log', { method: 'POST' })
      invalidate('today', 'journey')
    }
  }

  const editTask = async (taskId: string, newTitle: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    })
    const json: ApiResponse<Task> = await res.json()
    if (json.success && json.data) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t))
            }
          : null
      )
      invalidate('today', 'journey')
    }
  }

  const toggleHabitCheck = async (habitTimeId: string, completed: boolean) => {
    const res = await fetch(`/api/habits/times/${habitTimeId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    })
    const json: ApiResponse<HabitCheck> = await res.json()
    if (json.success && json.data) {
      const checkData = json.data
      setData((prev) => {
        if (!prev) return null
        return {
          ...prev,
          habits: prev.habits.map((h) => ({
            ...h,
            times: h.times.map((t) => (t.id === habitTimeId ? { ...t, check: checkData } : t))
          }))
        }
      })
      // バックエンド側でupdateDailyLogが呼ばれるため、ここでの呼び出しは不要
      invalidate('today', 'journey', 'user')
    }
  }

  const addMoya = async (content: string): Promise<Moya | null> => {
    const res = await fetch('/api/moyas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    const json: ApiResponse<Moya> = await res.json()
    if (json.success && json.data) {
      setData((prev) => (prev ? { ...prev, moyas: [json.data!, ...prev.moyas] } : null))
      invalidate('today')
      return json.data
    }
    return null
  }

  const deleteMoya = async (moyaId: string) => {
    const res = await fetch(`/api/moyas/${moyaId}`, { method: 'DELETE' })
    const json: ApiResponse = await res.json()
    if (json.success) {
      setData((prev) =>
        prev ? { ...prev, moyas: prev.moyas.filter((m) => m.id !== moyaId) } : null
      )
      invalidate('today')
    }
  }

  const extendMoya = async (moyaId: string) => {
    const res = await fetch(`/api/moyas/${moyaId}/extend`, { method: 'POST' })
    const json: ApiResponse = await res.json()
    if (json.success) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              moyas: prev.moyas.map((m) =>
                m.id === moyaId ? { ...m, extended_at: Date.now() } : m
              )
            }
          : null
      )
      invalidate('today')
    }
  }

  const promoteMoya = async (moyaId: string): Promise<Task | null> => {
    const res = await fetch(`/api/moyas/${moyaId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const json: ApiResponse<Task> = await res.json()
    if (json.success && json.data) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: [...prev.tasks, json.data!],
              moyas: prev.moyas.filter((m) => m.id !== moyaId)
            }
          : null
      )
      // Update daily log (タスク追加でtasks_totalが変わるため)
      await fetch('/api/journey/log', { method: 'POST' })
      invalidate('today', 'journey')
      return json.data
    }
    return null
  }

  const moveToTomorrow = async (taskId: string): Promise<boolean> => {
    const res = await fetch(`/api/tasks/${taskId}/move-to-tomorrow`, { method: 'POST' })
    const json: ApiResponse = await res.json()
    if (json.success) {
      setData((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : null
      )
      // Update daily log (タスク移動でtasks_totalが変わるため)
      await fetch('/api/journey/log', { method: 'POST' })
      invalidate('today', 'journey')
      return true
    }
    return false
  }

  return {
    data,
    loading,
    error,
    refresh: fetchData,
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
  }
}
