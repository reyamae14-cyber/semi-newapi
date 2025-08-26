"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Palette } from "lucide-react"
import { themes, themeManager, type Theme } from "@/lib/theme-manager"

interface ThemeSelectorProps {
  onThemeChange?: (theme: Theme) => void
}

export function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const [showThemes, setShowThemes] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentTheme())

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme)
      onThemeChange?.(theme)
    })
    return unsubscribe
  }, [onThemeChange])

  const handleThemeSelect = (themeId: string) => {
    themeManager.setTheme(themeId)
    setShowThemes(false)
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        className="w-8 h-8 p-0 bg-black/70 hover:bg-black/80 text-white border-gray-600 rounded-full flex items-center justify-center"
        onClick={() => setShowThemes(!showThemes)}
      >
        <Palette className="w-4 h-4" />
      </Button>

      {showThemes && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-black/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Theme Selection</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Choose a theme that applies to the video player</p>

            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    currentTheme.id === theme.id
                      ? "border-white bg-gray-800"
                      : "border-gray-600 hover:border-gray-500 bg-gray-900"
                  }`}
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  <div
                    className="w-full h-8 rounded mb-2"
                    style={{ background: theme.gradient || theme.colors.primary }}
                  />
                  <div className="text-sm font-medium text-white">{theme.name}</div>
                  {currentTheme.id === theme.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
