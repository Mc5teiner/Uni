import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId = 'material' | 'material-dark'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  preview: { sidebar: string; bg: string; card: string; accent: string }
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'material',
    name: 'Material Light',
    description: 'Helles Material Dashboard Design',
    preview: { sidebar: '#42424a', bg: '#f0f2f5', card: '#ffffff', accent: '#4CAF50' },
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    description: 'Dunkles Material Dashboard Design',
    preview: { sidebar: '#42424a', bg: '#1a2035', card: '#202940', accent: '#66BB6A' },
  },
]

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'material', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem('ui-theme')
    if (stored === 'material' || stored === 'material-dark') return stored
    return 'material'
  })

  function setTheme(t: ThemeId) {
    setThemeState(t)
    localStorage.setItem('ui-theme', t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
