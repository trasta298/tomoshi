import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { client } from '@passwordless-id/webauthn'
import type { User } from '@shared/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string) => Promise<void>
  register: (username: string) => Promise<void>
  logout: () => Promise<void>
  checkUsername: (username: string) => Promise<boolean>
}

interface AuthResponse {
  success: boolean
  error?: string
  user?: User
  exists?: boolean
  challenge?: string
  allowCredentials?: { id: string; type: string }[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data: AuthResponse = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const checkUsername = async (username: string): Promise<boolean> => {
    const res = await fetch(`/api/auth/check/${encodeURIComponent(username)}`)
    const data: AuthResponse = await res.json()
    return data.exists ?? false
  }

  const register = async (username: string) => {
    // Start registration
    const startRes = await fetch('/api/auth/register/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    const startData: AuthResponse = await startRes.json()

    if (!startData.success) {
      throw new Error(startData.error || 'Registration failed')
    }

    // Create credential using WebAuthn
    const registration = await client.register({
      user: username,
      challenge: startData.challenge!,
      discoverable: 'preferred',
      attestation: false
    })

    // Finish registration
    const finishRes = await fetch('/api/auth/register/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        registration
      })
    })
    const finishData: AuthResponse = await finishRes.json()

    if (!finishData.success) {
      throw new Error(finishData.error || 'Registration failed')
    }

    await checkAuth()
  }

  const login = async (username: string) => {
    // Start authentication
    const startRes = await fetch('/api/auth/login/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    const startData: AuthResponse = await startRes.json()

    if (!startData.success) {
      throw new Error(startData.error || 'Login failed')
    }

    // Authenticate using WebAuthn
    const authentication = await client.authenticate({
      challenge: startData.challenge!,
      allowCredentials: startData.allowCredentials?.map((c) => c.id)
    })

    // Finish authentication
    const finishRes = await fetch('/api/auth/login/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: startData.challenge,
        authentication
      })
    })
    const finishData: AuthResponse = await finishRes.json()

    if (!finishData.success) {
      throw new Error(finishData.error || 'Login failed')
    }

    await checkAuth()
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkUsername }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
