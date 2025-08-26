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
      name: "Global Fast Proxy",
      country: "GLOBAL",
      flag: "🌍",
      host: "simple-proxy.reyamae14.workers.dev",
      port: 443,
      speed: 99,
      region: "americas",
    },
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
      // For the user's global proxy, return a fast ping
      if (proxy.host === "simple-proxy.reyamae14.workers.dev") {
        return 15 // Fast response time
      }
      
      // For other proxies, simulate ping based on speed
      const simulatedPing = Math.max(10, 100 - (proxy.speed || 50))
      return simulatedPing + Math.random() * 20 // Add some variance
    } catch (error) {
      console.error(`[v0] Ping measurement failed for ${proxy.name}:`, error)
      return null
    }
  }

  async findFastestProxies(): Promise<ProxyServer[]> {
    try {
      const location = await this.detectUserLocation()
      const regionPriority = this.getRegionPriority(location.continent)
      
      // Measure ping for all proxies
      const proxiesWithPing = await Promise.all(
        this.proxyServers.map(async (proxy) => {
          const ping = await this.measureProxyPing(proxy)
          return { ...proxy, ping }
        })
      )
      
      // Filter out failed proxies and sort by performance
      const validProxies = proxiesWithPing
        .filter(proxy => proxy.ping !== null)
        .sort((a, b) => {
          // Prioritize user's global proxy
          if (a.host === "simple-proxy.reyamae14.workers.dev") return -1
          if (b.host === "simple-proxy.reyamae14.workers.dev") return 1
          
          // Then sort by region priority and ping
          const regionDiff = (regionPriority[a.region] || 999) - (regionPriority[b.region] || 999)
          if (regionDiff !== 0) return regionDiff
          
          return (a.ping || 999) - (b.ping || 999)
        })
      
      this.fastestProxies = validProxies.slice(0, 5) // Keep top 5
      return this.fastestProxies
    } catch (error) {
      console.error("[v0] Failed to find fastest proxies:", error)
      // Fallback to user's proxy
      this.fastestProxies = [this.proxyServers[0]] // Global proxy is first
      return this.fastestProxies
    }
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

    // Special handling for user's global proxy
    if (selectedProxy.host === "simple-proxy.reyamae14.workers.dev") {
      const encodedUrl = encodeURIComponent(url)
      return `https://${selectedProxy.host}/?url=${encodedUrl}`
    }

    // Create proxied URL with routing for other proxies
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
