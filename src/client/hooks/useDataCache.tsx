import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'

/**
 * キャッシュドメイン
 * 各ドメインは関連するAPIエンドポイントをグループ化し、一括無効化を可能にする
 */
export type CacheDomain = 'today' | 'journey' | 'settings' | 'habits' | 'user'

/** キャッシュの有効期限（10分） */
const CACHE_TTL_MS = 10 * 60 * 1000

interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
}

interface DataCacheContextType {
  /** キャッシュを使用してデータを取得（GETリクエストのみキャッシュ） */
  fetchWithCache: <T>(url: string, options?: RequestInit) => Promise<T>
  /** 指定したドメインのキャッシュを無効化 */
  invalidate: (...domains: CacheDomain[]) => void
  /** 特定のキャッシュキーを無効化 */
  invalidateKey: (key: string) => void
  /** キャッシュされたデータを取得（なければnull） */
  getCached: <T>(key: string) => T | null
  /** データをキャッシュに設定 */
  setCache: <T>(key: string, data: T) => void
}

const DataCacheContext = createContext<DataCacheContextType | null>(null)

/**
 * ドメインとキャッシュキーのマッピング
 */
const DOMAIN_PATTERNS: Record<CacheDomain, (key: string) => boolean> = {
  today: (key) =>
    key.startsWith('/api/journey/today') || key.startsWith('/api/tasks/pending'),
  journey: (key) =>
    key.startsWith('/api/journey/history') || key.startsWith('/api/journey/day/'),
  settings: (key) => key.startsWith('/api/settings'),
  habits: (key) => key.startsWith('/api/habits'),
  user: (key) => key.startsWith('/api/auth/me')
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())

  const getCached = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key)
    if (entry) {
      // TTLを超えていたら無効
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        cacheRef.current.delete(key)
        return null
      }
      return entry.data as T
    }
    return null
  }, [])

  const setCache = useCallback(<T,>(key: string, data: T): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    })
  }, [])

  const invalidateKey = useCallback((key: string): void => {
    cacheRef.current.delete(key)
  }, [])

  const invalidate = useCallback((...domains: CacheDomain[]): void => {
    const keysToDelete: string[] = []

    cacheRef.current.forEach((_, key) => {
      for (const domain of domains) {
        if (DOMAIN_PATTERNS[domain](key)) {
          keysToDelete.push(key)
          break
        }
      }
    })

    keysToDelete.forEach((key) => cacheRef.current.delete(key))
  }, [])

  const fetchWithCache = useCallback(
    async <T,>(url: string, options?: RequestInit): Promise<T> => {
      const method = options?.method?.toUpperCase() || 'GET'

      // GETリクエスト以外はキャッシュしない
      if (method !== 'GET') {
        const res = await fetch(url, options)
        return res.json()
      }

      // キャッシュがあれば返す
      const cached = getCached<T>(url)
      if (cached !== null) {
        return cached
      }

      // フェッチして成功時のみキャッシュ
      const res = await fetch(url, options)
      const json: T = await res.json()

      // success: true のレスポンスのみキャッシュ
      if (json && typeof json === 'object' && 'success' in json && json.success === true) {
        setCache(url, json)
      }

      return json
    },
    [getCached, setCache]
  )

  return (
    <DataCacheContext.Provider
      value={{ fetchWithCache, invalidate, invalidateKey, getCached, setCache }}
    >
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider')
  }
  return context
}
