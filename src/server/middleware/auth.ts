import { createMiddleware } from 'hono/factory'
import { parseCookies } from '@shared/utils'
import type { Env, Session, AuthContext } from '../types'

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
  }
}

const SESSION_COOKIE_NAME = 'tomoshi_session'
const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const cookies = parseCookies(c.req.header('Cookie') ?? null)
  const sessionToken = cookies[SESSION_COOKIE_NAME]

  if (!sessionToken) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const sessionData = await c.env.SESSIONS.get<Session>(sessionToken, 'json')

  if (!sessionData) {
    return c.json({ success: false, error: 'Session expired' }, 401)
  }

  if (sessionData.expires_at < Date.now()) {
    await c.env.SESSIONS.delete(sessionToken)
    return c.json({ success: false, error: 'Session expired' }, 401)
  }

  c.set('auth', { userId: sessionData.user_id })

  await next()
})

export async function createSession(kv: KVNamespace, userId: string, token: string): Promise<void> {
  const session: Session = {
    user_id: userId,
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_TTL * 1000
  }

  await kv.put(token, JSON.stringify(session), {
    expirationTtl: SESSION_TTL
  })
}

export function getSessionCookie(token: string, maxAge = SESSION_TTL): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

export function getClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}
