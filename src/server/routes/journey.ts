import { Hono } from 'hono'
import { getTodayDate } from '@shared/utils'
import type { Env } from '../types.js'
import * as journeyService from '../services/journeyService.js'

export const journeyRoutes = new Hono<{ Bindings: Env }>()

// Re-export for use by other routes (habits.ts)
export const updateDailyLog = journeyService.updateDailyLog
export const confirmPendingDays = journeyService.confirmPendingDays

// Get today's complete data
journeyRoutes.get('/today', async (c) => {
  const { userId } = c.get('auth')

  const todayData = await journeyService.getTodayData(c.env.DB, userId)

  return c.json({ success: true, data: todayData })
})

// Get journey (last 30 days)
journeyRoutes.get('/history', async (c) => {
  const { userId } = c.get('auth')

  const journey = await journeyService.getJourneyHistory(c.env.DB, userId)

  return c.json({ success: true, data: journey })
})

// Get specific day's details
journeyRoutes.get('/day/:date', async (c) => {
  const { userId } = c.get('auth')
  const date = c.req.param('date')

  const dayDetails = await journeyService.getDayDetails(c.env.DB, userId, date)

  return c.json({ success: true, data: dayDetails })
})

// Update daily log and calculate streak (called when task/habit is completed)
journeyRoutes.post('/log', async (c) => {
  const { userId } = c.get('auth')

  let date: string | undefined
  let updateStreak = false
  try {
    const body = await c.req.json<{ date?: string; updateStreak?: boolean }>()
    date = body.date
    updateStreak = body.updateStreak ?? false
  } catch {
    // Empty body is valid - date is optional
  }

  const logDate = date ?? getTodayDate()

  try {
    const result = await journeyService.updateLogAndStreak(c.env.DB, userId, logDate, updateStreak)

    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Failed to update daily log:', error)
    return c.json({ success: false, error: 'Failed to update daily log' }, 500)
  }
})
