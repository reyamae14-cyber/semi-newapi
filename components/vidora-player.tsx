"use client"

import { useEffect, useRef, useState } from "react"
import { themeManager, type Theme } from "@/lib/theme-manager"

interface VidoraPlayerProps {
  movieId?: string
  tvShowId?: string
  season?: number
  episode?: number
  autoplay?: boolean
  autonextepisode?: boolean
  backbutton?: string
  logo?: string
  pausescreen?: boolean
  idlecheck?: number
  className?: string
}

export function VidoraPlayer({
  movieId,
  tvShowId,
  season,
  episode,
  autoplay = false,
  autonextepisode = true,
  backbutton,
  logo,
  pausescreen = true,
  idlecheck = 0,
  className = ""
}: VidoraPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [currentTheme, setCurrentTheme] = useState<Theme>(themeManager.getCurrentTheme())

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme)
      if (iframeRef.current) {
        applyVidoraTheme(iframeRef.current, theme)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (iframeRef.current) {
      applyVidoraTheme(iframeRef.current, currentTheme)
    }
  }, [currentTheme])

  const applyVidoraTheme = (iframe: HTMLIFrameElement, theme: Theme) => {
    // Remove borders as requested
    iframe.style.border = "none"
    iframe.style.borderRadius = "8px"
    iframe.style.boxShadow = "none"
    iframe.style.overflow = "hidden"
    
    // Apply theme to container
    const container = iframe.parentElement
    if (container) {
      container.style.background = theme.colors.background
      container.style.borderRadius = "8px"
    }
  }

  const buildVidoraUrl = () => {
    const baseUrl = "https://vidora.su/player"
    const params = new URLSearchParams()

    // Content ID
    if (movieId) {
      params.append("id", movieId)
    } else if (tvShowId && season && episode) {
      params.append("id", `${tvShowId}/${season}/${episode}`)
    }

    // Vidora parameters
    if (autoplay) params.append("autoplay", "true")
    if (autonextepisode) params.append("autonextepisode", "true")
    if (backbutton) params.append("backbutton", backbutton)
    if (logo) params.append("logo", logo)
    if (pausescreen) params.append("pausescreen", "true")
    if (idlecheck > 0) params.append("idlecheck", idlecheck.toString())

    // Apply theme color to Vidora player
    const themeColor = currentTheme.colors.primary.replace("#", "")
    params.append("colour", themeColor)

    return `${baseUrl}?${params.toString()}`
  }

  // Listen for progress updates from Vidora
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://vidora.su") return
      
      try {
        const data = event.data
        if (data.type === "progress") {
          console.log("Vidora progress update:", data)
          // Handle progress sync here if needed
        }
      } catch (error) {
        console.log("Error parsing Vidora message:", error)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  if (!movieId && !(tvShowId && season && episode)) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-900 rounded-lg ${className}`}>
        <p className="text-gray-400">No content ID provided</p>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`} style={{ background: currentTheme.colors.background }}>
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src={buildVidoraUrl()}
          className="w-full h-full rounded-lg"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title="Vidora Video Player"
          style={{
            border: "none",
            borderRadius: "8px",
            boxShadow: "none"
          }}
          onError={() => console.log('Vidora player loaded with theme:', currentTheme.name)}
        />
        {/* Transparent overlays to block back button clicks */}
        <div
          className="absolute top-0 left-0 w-16 h-16 z-10"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.preventDefault()}
        />
        <div
          className="absolute top-0 left-16 w-16 h-16 z-10"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.preventDefault()}
        />
        <div
          className="absolute top-16 left-0 w-16 h-16 z-10"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.preventDefault()}
        />
        <div
          className="absolute top-16 left-16 w-16 h-16 z-10"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.preventDefault()}
        />
        {/* Theme indicator overlay */}
        <div 
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-sm font-medium backdrop-blur-sm"
          style={{ 
            background: `linear-gradient(135deg, ${currentTheme.colors.primary}dd, ${currentTheme.colors.secondary}dd)`,
            border: `1px solid ${currentTheme.colors.primary}44`
          }}
        >
          {currentTheme.name} Theme
        </div>
      </div>
    </div>
  )
}

// Export utility function for external use
export const getVidoraEmbedUrl = (options: {
  movieId?: string
  tvShowId?: string
  season?: number
  episode?: number
  theme?: Theme
  autoplay?: boolean
  autonextepisode?: boolean
  backbutton?: string
  logo?: string
  pausescreen?: boolean
  idlecheck?: number
}) => {
  const baseUrl = "https://vidora.su/player"
  const params = new URLSearchParams()

  if (options.movieId) {
    params.append("id", options.movieId)
  } else if (options.tvShowId && options.season && options.episode) {
    params.append("id", `${options.tvShowId}/${options.season}/${options.episode}`)
  }

  if (options.autoplay) params.append("autoplay", "true")
  if (options.autonextepisode) params.append("autonextepisode", "true")
  if (options.backbutton) params.append("backbutton", options.backbutton)
  if (options.logo) params.append("logo", options.logo)
  if (options.pausescreen) params.append("pausescreen", "true")
  if (options.idlecheck && options.idlecheck > 0) params.append("idlecheck", options.idlecheck.toString())

  if (options.theme) {
    const themeColor = options.theme.colors.primary.replace("#", "")
    params.append("colour", themeColor)
  }

  return `${baseUrl}?${params.toString()}`
}