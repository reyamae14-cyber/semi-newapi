"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Star, Calendar, Tv, Cloud } from "lucide-react"
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
  const params = useParams()
  const router = useRouter()
  const tvId = params.id as string
  const season = params.season as string
  const episode = params.episode as string
  const [currentUrl, setCurrentUrl] = useState("")
  const [selectedServer, setSelectedServer] = useState("")
  const [servers, setServers] = useState<ServerOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [tvData, setTVData] = useState<TMDBTVShow | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [fastestProxies, setFastestProxies] = useState<any[]>([])
  const TMDB_API_KEY = "39e5d4874c102b0a9b61639c81b9bda1"
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentTheme())
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const tvServers: ServerOption[] = [
    { name: "Vidora", url: "https://watch.vidora.su/watch/tv/" },
    { name: "Xprime", url: "https://xprime.tv/watch/" },
    { name: "Hexa", url: "https://hexa.watch/watch/tv/" },
    { name: "VidSrc", url: "https://vidsrc.cc/v3/embed/tv/" },
    { name: "Primary", url: "https://apimocine.vercel.app/tv/" },
    { name: "VidJoy", url: "https://vidjoy.pro/embed/tv/" },
    { name: "Player VidSrc", url: "https://player.vidsrc.co/embed/tv/" },
    { name: "Vidify", url: "https://vidify.top/embed/tv/" },
  ]

  useEffect(() => {
    if (tvId) {
      fetchTVData(tvId)
      initializeProxySystem()
    }
  }, [tvId, season, episode])

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

      const vidoraServer = tvServers[0]
      await loadContent(vidoraServer.url, vidoraServer.name, true)
      await refreshPings()
    } catch (error) {
      console.error("[v0] Proxy initialization failed:", error)
      const vidoraServer = tvServers[0]
      loadContent(vidoraServer.url, vidoraServer.name, false)
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

  const loadContent = async (serverUrl: string, serverName: string, useProxy = true) => {
    let fullUrl = ""
    if (serverUrl.includes("apimocine.vercel.app")) {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}`
    } else if (serverUrl.includes("xprime.tv")) {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
    } else {
      fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">TV Show Player</h1>
            <p className="text-muted-foreground">
              TMDB ID: {tvId} • Season {season} • Episode {episode}
            </p>
          </div>
        </div>

        {tvData && (
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {tvData.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${tvData.poster_path}`}
                    alt={tvData.name}
                    className="w-24 h-36 object-cover rounded"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold">{tvData.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {tvData.vote_average.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(tvData.first_air_date).getFullYear()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tv className="w-4 h-4" />
                      {tvData.number_of_seasons} seasons
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{tvData.overview}</p>
                  <div className="flex gap-1 flex-wrap">
                    {tvData.genres?.slice(0, 4).map((genre) => (
                      <Badge key={genre.id} variant="secondary" className="text-xs">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Video Player</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Server: {selectedServer}</span>
                {fastestProxies.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {fastestProxies[0]?.flag} {fastestProxies[0]?.name}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={refreshPings} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
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
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Loading player...
                </div>
              )}

              <div className="absolute top-4 left-4 z-10">
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-10 h-10 p-0 bg-black/70 hover:bg-black/80 text-white border-gray-600 rounded-full flex items-center justify-center"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <Cloud className="w-5 h-5" />
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
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Refresh Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(selectedServer === "Vidora" || selectedServer === "Hexa") && (
                <div className="absolute top-4 right-4 z-10">
                  <ThemeSelector onThemeChange={setCurrentTheme} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {servers.map((server, index) => (
                <Button
                  key={index}
                  variant={selectedServer === server.name ? "default" : "outline"}
                  size="sm"
                  className="h-auto p-3 flex-col gap-1"
                  onClick={() => loadContent(server.url, server.name)}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium">{server.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {server.proxyName && <span className="text-xs text-green-400">{server.proxyName}</span>}
                    <Badge
                      variant={
                        getPingColor(server.ping) === "text-green-400"
                          ? "default"
                          : getPingColor(server.ping) === "text-orange-400"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {getPingText(server.ping)}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
