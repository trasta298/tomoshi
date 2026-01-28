import { Hono } from 'hono'
import { server } from '@passwordless-id/webauthn'
import { generateId, generateSessionToken, parseCookies } from '@shared/utils'
import { createSession, getSessionCookie, getClearSessionCookie } from '../middleware/auth'
import type { Env, DbUser, DbCredential } from '../types'

export const authRoutes = new Hono<{ Bindings: Env }>()

// Registration challenge store (temporary, could use KV for production)
const registrationChallenges = new Map<string, { challenge: string; expires: number }>()
const authenticationChallenges = new Map<
  string,
  { challenge: string; userId: string; expires: number }
>()

// Clean up expired challenges
function cleanupChallenges() {
  const now = Date.now()
  for (const [key, value] of registrationChallenges) {
    if (value.expires < now) registrationChallenges.delete(key)
  }
  for (const [key, value] of authenticationChallenges) {
    if (value.expires < now) authenticationChallenges.delete(key)
  }
}

// Check if username exists
authRoutes.get('/check/:username', async (c) => {
  const username = c.req.param('username')

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
    .bind(username)
    .first<DbUser>()

  return c.json({ exists: !!user })
})

// Start registration
authRoutes.post('/register/start', async (c) => {
  cleanupChallenges()

  const { username } = await c.req.json<{ username: string }>()

  if (!username || username.length < 2 || username.length > 32) {
    return c.json({ success: false, error: 'Invalid username' }, 400)
  }

  // Check if user already exists
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
    .bind(username)
    .first<DbUser>()

  if (existingUser) {
    return c.json({ success: false, error: 'Username already taken' }, 400)
  }

  const challenge = generateSessionToken()
  registrationChallenges.set(username, {
    challenge,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  })

  return c.json({
    success: true,
    challenge,
    rp: {
      name: 'tomoshi',
      id: new URL(c.req.url).hostname
    },
    user: {
      id: username,
      name: username,
      displayName: username
    }
  })
})

// Complete registration
authRoutes.post('/register/finish', async (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { username, registration } = await c.req.json<{ username: string; registration: any }>()

  const challengeData = registrationChallenges.get(username)
  if (!challengeData || challengeData.expires < Date.now()) {
    return c.json({ success: false, error: 'Challenge expired' }, 400)
  }

  try {
    const expected = {
      challenge: challengeData.challenge,
      origin: new URL(c.req.url).origin
    }

    const registrationParsed = await server.verifyRegistration(registration, expected)

    // Create user
    const userId = username
    await c.env.DB.prepare(
      'INSERT INTO users (id, created_at, monthly_goal, streak_count, streak_shields) VALUES (?, ?, NULL, 0, 0)'
    )
      .bind(userId, Date.now())
      .run()

    // Store credential
    const credentialId = generateId()
    await c.env.DB.prepare(
      'INSERT INTO credentials (id, user_id, credential_id, public_key, counter, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        credentialId,
        userId,
        registrationParsed.credential.id,
        JSON.stringify(registrationParsed.credential.publicKey),
        0,
        Date.now()
      )
      .run()

    // Create default settings
    await c.env.DB.prepare(
      "INSERT INTO user_settings (user_id, theme, character_id, timezone, notify_enabled) VALUES (?, 'light', 'default', 'Asia/Tokyo', 1)"
    )
      .bind(userId)
      .run()

    // Clean up challenge
    registrationChallenges.delete(username)

    // Create session
    const sessionToken = generateSessionToken()
    await createSession(c.env.SESSIONS, userId, sessionToken)

    return c.json({ success: true }, 200, {
      'Set-Cookie': getSessionCookie(sessionToken)
    })
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ success: false, error: 'Registration failed' }, 400)
  }
})

// Start authentication
authRoutes.post('/login/start', async (c) => {
  cleanupChallenges()

  const { username } = await c.req.json<{ username: string }>()

  // Get user credentials
  const credentials = await c.env.DB.prepare(
    'SELECT credential_id FROM credentials WHERE user_id = ?'
  )
    .bind(username)
    .all<{ credential_id: string }>()

  if (!credentials.results || credentials.results.length === 0) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }

  const challenge = generateSessionToken()
  authenticationChallenges.set(challenge, {
    challenge,
    userId: username,
    expires: Date.now() + 5 * 60 * 1000
  })

  return c.json({
    success: true,
    challenge,
    allowCredentials: credentials.results.map((cred) => ({
      id: cred.credential_id,
      type: 'public-key'
    }))
  })
})

// Complete authentication
authRoutes.post('/login/finish', async (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { challenge, authentication } = await c.req.json<{
    challenge: string
    authentication: any
  }>()

  const challengeData = authenticationChallenges.get(challenge)
  if (!challengeData || challengeData.expires < Date.now()) {
    return c.json({ success: false, error: 'Challenge expired' }, 400)
  }

  try {
    // Get stored credential
    const storedCred = await c.env.DB.prepare('SELECT * FROM credentials WHERE credential_id = ?')
      .bind(authentication.id)
      .first<DbCredential>()

    if (!storedCred) {
      return c.json({ success: false, error: 'Credential not found' }, 404)
    }

    const expected = {
      challenge: challengeData.challenge,
      origin: new URL(c.req.url).origin,
      userVerified: true
    }

    const credential = {
      id: storedCred.credential_id,
      publicKey: JSON.parse(storedCred.public_key),
      algorithm: 'ES256' as const,
      transports: [] as AuthenticatorTransport[]
    }

    const authResult = await server.verifyAuthentication(authentication, credential, expected)

    // Update counter
    await c.env.DB.prepare('UPDATE credentials SET counter = ? WHERE id = ?')
      .bind(authResult.counter || storedCred.counter + 1, storedCred.id)
      .run()

    // Clean up challenge
    authenticationChallenges.delete(challenge)

    // Create session
    const sessionToken = generateSessionToken()
    await createSession(c.env.SESSIONS, storedCred.user_id, sessionToken)

    return c.json({ success: true }, 200, {
      'Set-Cookie': getSessionCookie(sessionToken)
    })
  } catch (error) {
    console.error('Authentication error:', error)
    return c.json({ success: false, error: 'Authentication failed' }, 400)
  }
})

// Logout
authRoutes.post('/logout', async (c) => {
  const cookies = parseCookies(c.req.header('Cookie') ?? null)
  const sessionToken = cookies['tomoshi_session']

  if (sessionToken) {
    await c.env.SESSIONS.delete(sessionToken)
  }

  return c.json({ success: true }, 200, {
    'Set-Cookie': getClearSessionCookie()
  })
})

// Get current user
authRoutes.get('/me', async (c) => {
  const cookies = parseCookies(c.req.header('Cookie') ?? null)
  const sessionToken = cookies['tomoshi_session']

  if (!sessionToken) {
    return c.json({ success: false, user: null })
  }

  const session = await c.env.SESSIONS.get<{ user_id: string }>(sessionToken, 'json')

  if (!session) {
    return c.json({ success: false, user: null })
  }

  const user = await c.env.DB.prepare(
    'SELECT id, created_at, monthly_goal, streak_count, streak_shields FROM users WHERE id = ?'
  )
    .bind(session.user_id)
    .first<DbUser>()

  if (!user) {
    return c.json({ success: false, user: null })
  }

  return c.json({
    success: true,
    user: {
      id: user.id,
      created_at: user.created_at,
      monthly_goal: user.monthly_goal,
      streak_count: user.streak_count,
      streak_shields: user.streak_shields
    }
  })
})
