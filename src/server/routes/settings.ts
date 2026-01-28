import { Hono } from 'hono'
import { generateId } from '@shared/utils'
import type { Env, DbUserSettings, DbUser, DbPushSubscription } from '../types'
import type { UserSettings, PushSubscription } from '@shared/types'

export const settingsRoutes = new Hono<{ Bindings: Env }>()

// Get user settings
settingsRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')

  const settings = await c.env.DB.prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<DbUserSettings>()

  if (!settings) {
    // Create default settings
    await c.env.DB.prepare(
      "INSERT INTO user_settings (user_id, theme, character_id, timezone, notify_enabled) VALUES (?, 'light', 'default', 'Asia/Tokyo', 1)"
    )
      .bind(userId)
      .run()

    return c.json({
      success: true,
      data: {
        user_id: userId,
        theme: 'light' as const,
        character_id: 'default',
        timezone: 'Asia/Tokyo',
        notify_enabled: true
      }
    })
  }

  const userSettings: UserSettings = {
    user_id: settings.user_id,
    theme: settings.theme as 'light' | 'dark' | 'auto',
    character_id: settings.character_id,
    timezone: settings.timezone,
    notify_enabled: !!settings.notify_enabled
  }

  return c.json({ success: true, data: userSettings })
})

// Update user settings
settingsRoutes.patch('/', async (c) => {
  const { userId } = c.get('auth')
  const updates = await c.req.json<Partial<Omit<UserSettings, 'user_id'>>>()

  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.theme !== undefined) {
    if (!['light', 'dark', 'auto'].includes(updates.theme)) {
      return c.json({ success: false, error: 'Invalid theme' }, 400)
    }
    fields.push('theme = ?')
    values.push(updates.theme)
  }

  if (updates.character_id !== undefined) {
    fields.push('character_id = ?')
    values.push(updates.character_id)
  }

  if (updates.timezone !== undefined) {
    fields.push('timezone = ?')
    values.push(updates.timezone)
  }

  if (updates.notify_enabled !== undefined) {
    fields.push('notify_enabled = ?')
    values.push(updates.notify_enabled ? 1 : 0)
  }

  if (fields.length === 0) {
    return c.json({ success: false, error: 'No updates provided' }, 400)
  }

  values.push(userId)

  await c.env.DB.prepare(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`)
    .bind(...values)
    .run()

  return c.json({ success: true })
})

// Get monthly goal
settingsRoutes.get('/goal', async (c) => {
  const { userId } = c.get('auth')

  const user = await c.env.DB.prepare('SELECT monthly_goal FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>()

  return c.json({
    success: true,
    data: { monthly_goal: user?.monthly_goal || null }
  })
})

// Update monthly goal
settingsRoutes.put('/goal', async (c) => {
  const { userId } = c.get('auth')
  const { monthly_goal } = await c.req.json<{ monthly_goal: string | null }>()

  if (monthly_goal !== null && monthly_goal.length > 100) {
    return c.json({ success: false, error: 'Goal too long' }, 400)
  }

  await c.env.DB.prepare('UPDATE users SET monthly_goal = ? WHERE id = ?')
    .bind(monthly_goal, userId)
    .run()

  return c.json({ success: true })
})

// Register push subscription
settingsRoutes.post('/push', async (c) => {
  const { userId } = c.get('auth')
  const { endpoint, p256dh, auth } = await c.req.json<{
    endpoint: string
    p256dh: string
    auth: string
  }>()

  if (!endpoint || !p256dh || !auth) {
    return c.json({ success: false, error: 'Missing subscription data' }, 400)
  }

  // Check if subscription already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
  )
    .bind(userId, endpoint)
    .first<{ id: string }>()

  if (existing) {
    // Update existing
    await c.env.DB.prepare('UPDATE push_subscriptions SET p256dh = ?, auth = ? WHERE id = ?')
      .bind(p256dh, auth, existing.id)
      .run()
  } else {
    // Create new
    const id = generateId()
    await c.env.DB.prepare(
      'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(id, userId, endpoint, p256dh, auth, Date.now())
      .run()
  }

  return c.json({ success: true })
})

// Delete push subscription
settingsRoutes.delete('/push', async (c) => {
  const { userId } = c.get('auth')
  const { endpoint } = await c.req.json<{ endpoint: string }>()

  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .bind(userId, endpoint)
    .run()

  return c.json({ success: true })
})

// Get VAPID public key (for push subscription)
settingsRoutes.get('/vapid-key', async (c) => {
  const publicKey = c.env.VAPID_PUBLIC_KEY

  if (!publicKey) {
    return c.json({ success: false, error: 'Push notifications not configured' }, 503)
  }

  return c.json({ success: true, data: { publicKey } })
})
