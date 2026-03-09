import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId = 'classic' | 'horizon' | 'vision'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  preview: { sidebar: string; bg: string; card: string; accent: string }
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Klares, professionelles Design in FernUni-Blau',
    preview: { sidebar: '#003366', bg: '#f8fafc', card: '#ffffff', accent: '#003366' },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Modernes Light-Design mit lila Akzenten und weichen Schatten',
    preview: { sidebar: '#ffffff', bg: '#f4f7fe', card: '#ffffff', accent: '#4318ff' },
  },
  {
    id: 'vision',
    name: 'Vision Dark',
    description: 'Dunkles Glassmorphism-Design mit Neon-Akzenten',
    preview: { sidebar: '#111c44', bg: '#0b1437', card: 'rgba(255,255,255,0.07)', accent: '#4318ff' },
  },
]

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'classic', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem('ui-theme')
    return (stored as ThemeId | null) ?? 'classic'
  })

  function setTheme(t: ThemeId) {
    setThemeState(t)
    localStorage.setItem('ui-theme', t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Set on first render
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
