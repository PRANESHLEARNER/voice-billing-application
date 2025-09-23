"use client"

import { useEffect } from "react"

export function ThemeScript() {
  useEffect(() => {
    // Apply saved theme on initial load
    const applyInitialTheme = () => {
      try {
        const savedSettings = localStorage.getItem('systemSettings')
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          const theme = settings.theme || 'system'
          applyTheme(theme)
        } else {
          // Default to system theme if no settings saved
          applyTheme('system')
        }
      } catch (error) {
        console.error('Failed to apply initial theme:', error)
        applyTheme('system')
      }
    }

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement
      
      if (theme === 'dark') {
        root.classList.add('dark')
      } else if (theme === 'light') {
        root.classList.remove('dark')
      } else {
        // System theme
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (isDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      try {
        const savedSettings = localStorage.getItem('systemSettings')
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          if (settings.theme === 'system') {
            applyTheme('system')
          }
        }
      } catch (error) {
        console.error('Failed to handle system theme change:', error)
      }
    }

    // Apply initial theme
    applyInitialTheme()
    
    // Add system theme change listener
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  return null
}
