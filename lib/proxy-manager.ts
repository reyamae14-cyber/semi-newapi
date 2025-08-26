interface ProxyServer {
  name: string
  country: string
  flag: string
  host: string
  port: number
  ping?: number | null
  speed?: number
  region: "asia" | "europe" | "americas"
}

interface UserLocation {
  country: string
  continent: string
  timezone: string
}

export class ProxyManager {
  private static instance: ProxyManager
  private proxyServers: ProxyServer[] = [
    {
      name: "Hong Kong",
      country: "HK",
      flag: "🇭🇰",
      host: "proxy-hk.server.com",
      port: 8080,
      speed: 98,
      region: "asia",
    },
    { name: "Japan", country: "JP", flag: "🇯🇵", host: "proxy-jp.server.com", port: 8080, speed: 74, region: "asia" },
    { name: "Korea", country: "KR", flag: "🇰🇷", host: "proxy-kr.server.com", port: 8080, speed: 75, region: "asia" },
    {
      name: "United States",
      country: "US",
      flag: "🇺🇸",
      host: "proxy-us.server.com",
      port: 8080,
      speed: 64,
      region: "americas",
    },
    {
      name: "United Kingdom",
      country: "GB",
      flag: "🇬🇧",
      host: "proxy-uk.server.com",
      port: 8080,
      speed: 60,
      region: "europe",
    },
    {
      name: "Germany",
      country: "DE",
      flag: "🇩🇪",
      host: "proxy-de.server.com",
      port: 8080,
      speed: 64,
      region: "europe",
    },
    {
      name: "Brazil",
      country: "BR",
      flag: "🇧🇷",
      host: "proxy-br.server.com",
      port: 8080,
      speed: 95,
      region: "americas",
    },
    // Auto-generated proxies
    {
      name: "Singapore",
      country: "SG",
      flag: "🇸🇬",
      host: "proxy-sg.server.com",
      port: 8080,
      speed: 89,
      region: "asia",
    },
    {
      name: "Netherlands",
      country: "NL",
      flag: "🇳🇱",
      host: "proxy-nl.server.com",
      port: 8080,
      speed: 72,
      region: "europe",
    },
    {
      name: "Canada",
      country: "CA",
      flag: "🇨🇦",
      host: "proxy-ca.server.com",
      port: 8080,
      speed: 68,
      region: "americas",
    },
    {
      name: "Australia",
      country: "AU",
      flag: "🇦🇺",
      host: "proxy-au.server.com",
      port: 8080,
      speed: 71,
      region: "asia",
    },
    { name: "France", country: "FR", flag: "🇫🇷", host: "proxy-fr.server.com", port: 8080, speed: 66, region: "europe" },
  ]

  private userLocation: UserLocation | null = null
  private fastestProxies: ProxyServer[] = []

  static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager()
    }
    return ProxyManager.instance
  }

  async detectUserLocation(): Promise<UserLocation> {
    if (this.userLocation) return this.userLocation

    try {
      // Try multiple geolocation services for reliability
      const services = ["https://ipapi.co/json/", "https://api.ipify.org?format=json", "https://httpbin.org/ip"]

      for (const service of services) {
        try {
          const response = await fetch(service, {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(2000),
          })

          if (response.ok) {
            const data = await response.json()
            this.userLocation = {
              country: data.country_code || data.country || "US",
              continent: data.continent_code || "NA",
              timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
            break
          }
        } catch (e) {
          continue
        }
      }

      // Fallback to browser timezone detection
      if (!this.userLocation) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const region = timezone.split("/")[0]
        this.userLocation = {
          country: "US",
          continent: region === "Asia" ? "AS" : region === "Europe" ? "EU" : "NA",
          timezone,
        }
      }

      return this.userLocation
    } catch (error) {
      console.error("[v0] Location detection failed:", error)
      return { country: "US", continent: "NA", timezone: "America/New_York" }
    }
  }

  async measureProxyPing(proxy: ProxyServer): Promise<number | null> {
    try {
      const testUrl = `https://${proxy.host}:${proxy.port}`
      const start = performance.now()

      // Use multiple parallel requests for more accurate measurement
      const promises = Array(3)
        .fill(0)
        .map(async () => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 1500) // Faster 1.5s timeout

          try {
            await fetch(testUrl, {
              method: "HEAD",
              mode: "no-cors",
              cache: "no-store",
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
            return performance.now() - start
          } catch (e) {
            clearTimeout(timeoutId)
            throw e
          }
        })

      const results = await Promise.allSettled(promises)
      const successful = results
        .filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled")
        .map((result) => result.value)

      if (successful.length === 0) return null

      // Return average of successful pings
      return Math.round(successful.reduce((a, b) => a + b, 0) / successful.length)
    } catch (error) {
      return null
    }
  }

  async findFastestProxies(): Promise<ProxyServer[]> {
    const location = await this.detectUserLocation()

    // Prioritize proxies by region proximity
    const regionPriority = this.getRegionPriority(location.continent)
    const sortedProxies = [...this.proxyServers].sort((a, b) => {
      const aPriority = regionPriority[a.region] || 999
      const bPriority = regionPriority[b.region] || 999
      return aPriority - bPriority
    })

    // Test top 8 proxies in parallel for speed
    const topProxies = sortedProxies.slice(0, 8)
    const pingPromises = topProxies.map(async (proxy) => ({
      ...proxy,
      ping: await this.measureProxyPing(proxy),
    }))

    const results = await Promise.all(pingPromises)

    // Filter working proxies and sort by ping + speed score
    this.fastestProxies = results
      .filter((proxy) => proxy.ping !== null)
      .sort((a, b) => {
        const aScore = (a.ping || 999) - (a.speed || 0) * 0.1
        const bScore = (b.ping || 999) - (b.speed || 0) * 0.1
        return aScore - bScore
      })
      .slice(0, 5) // Keep top 5 fastest

    return this.fastestProxies
  }

  private getRegionPriority(continent: string): Record<string, number> {
    switch (continent) {
      case "AS": // Asia
        return { asia: 1, europe: 2, americas: 3 }
      case "EU": // Europe
        return { europe: 1, americas: 2, asia: 3 }
      case "NA": // North America
      case "SA": // South America
        return { americas: 1, europe: 2, asia: 3 }
      default:
        return { americas: 1, europe: 2, asia: 3 }
    }
  }

  async getOptimalProxy(): Promise<ProxyServer | null> {
    if (this.fastestProxies.length === 0) {
      await this.findFastestProxies()
    }
    return this.fastestProxies[0] || null
  }

  async routeThroughProxy(url: string, proxy?: ProxyServer): Promise<string> {
    const selectedProxy = proxy || (await this.getOptimalProxy())

    if (!selectedProxy) {
      return url // Fallback to direct connection
    }

    // Create proxied URL with routing
    const proxyUrl = `https://${selectedProxy.host}:${selectedProxy.port}/proxy`
    const encodedUrl = encodeURIComponent(url)

    return `${proxyUrl}?url=${encodedUrl}&region=${selectedProxy.region}&country=${selectedProxy.country}`
  }

  getFastestProxies(): ProxyServer[] {
    return this.fastestProxies
  }

  async refreshProxyStatus(): Promise<void> {
    await this.findFastestProxies()
  }
}

export const proxyManager = ProxyManager.getInstance()
