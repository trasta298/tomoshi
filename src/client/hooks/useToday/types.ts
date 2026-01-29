import type { TodayData } from '@shared/types'
import type { Dispatch, SetStateAction } from 'react'
import type { CacheDomain } from '../useDataCache'

export type SetTodayData = Dispatch<SetStateAction<TodayData | null>>

export interface ActionContext {
  setData: SetTodayData
  invalidate: (...domains: CacheDomain[]) => void
}
