import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TodayData, ApiResponse } from '@shared/types'
import { useDataCache } from '../useDataCache'
import { createTaskActions, fetchPendingTasks, carryOverTask, deletePendingTask } from './useTaskActions'
import { createHabitActions } from './useHabitActions'
import { createMoyaActions } from './useMoyaActions'

export { fetchPendingTasks, carryOverTask, deletePendingTask }

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

  const context = useMemo(() => ({ setData, invalidate }), [invalidate])
  const taskActions = useMemo(() => createTaskActions(context), [context])
  const habitActions = useMemo(() => createHabitActions(context), [context])
  const moyaActions = useMemo(() => createMoyaActions(context), [context])

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    ...taskActions,
    ...habitActions,
    ...moyaActions
  }
}
