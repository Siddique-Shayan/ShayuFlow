import { useCallback, useState } from 'react'

const KEY = 'pp_theme'
export type Theme = 'light' | 'dark'

export function useTheme() {
  // index.html already applied the saved (or system) theme before first paint.
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage can be blocked; the theme still applies for this session.
    }
    setTheme(next)
  }, [theme])

  return { theme, toggle }
}
