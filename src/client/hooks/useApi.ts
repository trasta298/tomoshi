import { useState, useCallback } from 'react'
import type { ApiResponse } from '@shared/types'

interface UseApiOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useApi<T>(options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (url: string, init?: RequestInit): Promise<ApiResponse<T>> => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers
          }
        })

        const json: ApiResponse<T> = await res.json()

        if (!json.success) {
          const errorMsg = json.error || 'An error occurred'
          setError(errorMsg)
          options?.onError?.(errorMsg)
          return json
        }

        setData(json.data || null)
        options?.onSuccess?.()
        return json
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Network error'
        setError(errorMsg)
        options?.onError?.(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [options]
  )

  const get = useCallback((url: string) => execute(url, { method: 'GET' }), [execute])

  const post = useCallback(
    (url: string, body?: unknown) =>
      execute(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      }),
    [execute]
  )

  const patch = useCallback(
    (url: string, body: unknown) => execute(url, { method: 'PATCH', body: JSON.stringify(body) }),
    [execute]
  )

  const del = useCallback(
    (url: string, body?: unknown) =>
      execute(url, {
        method: 'DELETE',
        body: body ? JSON.stringify(body) : undefined
      }),
    [execute]
  )

  const put = useCallback(
    (url: string, body: unknown) => execute(url, { method: 'PUT', body: JSON.stringify(body) }),
    [execute]
  )

  return { data, loading, error, get, post, patch, del, put, setData }
}

// Hook for online/offline status
export function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useState(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  return online
}
