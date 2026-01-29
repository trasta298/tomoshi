import type { ApiResponse } from '@shared/types'

/**
 * POST request to update daily log after task changes
 */
export async function updateDailyLog(): Promise<void> {
  await fetch('/api/journey/log', { method: 'POST' })
}

/**
 * Generic POST request with JSON body
 */
export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  return res.json()
}

/**
 * Generic PATCH request with JSON body
 */
export async function apiPatch<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

/**
 * Generic DELETE request
 */
export async function apiDelete(url: string): Promise<ApiResponse<unknown>> {
  const res = await fetch(url, { method: 'DELETE' })
  return res.json()
}
