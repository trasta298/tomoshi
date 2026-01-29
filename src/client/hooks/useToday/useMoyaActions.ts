import type { Moya, Task } from '@shared/types'
import type { ActionContext } from './types'
import { apiPost, apiDelete, updateDailyLog } from './api'

export interface MoyaActions {
  addMoya: (content: string) => Promise<Moya | null>
  deleteMoya: (moyaId: string) => Promise<void>
  extendMoya: (moyaId: string) => Promise<void>
  promoteMoya: (moyaId: string) => Promise<Task | null>
}

export function createMoyaActions({ setData, invalidate }: ActionContext): MoyaActions {
  async function addMoya(content: string): Promise<Moya | null> {
    const json = await apiPost<Moya>('/api/moyas', { content })
    if (!json.success || !json.data) {
      return null
    }
    const moya = json.data
    setData((prev) => (prev ? { ...prev, moyas: [moya, ...prev.moyas] } : null))
    invalidate('today')
    return moya
  }

  async function deleteMoya(moyaId: string): Promise<void> {
    const json = await apiDelete(`/api/moyas/${moyaId}`)
    if (!json.success) {
      return
    }
    setData((prev) => (prev ? { ...prev, moyas: prev.moyas.filter((m) => m.id !== moyaId) } : null))
    invalidate('today')
  }

  async function extendMoya(moyaId: string): Promise<void> {
    const json = await apiPost<void>(`/api/moyas/${moyaId}/extend`)
    if (!json.success) {
      return
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            moyas: prev.moyas.map((m) => (m.id === moyaId ? { ...m, extended_at: Date.now() } : m))
          }
        : null
    )
    invalidate('today')
  }

  async function promoteMoya(moyaId: string): Promise<Task | null> {
    const json = await apiPost<Task>(`/api/moyas/${moyaId}/promote`, {})
    if (!json.success || !json.data) {
      return null
    }
    const task = json.data
    setData((prev) =>
      prev
        ? {
            ...prev,
            tasks: [...prev.tasks, task],
            moyas: prev.moyas.filter((m) => m.id !== moyaId)
          }
        : null
    )
    await updateDailyLog()
    invalidate('today', 'journey')
    return task
  }

  return { addMoya, deleteMoya, extendMoya, promoteMoya }
}
