import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 設計仕様: 22:00-6:00は自動でダークテーマ（夜の旅路モード）
function isNightTime(): boolean {
  const hour = new Date().getHours()
  return hour >= 22 || hour < 6
}

function getAutoTheme(): 'light' | 'dark' {
  // 夜時間帯は強制的にダーク
  if (isNightTime()) {
    return 'dark'
  }
  // それ以外はシステム設定に従う
  return getSystemTheme()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('theme') as Theme) || 'light'
  })

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'auto') return getAutoTheme()
    return theme
  })

  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'auto') {
        setEffectiveTheme(getAutoTheme())
      } else {
        setEffectiveTheme(theme)
      }
    }

    updateEffectiveTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const systemHandler = () => {
      if (theme === 'auto') {
        setEffectiveTheme(getAutoTheme())
      }
    }
    mediaQuery.addEventListener('change', systemHandler)

    // 時間帯による自動切替のためのインターバル（1分ごとにチェック）
    const intervalId = setInterval(() => {
      if (theme === 'auto') {
        setEffectiveTheme(getAutoTheme())
      }
    }, 60000)

    return () => {
      mediaQuery.removeEventListener('change', systemHandler)
      clearInterval(intervalId)
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)

    // ステータスバーの色も更新
    const themeColor = effectiveTheme === 'dark' ? '#252540' : '#FFDAD6'
    const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])')
      || document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor)
    }
  }, [effectiveTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
