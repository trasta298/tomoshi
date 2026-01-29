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

// Tolerance window for alarm delays (in minutes)
const ALARM_TOLERANCE_MINUTES = 5

export class NotificationScheduler extends DurableObject<Env> {
  private state: UserState | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async initialize(userId: string, timezone: string): Promise<void> {
    this.state = {
      userId,
      timezone,
      notifications: [],
      lastUpdated: Date.now()
    }
    await this.ctx.storage.put('state', this.state)
    await this.scheduleNextAlarm()
  }

  async updateNotifications(notifications: ScheduledNotification[]): Promise<void> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<UserState>('state')
      if (!stored) {
        throw new Error('NotificationScheduler not initialized')
      }
      this.state = stored
    }

    this.state.notifications = notifications
    this.state.lastUpdated = Date.now()
    await this.ctx.storage.put('state', this.state)
    await this.scheduleNextAlarm()
  }

  async updateTimezone(timezone: string): Promise<void> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<UserState>('state')
      if (!stored) {
        throw new Error('NotificationScheduler not initialized')
      }
      this.state = stored
    }

    this.state.timezone = timezone
    await this.ctx.storage.put('state', this.state)
    await this.scheduleNextAlarm()
  }

  /**
   * Calculate UTC timestamp for a given local time in the user's timezone.
   * This correctly handles timezone conversion by computing the offset.
   */
  private getNextAlarmTimeUTC(time: string, timezone: string): number {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)

    // Get current time in user's timezone using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0'

    const localYear = parseInt(getPart('year'))
    const localMonth = parseInt(getPart('month')) - 1 // 0-indexed
    const localDay = parseInt(getPart('day'))
    const localHour = parseInt(getPart('hour'))
    const localMinute = parseInt(getPart('minute'))

    // Create target date in user's local timezone
    // We'll calculate this by finding the offset between local and UTC
    const localNowMinutes = localHour * 60 + localMinute
    const targetMinutes = hours * 60 + minutes

    // Start with today's date
    let targetDay = localDay
    let targetMonth = localMonth
    let targetYear = localYear

    // If target time has passed today, move to tomorrow
    if (targetMinutes <= localNowMinutes) {
      // Add one day, handling month/year rollover
      const tempDate = new Date(Date.UTC(localYear, localMonth, localDay + 1))
      targetYear = tempDate.getUTCFullYear()
      targetMonth = tempDate.getUTCMonth()
      targetDay = tempDate.getUTCDate()
    }

    // Create a reference date in UTC that represents the same wall clock time
    // in the target timezone
    const targetLocalDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T${time}:00`

    // Use a trick: create date at midnight UTC, then adjust
    // Get timezone offset at target date by comparing UTC to local representation
    const refDate = new Date(`${targetLocalDateStr}Z`) // Treat as UTC first
    const localAtRef = new Date(
      refDate.toLocaleString('en-US', { timeZone: timezone })
    )
    const utcAtRef = new Date(refDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const offsetMs = utcAtRef.getTime() - localAtRef.getTime()

    // The actual UTC time is: local time + offset
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

    // Get current date and time in user's timezone
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.state.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.state.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const todayStr = dateFormatter.format(now)
    const currentTimeStr = timeFormatter.format(now)
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number)
    const currentTotalMinutes = currentHour * 60 + currentMinute

    // Initialize sentToday if not exists
    if (!this.state.sentToday) {
      this.state.sentToday = {}
    }

    // Clean up old entries (from previous days)
    for (const [habitTimeId, sentDate] of Object.entries(this.state.sentToday)) {
      if (sentDate !== todayStr) {
        delete this.state.sentToday[habitTimeId]
      }
    }

    // Find notifications that should fire now (with tolerance window)
    // This handles Durable Object cold start delays and backpressure
    const toSend = this.state.notifications.filter((n) => {
      // Skip if already sent today
      if (this.state!.sentToday?.[n.habitTimeId] === todayStr) {
        return false
      }

      const [targetHour, targetMinute] = n.time.split(':').map(Number)
      const targetTotalMinutes = targetHour * 60 + targetMinute

      // Calculate difference (handle midnight crossing)
      let diff = currentTotalMinutes - targetTotalMinutes
      if (diff < -720) diff += 1440 // Crossed midnight forward
      if (diff > 720) diff -= 1440 // Crossed midnight backward

      // Send if current time is within tolerance window after target time
      return diff >= 0 && diff < ALARM_TOLERANCE_MINUTES
    })

    // Send push notifications and mark as sent
    for (const notification of toSend) {
      await this.sendPushNotification(notification)
      this.state.sentToday![notification.habitTimeId] = todayStr
    }

    // Save state with updated sentToday
    await this.ctx.storage.put('state', this.state)

    // Schedule next alarm
    await this.scheduleNextAlarm()
  }

  private async sendPushNotification(notification: ScheduledNotification): Promise<void> {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) {
      console.log('Push notifications not configured: VAPID keys missing')
      return
    }

    // Get user's push subscriptions from D1
    const subscriptions = await this.env.DB.prepare(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
    )
      .bind(notification.userId)
      .all<{
        id: string
        endpoint: string
        p256dh: string
        auth: string
      }>()

    if (!subscriptions.results || subscriptions.results.length === 0) {
      console.log(`No push subscriptions found for user ${notification.userId}`)
      return
    }

    const vapid: VapidKeys = {
      subject: this.env.VAPID_SUBJECT,
      publicKey: this.env.VAPID_PUBLIC_KEY,
      privateKey: this.env.VAPID_PRIVATE_KEY
    }

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

    const message: PushMessage = {
      data: messageData,
      options: {
        ttl: 3600 // 1 hour
      }
    }

    // Send to all subscriptions
    const expiredSubscriptionIds: string[] = []

    for (const sub of subscriptions.results) {
      const subscription: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        const payload = await buildPushPayload(message, subscription, vapid)
        const response = await fetch(subscription.endpoint, {
          method: payload.method,
          headers: payload.headers,
          body: payload.body
        } as RequestInit)

        if (response.status === 404 || response.status === 410) {
          // Subscription has expired or been unsubscribed
          console.log(`Push subscription expired: ${sub.id}`)
          expiredSubscriptionIds.push(sub.id)
        } else if (!response.ok) {
          console.error(`Push notification failed: ${response.status} ${response.statusText}`)
        } else {
          console.log(`Push notification sent successfully to subscription ${sub.id}`)
        }
      } catch (error) {
        console.error(`Error sending push notification to ${sub.id}:`, error)
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptionIds.length > 0) {
      try {
        const placeholders = expiredSubscriptionIds.map(() => '?').join(',')
        await this.env.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${placeholders})`)
          .bind(...expiredSubscriptionIds)
          .run()
        console.log(`Deleted ${expiredSubscriptionIds.length} expired push subscriptions`)
      } catch (error) {
        console.error('Error deleting expired subscriptions:', error)
      }
    }
  }

  // HTTP handler for RPC calls
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (request.method === 'POST' && path === '/initialize') {
        const { userId, timezone } = (await request.json()) as { userId: string; timezone: string }
        await this.initialize(userId, timezone)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (request.method === 'POST' && path === '/update-notifications') {
        const { notifications } = (await request.json()) as {
          notifications: ScheduledNotification[]
        }
        await this.updateNotifications(notifications)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (request.method === 'POST' && path === '/update-timezone') {
        const { timezone } = (await request.json()) as { timezone: string }
        await this.updateTimezone(timezone)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (request.method === 'GET' && path === '/state') {
        if (!this.state) {
          this.state = (await this.ctx.storage.get<UserState>('state')) || null
        }
        return new Response(JSON.stringify({ success: true, state: this.state }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('NotificationScheduler error:', error)
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
