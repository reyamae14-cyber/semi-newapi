"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw, Cloud } from "lucide-react"
import { proxyManager } from "@/lib/proxy-manager"
import { ThemeSelector } from "@/components/theme-selector"
import { themeManager, type Theme } from "@/lib/theme-manager"

interface ServerOption {
  name: string
  url: string
  ping?: number | null
  proxied?: boolean
  proxyName?: string
}

export default function MoviePlayerPage() {
  const params = useParams()
  const movieId = params.id as string
  const [currentUrl, setCurrentUrl] = useState("")
  const [selectedServer, setSelectedServer] = useState("")
  const [servers, setServers] = useState<ServerOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [fastestProxies, setFastestProxies] = useState<any[]>([])
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentTheme())
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const movieServers: ServerOption[] = [
    { name: "Vidora", url: "https://watch.vidora.su/watch/movie/" },
    { name: "Xprime", url: "https://xprime.tv/watch/" },
    { name: "Hexa", url: "https://hexa.watch/watch/movie/" },
    { name: "VidSrc", url: "https://vidsrc.cc/v3/embed/movie/" },
    { name: "Primary", url: "https://apimocine.vercel.app/movie/" },
    { name: "VidJoy", url: "https://vidjoy.pro/embed/movie/" },
    { name: "Player VidSrc", url: "https://player.vidsrc.co/embed/movie/" },
    { name: "Vidify", url: "https://vidify.top/embed/movie/" },
  ]

  useEffect(() => {
    if (movieId) {
      initializeProxySystem()
    }
  }, [movieId])

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme)
      applyThemeToPlayer(theme)
    })
    return unsubscribe
  }, [])

  const initializeProxySystem = async () => {
    setIsLoading(true)

    try {
      await proxyManager.detectUserLocation()
      const proxies = await proxyManager.findFastestProxies()
      setFastestProxies(proxies)

      const vidoraServer = movieServers[0]
      await loadContent(vidoraServer.url, vidoraServer.name, true)

      await refreshPings()
    } catch (error) {
      console.error("[v0] Proxy initialization failed:", error)
      const vidoraServer = movieServers[0]
      loadContent(vidoraServer.url, vidoraServer.name, false)
      refreshPings()
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

    const testPromises = movieServers.map(async (server) => {
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

  const loadContent = async (serverUrl: string, serverName: string, useProxy = true) => {
    let fullUrl = ""
    if (serverUrl.includes("apimocine.vercel.app")) {
      fullUrl = `${serverUrl}${movieId}`
    } else if (serverUrl.includes("xprime.tv")) {
      fullUrl = `${serverUrl}${movieId}?autoplay=true`
    } else {
      fullUrl = `${serverUrl}${movieId}?autoplay=true`
    }

    if (useProxy) {
      try {
        fullUrl = await proxyManager.routeThroughProxy(fullUrl)
      } catch (error) {
        console.error("[v0] Proxy routing failed, using direct connection:", error)
      }
    }

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
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-none"
            allowFullScreen
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
            allow="fullscreen; autoplay"
            style={{
              border: `2px solid ${currentTheme.colors.primary}`,
              borderRadius: "8px",
              boxShadow: `0 0 20px ${currentTheme.colors.primary}33`,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading player...</div>
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
                {fastestProxies.length > 0 && (
                  <div className="p-3 border-b border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Active Proxies:</div>
                    <div className="flex gap-1 flex-wrap">
                      {fastestProxies.slice(0, 3).map((proxy, idx) => (
                        <span key={idx} className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                          {proxy.flag} {proxy.name} ({proxy.ping}ms)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2 space-y-1">
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
                        {server.proxyName && <span className="text-xs text-green-400">{server.proxyName}</span>}
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

        {(selectedServer === "Vidora" || selectedServer === "Hexa") && (
          <div className="absolute top-6 right-6 z-10">
            <ThemeSelector onThemeChange={setCurrentTheme} />
          </div>
        )}
      </div>
    </div>
  )
}
