import { DurableObject } from 'cloudflare:workers'

interface Env {
  DB: D1Database
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
}

interface ScheduledNotification {
  habitTimeId: string
  habitTitle: string
  time: string
  userId: string
}

interface UserState {
  userId: string
  timezone: string
  notifications: ScheduledNotification[]
  lastUpdated: number
}

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

  private async scheduleNextAlarm(): Promise<void> {
    if (!this.state || this.state.notifications.length === 0) {
      return
    }

    const now = new Date()
    const todayStr = now.toLocaleDateString('sv-SE', { timeZone: this.state.timezone })
    const currentTimeStr = now.toLocaleTimeString('en-GB', {
      timeZone: this.state.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Find next notification time
    let nextTime: Date | null = null

    for (const notification of this.state.notifications) {
      const notifTime = notification.time

      // Calculate the next occurrence
      let targetDate = new Date(`${todayStr}T${notifTime}:00`)

      // Convert to user's timezone
      const targetStr = targetDate.toLocaleString('en-GB', {
        timeZone: this.state.timezone
      })

      // If the time has passed today, schedule for tomorrow
      if (notifTime <= currentTimeStr) {
        targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      }

      if (!nextTime || targetDate < nextTime) {
        nextTime = targetDate
      }
    }

    if (nextTime) {
      await this.ctx.storage.setAlarm(nextTime.getTime())
    }
  }

  async alarm(): Promise<void> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<UserState>('state')
      if (!stored) return
      this.state = stored
    }

    const now = new Date()
    const currentTimeStr = now.toLocaleTimeString('en-GB', {
      timeZone: this.state.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Find notifications that should fire now
    const toSend = this.state.notifications.filter((n) => n.time === currentTimeStr)

    // Send push notifications
    for (const notification of toSend) {
      await this.sendPushNotification(notification)
    }

    // Schedule next alarm
    await this.scheduleNextAlarm()
  }

  private async sendPushNotification(notification: ScheduledNotification): Promise<void> {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) {
      console.log('Push notifications not configured')
      return
    }

    // Get user's push subscriptions from D1
    const subscriptions = await this.env.DB.prepare(
      'SELECT * FROM push_subscriptions WHERE user_id = ?'
    )
      .bind(notification.userId)
      .all<{
        endpoint: string
        p256dh: string
        auth: string
      }>()

    if (!subscriptions.results || subscriptions.results.length === 0) {
      return
    }

    const payload = JSON.stringify({
      title: notification.habitTitle,
      body: `${notification.time} の時間です`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: `habit-${notification.habitTimeId}`,
      data: {
        habitTimeId: notification.habitTimeId,
        url: '/'
      }
    })

    // Note: In production, use webcrypto-web-push library
    // For now, just log the notification
    console.log('Would send push notification:', {
      userId: notification.userId,
      payload,
      subscriptionCount: subscriptions.results.length
    })
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
