import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { DataCacheProvider } from './hooks/useDataCache'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { TodayPage } from './pages/TodayPage'
import { JourneyPage } from './pages/JourneyPage'
import { SettingsPage } from './pages/SettingsPage'
import { HabitEditPage } from './pages/HabitEditPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔥</div>
          <p style={{ color: 'var(--text-secondary)' }}>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Routes with Persistent Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<TodayPage />} />
        <Route path="/journey" element={<JourneyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/habits" element={<HabitEditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <DataCacheProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </DataCacheProvider>
    </ThemeProvider>
  )
}
