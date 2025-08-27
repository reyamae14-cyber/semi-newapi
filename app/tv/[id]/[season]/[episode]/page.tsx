"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Star, Calendar, Tv, Cloud, Clock } from "lucide-react"
import { proxyManager } from "@/lib/proxy-manager"
import { ThemeSelector } from "@/components/theme-selector"
import { themeManager, type Theme } from "@/lib/theme-manager"
import { ClientTime, useTimeSync } from "@/components/client-time"

interface ServerOption {
  name: string
  url: string
  ping?: number | null
  proxied?: boolean
  proxyName?: string
}

interface TMDBTVShow {
  id: number
  name: string
  overview: string
  poster_path: string
  first_air_date: string
  vote_average: number
  number_of_seasons: number
  genres: { id: number; name: string }[]
}

export default function TVPlayerPage() {
  const tvServers: ServerOption[] = [
    { name: "Zeticuz", url: "https://watch.vidora.su/watch/tv/" },
    { name: "Infested", url: "https://xprime.tv/watch/" },
    { name: "Spectre", url: "https://hexa.watch/watch/tv/" },
    { name: "Invictuz", url: "https://vidsrc.cc/v3/embed/tv/" },
    { name: "Bastardo", url: "https://apimocine.vercel.app/tv/" },
    { name: "Icarus", url: "https://vidjoy.pro/embed/tv/" },
    { name: "Orion", url: "https://player.vidsrc.co/embed/tv/" },
    { name: "Theseus", url: "https://vidify.top/embed/tv/" },
  ]

  const params = useParams()
  const router = useRouter()
  const tvId = params.id as string
  const season = params.season as string
  const episode = params.episode as string
  const [currentUrl, setCurrentUrl] = useState("")
  const [selectedServer, setSelectedServer] = useState("Zeticuz")
  const [servers, setServers] = useState<ServerOption[]>(tvServers)
  const [isLoading, setIsLoading] = useState(false)
  const [tvData, setTVData] = useState<TMDBTVShow | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [fastestProxies, setFastestProxies] = useState<any[]>([])  
  const [proxyMessage, setProxyMessage] = useState<string | null>(null)
  const TMDB_API_KEY = "39e5d4874c102b0a9b61639c81b9bda1"
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null)
  const [showTimeInfo, setShowTimeInfo] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { timeZoneInfo, isInitialized: timeInitialized } = useTimeSync()

  useEffect(() => {
    if (tvId) {
      fetchTVData(tvId)
      initializeProxySystem()
    }
  }, [tvId, season, episode])

  // Prevent hydration errors by ensuring client-side only rendering
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Initialize theme after component mounts to avoid hydration mismatch
    setCurrentTheme(themeManager.getCurrentTheme())
    
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme)
      applyThemeToPlayer(theme)
    })
    return unsubscribe
  }, [])

  const initializeProxySystem = async () => {
    setIsLoading(true)

    // Initialize servers immediately for display
    setServers(tvServers)

    try {
      await proxyManager.detectUserLocation()
      const proxies = await proxyManager.findFastestProxies()
      setFastestProxies(proxies)

      const zeticuzServer = tvServers[0] // Zeticuz is at index 0
      await loadContent(zeticuzServer.url, zeticuzServer.name, true)

      // Refresh pings in background without affecting server display
      refreshPings()
    } catch (error) {
      console.error("[v0] Proxy initialization failed:", error)
      const zeticuzServer = tvServers[0] // Zeticuz is at index 0
      loadContent(zeticuzServer.url, zeticuzServer.name, false)
      // Still refresh pings for status display
      refreshPings()
    }

    setIsLoading(false)
  }

  const fetchTVData = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
      if (response.ok) {
        const data = await response.json()
        setTVData(data)
      }
    } catch (error) {
      console.error("Error fetching TV data:", error)
    }
    setIsLoading(false)
  }

  const measurePing = async (url: string, useProxy = true): Promise<number | null> => {
    try {
      let testUrl = url

      if (useProxy) {
        testUrl = await proxyManager.routeThroughProxy(url)
      }

      const domain = new URL(testUrl).origin
      const start = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)

      await fetch(domain, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const end = performance.now()
      return Math.round(end - start)
    } catch (e) {
      return null
    }
  }

  const refreshPings = async () => {
    setIsLoading(true)

    const testPromises = tvServers.map(async (server) => {
      const [directPing, proxiedPing] = await Promise.all([
        measurePing(server.url, false),
        measurePing(server.url, true),
      ])

      const usePing = proxiedPing && proxiedPing < (directPing || 999) ? proxiedPing : directPing
      const useProxy = proxiedPing && proxiedPing < (directPing || 999)

      return {
        ...server,
        ping: usePing,
        proxied: useProxy,
        proxyName: useProxy ? fastestProxies[0]?.name : undefined,
      }
    })

    const updatedServers = await Promise.all(testPromises)
    setServers(updatedServers)
    setIsLoading(false)
  }

  const loadContent = async (serverUrl: string, serverName: string, useProxy = false) => {
    let fullUrl = ""

    if (serverUrl.includes("watch.vidora.su")) {
      // Special handling for Vidora TV URLs
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
    } else if (serverUrl.includes("apimocine.vercel.app")) {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
    } else if (serverUrl.includes("xprime.tv")) {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
    } else {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
    }

    // Use direct URL by default, proxy is optional
    setCurrentUrl(fullUrl)

    setSelectedServer(serverName)
    setShowDropdown(false)
  }

  const applyThemeToPlayer = (theme: Theme) => {
    if (iframeRef.current) {
      themeManager.applyThemeToVideoPlayer(iframeRef.current, theme)
    }
  }

  const getPingColor = (ping: number | null | undefined) => {
    if (ping === null || ping === undefined) return "text-red-400"
    if (ping < 200) return "text-green-400"
    if (ping < 500) return "text-orange-400"
    return "text-red-400"
  }

  const getPingText = (ping: number | null | undefined) => {
    if (ping === null || ping === undefined) return "Failed"
    return `${ping}ms`
  }

  return (
    <div className="h-screen w-screen">
      <div className="relative w-full h-full overflow-hidden">
        {currentUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-none"
              allowFullScreen
              sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
              allow="fullscreen; autoplay"
              style={{
                border: "none",
                borderRadius: "0px",
                boxShadow: "none",
                outline: "none",
              }}
            />
            {/* Expanded transparent overlays to prevent accidental back button clicks */}
            <div 
              className="absolute top-0 left-0 w-32 h-32 z-30 bg-transparent cursor-default" 
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
            <div 
              className="absolute w-28 h-28 z-30 bg-transparent cursor-default" 
              style={{ top: '5px', left: '5px', pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
            <div 
              className="absolute w-24 h-24 z-30 bg-transparent cursor-default" 
              style={{ top: '10px', left: '10px', pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
            <div 
              className="absolute w-20 h-20 z-30 bg-transparent cursor-default" 
              style={{ top: '15px', left: '15px', pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
            <div 
              className="absolute w-16 h-16 z-30 bg-transparent cursor-default" 
              style={{ top: '20px', left: '20px', pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Loading player...
          </div>
        )}

        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="w-12 h-12 p-0 bg-black/70 hover:bg-black/80 text-white border-gray-600 rounded-full flex items-center justify-center"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Cloud className="w-6 h-6" />
            </Button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-black/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl">
                <div className="p-2 space-y-1">
                  {/* Time display at the top */}
                  {isMounted && (
                    <div className="px-3 py-2 border-b border-gray-700 mb-2">
                      <div className="text-xs text-gray-400 mb-1">Server Time</div>
                      <ClientTime 
                        format="time" 
                        className="text-white text-sm font-medium"
                        showTimezone={false}
                        showCountry={true}
                      />
                    </div>
                  )}
                  
                  {servers.map((server, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-800 rounded transition-colors"
                      onClick={() => loadContent(server.url, server.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{server.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getPingColor(server.ping)}`}>{getPingText(server.ping)}</span>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <button
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors"
                      onClick={refreshPings}
                      disabled={isLoading}
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Proxy Status Message */}
        {proxyMessage && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-green-500 shadow-lg">
              <div className="text-sm font-medium">{proxyMessage}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
