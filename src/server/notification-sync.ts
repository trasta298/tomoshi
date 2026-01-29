import type { Env } from './types'

interface ScheduledNotification {
  habitTimeId: string
  habitTitle: string
  time: string
  userId: string
}

/**
 * ユーザーの全通知スケジュールをDurable Objectに同期する
 * 習慣の作成/更新/削除時に呼び出す
 */
export async function syncUserNotifications(env: Env, userId: string): Promise<void> {
  // ユーザーのタイムゾーンを取得
  const settings = await env.DB.prepare(
    'SELECT timezone FROM user_settings WHERE user_id = ?'
  )
    .bind(userId)
    .first<{ timezone: string }>()

  const timezone = settings?.timezone || 'Asia/Tokyo'

  // 通知が有効な全ての習慣時刻を取得
  const times = await env.DB.prepare(
    `SELECT ht.id as habit_time_id, ht.time, h.title as habit_title, h.user_id
     FROM habit_times ht
     JOIN habits h ON ht.habit_id = h.id
     WHERE h.user_id = ? AND ht.notification_enabled = 1`
  )
    .bind(userId)
    .all<{
      habit_time_id: string
      time: string
      habit_title: string
      user_id: string
    }>()

  const notifications: ScheduledNotification[] = (times.results || []).map((t) => ({
    habitTimeId: t.habit_time_id,
    habitTitle: t.habit_title,
    time: t.time,
    userId: t.user_id
  }))

  // Durable ObjectのIDをユーザーIDから生成
  const doId = env.NOTIFICATION_SCHEDULER.idFromName(userId)
  const stub = env.NOTIFICATION_SCHEDULER.get(doId)

  // Durable Objectの状態を確認
  const stateResponse = await stub.fetch(new Request('http://do/state'))
  const stateResult = (await stateResponse.json()) as { success: boolean; state: unknown }

  if (!stateResult.state) {
    // 初期化されていない場合は初期化
    await stub.fetch(
      new Request('http://do/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, timezone })
      })
    )
  }

  // 通知スケジュールを更新
  await stub.fetch(
    new Request('http://do/update-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications })
    })
  )
}

/**
 * ユーザーのタイムゾーンをDurable Objectに同期する
 * 設定変更時に呼び出す
 */
export async function syncUserTimezone(env: Env, userId: string, timezone: string): Promise<void> {
  const doId = env.NOTIFICATION_SCHEDULER.idFromName(userId)
  const stub = env.NOTIFICATION_SCHEDULER.get(doId)

  // Durable Objectの状態を確認
  const stateResponse = await stub.fetch(new Request('http://do/state'))
  const stateResult = (await stateResponse.json()) as { success: boolean; state: unknown }

  if (!stateResult.state) {
    // 初期化されていない場合は初期化（通知は後で同期される）
    await stub.fetch(
      new Request('http://do/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, timezone })
      })
    )
  } else {
    // タイムゾーンを更新
    await stub.fetch(
      new Request('http://do/update-timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone })
      })
    )
  }
}
