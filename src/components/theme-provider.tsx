'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously on first render (client-side)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = (localStorage.getItem('adtec-theme') as Theme | null) ?? 'light'
    if (stored === 'dark') document.documentElement.classList.add('dark')
    return stored
  })
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    if (typeof window !== 'undefined') localStorage.setItem('adtec-theme', t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
