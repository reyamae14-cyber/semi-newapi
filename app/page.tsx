"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Play, Tv, Film, RefreshCw, Search, Star, Calendar, Clock, Globe, Cloud } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeSelector } from "@/components/theme-selector"
import { VidoraPlayer } from "@/components/vidora-player"

interface ServerOption {
  name: string
  url: string
  ping?: number | null
}

interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string
  release_date: string
  vote_average: number
  runtime: number
  genres: { id: number; name: string }[]
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

export default function MovieTVTester() {
  const [movieId, setMovieId] = useState("900") // Set default movie ID to 900
  const [tvId, setTvId] = useState("900") // Set default TV ID to 900
  const [season, setSeason] = useState("1")
  const [episode, setEpisode] = useState("1")
  const [currentUrl, setCurrentUrl] = useState("")
  const [contentType, setContentType] = useState<"movie" | "tv">("movie")
  const [isLoading, setIsLoading] = useState(false)
  const [servers, setServers] = useState<ServerOption[]>([])
  const [movieData, setMovieData] = useState<TMDBMovie | null>(null)
  const [tvData, setTVData] = useState<TMDBTVShow | null>(null)
  const [isLoadingTMDB, setIsLoadingTMDB] = useState(false)
  const TMDB_API_KEY = "39e5d4874c102b0a9b61639c81b9bda1"
  const router = useRouter()
  const [proxyEnabled, setProxyEnabled] = useState(true)

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

  const measurePing = async (url: string): Promise<number | null> => {
    try {
      const domain = new URL(url).origin
      const start = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

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
    const currentServers = contentType === "movie" ? movieServers : tvServers
    const updatedServers = await Promise.all(
      currentServers.map(async (server) => ({
        ...server,
        ping: await measurePing(server.url),
      })),
    )
    setServers(updatedServers)
    setIsLoading(false)
  }

  const loadContent = (serverUrl: string) => {
    let fullUrl = ""

    if (contentType === "movie") {
      if (serverUrl.includes("apimocine.vercel.app")) {
        fullUrl = `${serverUrl}${movieId}`
      } else if (serverUrl.includes("xprime.tv")) {
        fullUrl = `${serverUrl}${movieId}?autoplay=true`
      } else {
        fullUrl = `${serverUrl}${movieId}?autoplay=true`
      }
      router.push(`/movie/${movieId}`)
      return
    } else {
      if (serverUrl.includes("apimocine.vercel.app")) {
        fullUrl = `${serverUrl}${tvId}/${season}/${episode}`
      } else if (serverUrl.includes("xprime.tv")) {
        fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
      } else {
        fullUrl = `${serverUrl}${tvId}/${season}/${episode}?autoplay=true`
      }
      router.push(`/tv/${tvId}/${season}/${episode}`)
      return
    }
  }

  const fetchMovieData = async (id: string) => {
    if (!id) return
    setIsLoadingTMDB(true)
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
      if (response.ok) {
        const data = await response.json()
        setMovieData(data)
      } else {
        setMovieData(null)
      }
    } catch (error) {
      console.error("Error fetching movie data:", error)
      setMovieData(null)
    }
    setIsLoadingTMDB(false)
  }

  const fetchTVData = async (id: string) => {
    if (!id) return
    setIsLoadingTMDB(true)
    try {
      const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
      if (response.ok) {
        const data = await response.json()
        setTVData(data)
      } else {
        setTVData(null)
      }
    } catch (error) {
      console.error("Error fetching TV data:", error)
      setTVData(null)
    }
    setIsLoadingTMDB(false)
  }

  const handleTabChange = (value: string) => {
    setContentType(value as "movie" | "tv")
    setCurrentUrl("")
    setServers([])
    setMovieData(null)
    setTVData(null)
  }

  const getPingColor = (ping: number | null | undefined) => {
    if (ping === null || ping === undefined) return "destructive"
    if (ping < 200) return "default"
    if (ping < 600) return "secondary"
    return "destructive"
  }

  const getPingText = (ping: number | null | undefined) => {
    if (ping === null || ping === undefined) return "Failed"
    return `${ping}ms`
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-4xl font-bold text-balance">Movie & TV Show Tester</h1>
            <p className="text-muted-foreground text-pretty">
              Test streaming content using TMDB IDs with Vidora player integration
            </p>
          </div>
          <ThemeSelector />
        </div>

        {/* Vidora Player Demo Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Vidora Player Demo (Netflix Theme Default)
            </CardTitle>
            <CardDescription>
              Experience the Vidora player with dynamic theme integration. The player color automatically matches your selected theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <VidoraPlayer 
               movieId="299534" 
               autoplay={false}
               pausescreen={true}
               className="h-96"
             />
             <div className="mt-4 space-y-2">
               <p className="text-sm text-muted-foreground">
                 <strong>Demo:</strong> Avengers Endgame (TMDB ID: 299534) - Try changing themes to see the player color adapt!
               </p>
               <div className="flex flex-wrap gap-2">
                 <Badge variant="outline">✅ Border Removed</Badge>
                 <Badge variant="outline">✅ Netflix Default Theme</Badge>
                 <Badge variant="outline">✅ Dynamic Color Integration</Badge>
                 <Badge variant="outline">✅ Vidora API Connected</Badge>
               </div>
             </div>
           </CardContent>
        </Card>

        <Tabs value={contentType} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="movie" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Movies
            </TabsTrigger>
            <TabsTrigger value="tv" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              TV Shows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movie" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="w-5 h-5" />
                  Movie Tester
                </CardTitle>
                <CardDescription>
                  Enter a TMDB movie ID to test streaming (e.g., 900 for "The Godfather")
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="movieId">TMDB Movie ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="movieId"
                      value={movieId}
                      onChange={(e) => setMovieId(e.target.value)}
                      placeholder="Enter movie ID (e.g., 900)"
                    />
                    <Button variant="outline" onClick={() => fetchMovieData(movieId)} disabled={isLoadingTMDB}>
                      {isLoadingTMDB ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant={proxyEnabled ? "default" : "outline"}
                      onClick={() => setProxyEnabled(!proxyEnabled)}
                      className="flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Proxy {proxyEnabled ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
                {movieData && (
                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    {movieData.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${movieData.poster_path}`}
                        alt={movieData.title}
                        className="w-20 h-30 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{movieData.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {movieData.vote_average.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(movieData.release_date).getFullYear()}
                        </div>
                        {movieData.runtime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {movieData.runtime}min
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{movieData.overview}</p>
                      <div className="flex gap-1 flex-wrap">
                        {movieData.genres?.slice(0, 3).map((genre) => (
                          <Badge key={genre.id} variant="secondary" className="text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={refreshPings} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Test Servers
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tv" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="w-5 h-5" />
                  TV Show Tester
                </CardTitle>
                <CardDescription>Enter TMDB TV show ID, season, and episode (e.g., 123/1/1)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tvId">TMDB TV ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tvId"
                        value={tvId}
                        onChange={(e) => setTvId(e.target.value)}
                        placeholder="TV show ID"
                      />
                      <Button variant="outline" onClick={() => fetchTVData(tvId)} disabled={isLoadingTMDB}>
                        {isLoadingTMDB ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant={proxyEnabled ? "default" : "outline"}
                        onClick={() => setProxyEnabled(!proxyEnabled)}
                        className="flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Proxy {proxyEnabled ? "ON" : "OFF"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season">Season</Label>
                    <Input
                      id="season"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      placeholder="Season number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episode">Episode</Label>
                    <Input
                      id="episode"
                      value={episode}
                      onChange={(e) => setEpisode(e.target.value)}
                      placeholder="Episode number"
                    />
                  </div>
                </div>
                {tvData && (
                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    {tvData.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${tvData.poster_path}`}
                        alt={tvData.name}
                        className="w-20 h-30 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{tvData.name}</h3>
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
                      <p className="text-sm text-muted-foreground line-clamp-2">{tvData.overview}</p>
                      <div className="flex gap-1 flex-wrap">
                        {tvData.genres?.slice(0, 3).map((genre) => (
                          <Badge key={genre.id} variant="secondary" className="text-xs">
                            {genre.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={refreshPings} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Test Servers
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {servers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Server Options
              </CardTitle>
              <CardDescription>
                Click on a server to open the dedicated player page with all streaming options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {servers.map((server, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 justify-between bg-transparent"
                    onClick={() => loadContent(server.url)}
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      {server.name}
                    </div>
                    <Badge variant={getPingColor(server.ping)}>{getPingText(server.ping)}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
