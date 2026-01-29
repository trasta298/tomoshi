import type { HabitCheck } from '@shared/types'
import type { ActionContext } from './types'
import { apiPost } from './api'

export interface HabitActions {
  toggleHabitCheck: (habitTimeId: string, completed: boolean) => Promise<void>
}

export function createHabitActions({ setData, invalidate }: ActionContext): HabitActions {
  async function toggleHabitCheck(habitTimeId: string, completed: boolean): Promise<void> {
    const json = await apiPost<HabitCheck>(`/api/habits/times/${habitTimeId}/check`, { completed })
    if (!json.success || !json.data) {
      return
    }
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
    // Backend calls updateDailyLog, so no need to call it here
    invalidate('today', 'journey', 'user')
  }

  return { toggleHabitCheck }
}
