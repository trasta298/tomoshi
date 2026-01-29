import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'check' | 'login' | 'register'>('check')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, checkUsername, user } = useAuth()
  const navigate = useNavigate()

  // If already logged in, redirect
  if (user) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'check') {
        const exists = await checkUsername(username)
        setMode(exists ? 'login' : 'register')
      } else if (mode === 'login') {
        await login(username)
        navigate('/')
      } else {
        await register(username)
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setMode('check')
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔥</div>
          <h1 className="heading text-3xl">tomoshi</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            きょうの3つ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'check' && (
            <>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-form-type="other"
                className="w-full p-4 rounded-2xl"
                style={{ background: 'var(--bg-card)' }}
                minLength={2}
                maxLength={32}
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || username.length < 2}
                className="button button--primary w-full"
              >
                {loading ? '確認中...' : '続ける'}
              </button>
            </>
          )}

          {mode === 'login' && (
            <>
              <div className="text-center mb-4">
                <p className="heading text-lg">おかえりなさい！</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {username}
                </p>
              </div>
              <button type="submit" disabled={loading} className="button button--primary w-full">
                {loading ? '認証中...' : 'Passkeyでログイン 🔐'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="button button--secondary w-full"
              >
                戻る
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="text-center mb-4">
                <p className="heading text-lg">はじめまして！</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {username} さん
                </p>
              </div>
              <button type="submit" disabled={loading} className="button button--primary w-full">
                {loading ? '登録中...' : 'Passkeyで登録 🔐'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="button button--secondary w-full"
              >
                戻る
              </button>
            </>
          )}
        </form>

        {/* Error */}
        {error && (
          <p className="text-center text-sm mt-4" style={{ color: '#e57373' }}>
            {error}
          </p>
        )}

        {/* Info */}
        <p className="text-center text-xs mt-8" style={{ color: 'var(--text-secondary)' }}>
          Passkeyを使用して安全にログインします。
          <br />
          パスワードは必要ありません。
        </p>
      </div>
    </div>
  )
}
