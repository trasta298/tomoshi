import { DurableObject } from 'cloudflare:workers'
import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys
} from '@block65/webcrypto-web-push'

interface Env {
  DB: D1Database
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
}

interface ScheduledNotification {
  habitTimeId: string
  habitTitle: string
  time: string // HH:MM format in user's timezone
  userId: string
}

interface UserState {
  userId: string
  timezone: string
  notifications: ScheduledNotification[]
  lastUpdated: number
  // Track which notifications were sent today to prevent duplicates
  // Key: habitTimeId, Value: date string (YYYY-MM-DD)
  sentToday?: Record<string, string>
}

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Tolerance window for alarm delays (in minutes)
const ALARM_TOLERANCE_MINUTES = 5

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours, minutes }
}

function toTotalMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

export class NotificationScheduler extends DurableObject<Env> {
  private state: UserState | null = null

  private async ensureState(): Promise<UserState> {
    if (this.state) return this.state

    const stored = await this.ctx.storage.get<UserState>('state')
    if (!stored) {
      throw new Error('NotificationScheduler not initialized')
    }
    this.state = stored
    return this.state
  }

  private async saveStateAndReschedule(): Promise<void> {
    await this.ctx.storage.put('state', this.state)
    await this.scheduleNextAlarm()
  }

  async initialize(userId: string, timezone: string): Promise<void> {
    this.state = {
      userId,
      timezone,
      notifications: [],
      lastUpdated: Date.now()
    }
    await this.saveStateAndReschedule()
  }

  async updateNotifications(notifications: ScheduledNotification[]): Promise<void> {
    await this.ensureState()
    this.state!.notifications = notifications
    this.state!.lastUpdated = Date.now()
    await this.saveStateAndReschedule()
  }

  async updateTimezone(timezone: string): Promise<void> {
    await this.ensureState()
    this.state!.timezone = timezone
    await this.saveStateAndReschedule()
  }

  /**
   * Calculate UTC timestamp for a given local time in the user's timezone.
   * This correctly handles timezone conversion by computing the offset.
   */
  private getNextAlarmTimeUTC(time: string, timezone: string): number {
    const now = new Date()
    const { hours, minutes } = parseTime(time)
    const { year, month, day, hour, minute } = this.getLocalDateParts(now, timezone)

    const localNowMinutes = toTotalMinutes(hour, minute)
    const targetMinutes = toTotalMinutes(hours, minutes)

    // Determine target date (today or tomorrow if time has passed)
    const targetDate = this.calculateTargetDate(
      year,
      month,
      day,
      targetMinutes <= localNowMinutes
    )

    return this.convertLocalTimeToUTC(targetDate, time, timezone)
  }

  private getLocalDateParts(
    date: Date,
    timezone: string
  ): { year: number; month: number; day: number; hour: number; minute: number } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    const parts = formatter.formatToParts(date)
    const getPart = (type: string): number =>
      parseInt(parts.find((p) => p.type === type)?.value || '0')

    return {
      year: getPart('year'),
      month: getPart('month') - 1, // 0-indexed
      day: getPart('day'),
      hour: getPart('hour'),
      minute: getPart('minute')
    }
  }

  private calculateTargetDate(
    year: number,
    month: number,
    day: number,
    moveToTomorrow: boolean
  ): { year: number; month: number; day: number } {
    if (!moveToTomorrow) {
      return { year, month, day }
    }

    const tempDate = new Date(Date.UTC(year, month, day + 1))
    return {
      year: tempDate.getUTCFullYear(),
      month: tempDate.getUTCMonth(),
      day: tempDate.getUTCDate()
    }
  }

  private convertLocalTimeToUTC(
    targetDate: { year: number; month: number; day: number },
    time: string,
    timezone: string
  ): number {
    const { year, month, day } = targetDate
    const targetLocalDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}:00`

    const refDate = new Date(`${targetLocalDateStr}Z`)
    const localAtRef = new Date(refDate.toLocaleString('en-US', { timeZone: timezone }))
    const utcAtRef = new Date(refDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const offsetMs = utcAtRef.getTime() - localAtRef.getTime()

    return refDate.getTime() + offsetMs
  }

  private async scheduleNextAlarm(): Promise<void> {
    if (!this.state || this.state.notifications.length === 0) {
      await this.ctx.storage.deleteAlarm()
      return
    }

    const now = Date.now()
    let nextAlarmTime: number | null = null

    for (const notification of this.state.notifications) {
      const alarmTime = this.getNextAlarmTimeUTC(notification.time, this.state.timezone)

      if (!nextAlarmTime || alarmTime < nextAlarmTime) {
        nextAlarmTime = alarmTime
      }
    }

    if (nextAlarmTime) {
      // Ensure we don't schedule in the past
      if (nextAlarmTime <= now) {
        nextAlarmTime = now + 60 * 1000 // Schedule 1 minute from now
      }
      await this.ctx.storage.setAlarm(nextAlarmTime)
    }
  }

  async alarm(): Promise<void> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<UserState>('state')
      if (!stored) return
      this.state = stored
    }

    const now = new Date()
    const todayStr = this.formatLocalDate(now, this.state.timezone)
    const currentTotalMinutes = this.getCurrentTotalMinutes(now, this.state.timezone)

    this.state.sentToday = this.cleanupOldSentEntries(this.state.sentToday || {}, todayStr)

    const toSend = this.findNotificationsToSend(currentTotalMinutes, todayStr)

    for (const notification of toSend) {
      await this.sendPushNotification(notification)
      this.state.sentToday[notification.habitTimeId] = todayStr
    }

    await this.ctx.storage.put('state', this.state)
    await this.scheduleNextAlarm()
  }

  private formatLocalDate(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  }

  private getCurrentTotalMinutes(date: Date, timezone: string): number {
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)

    const { hours, minutes } = parseTime(timeStr)
    return toTotalMinutes(hours, minutes)
  }

  private cleanupOldSentEntries(
    sentToday: Record<string, string>,
    todayStr: string
  ): Record<string, string> {
    const cleaned: Record<string, string> = {}
    for (const [habitTimeId, sentDate] of Object.entries(sentToday)) {
      if (sentDate === todayStr) {
        cleaned[habitTimeId] = sentDate
      }
    }
    return cleaned
  }

  private findNotificationsToSend(
    currentTotalMinutes: number,
    todayStr: string
  ): ScheduledNotification[] {
    return this.state!.notifications.filter((n) => {
      if (this.state!.sentToday?.[n.habitTimeId] === todayStr) {
        return false
      }

      const { hours, minutes } = parseTime(n.time)
      const targetTotalMinutes = toTotalMinutes(hours, minutes)

      let diff = currentTotalMinutes - targetTotalMinutes
      if (diff < -720) diff += 1440
      if (diff > 720) diff -= 1440

      return diff >= 0 && diff < ALARM_TOLERANCE_MINUTES
    })
  }

  private async sendPushNotification(notification: ScheduledNotification): Promise<void> {
    const vapid = this.getVapidKeys()
    if (!vapid) {
      console.log('Push notifications not configured: VAPID keys missing')
      return
    }

    const subscriptions = await this.fetchUserSubscriptions(notification.userId)
    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${notification.userId}`)
      return
    }

    const message = this.buildPushMessage(notification)
    const expiredIds = await this.sendToAllSubscriptions(subscriptions, message, vapid)

    if (expiredIds.length > 0) {
      await this.deleteExpiredSubscriptions(expiredIds)
    }
  }

  private getVapidKeys(): VapidKeys | null {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) {
      return null
    }
    return {
      subject: this.env.VAPID_SUBJECT,
      publicKey: this.env.VAPID_PUBLIC_KEY,
      privateKey: this.env.VAPID_PRIVATE_KEY
    }
  }

  private async fetchUserSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
    const result = await this.env.DB.prepare(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
    )
      .bind(userId)
      .all<PushSubscriptionRow>()

    return result.results || []
  }

  private buildPushMessage(notification: ScheduledNotification): PushMessage {
    const messageData = JSON.stringify({
      title: `${notification.habitTitle}の時間です`,
      body: `${notification.time} - タップして記録しましょう`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: `habit-${notification.habitTimeId}`,
      requireInteraction: true,
      actions: [
        { action: 'complete', title: '✓ 完了' },
        { action: 'dismiss', title: 'あとで' }
      ],
      data: {
        habitTimeId: notification.habitTimeId,
        url: '/'
      }
    })

    return {
      data: messageData,
      options: { ttl: 3600 }
    }
  }

  private async sendToAllSubscriptions(
    subscriptions: PushSubscriptionRow[],
    message: PushMessage,
    vapid: VapidKeys
  ): Promise<string[]> {
    const expiredIds: string[] = []

    for (const sub of subscriptions) {
      const expired = await this.sendToSubscription(sub, message, vapid)
      if (expired) {
        expiredIds.push(sub.id)
      }
    }

    return expiredIds
  }

  private async sendToSubscription(
    sub: PushSubscriptionRow,
    message: PushMessage,
    vapid: VapidKeys
  ): Promise<boolean> {
    const subscription: PushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }

    try {
      const payload = await buildPushPayload(message, subscription, vapid)
      const response = await fetch(subscription.endpoint, {
        method: payload.method,
        headers: payload.headers,
        body: payload.body
      } as RequestInit)

      if (response.status === 404 || response.status === 410) {
        console.log(`Push subscription expired: ${sub.id}`)
        return true
      }

      if (!response.ok) {
        console.error(`Push notification failed: ${response.status} ${response.statusText}`)
      } else {
        console.log(`Push notification sent successfully to subscription ${sub.id}`)
      }
    } catch (error) {
      console.error(`Error sending push notification to ${sub.id}:`, error)
    }

    return false
  }

  private async deleteExpiredSubscriptions(ids: string[]): Promise<void> {
    try {
      const placeholders = ids.map(() => '?').join(',')
      await this.env.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
      console.log(`Deleted ${ids.length} expired push subscriptions`)
    } catch (error) {
      console.error('Error deleting expired subscriptions:', error)
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      return await this.handleRoute(request.method, path, request)
    } catch (error) {
      console.error('NotificationScheduler error:', error)
      return jsonResponse({ error: 'Internal error' }, 500)
    }
  }

  private async handleRoute(
    method: string,
    path: string,
    request: Request
  ): Promise<Response> {
    if (method === 'POST' && path === '/initialize') {
      const { userId, timezone } = (await request.json()) as {
        userId: string
        timezone: string
      }
      await this.initialize(userId, timezone)
      return jsonResponse({ success: true })
    }

    if (method === 'POST' && path === '/update-notifications') {
      const { notifications } = (await request.json()) as {
        notifications: ScheduledNotification[]
      }
      await this.updateNotifications(notifications)
      return jsonResponse({ success: true })
    }

    if (method === 'POST' && path === '/update-timezone') {
      const { timezone } = (await request.json()) as { timezone: string }
      await this.updateTimezone(timezone)
      return jsonResponse({ success: true })
    }

    if (method === 'GET' && path === '/state') {
      return await this.handleGetState()
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }

  private async handleGetState(): Promise<Response> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<UserState>('state')) || null
    }
    const alarm = await this.ctx.storage.getAlarm()
    return jsonResponse({
      success: true,
      state: this.state,
      alarm: alarm ? new Date(alarm).toISOString() : null
    })
  }
}
