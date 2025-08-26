interface TimeZoneInfo {
  timezone: string;
  country: string;
  ip: string;
  utcOffset: number;
}

interface GoogleTimeResponse {
  dateTime: string;
  timeZoneId: string;
  timeZoneName: string;
}

interface IPLocationResponse {
  ip: string;
  country_code: string;
  country_name: string;
  timezone: string;
  utc_offset: number;
}

class TimeSyncService {
  private static instance: TimeSyncService;
  private timeZoneInfo: TimeZoneInfo | null = null;
  private syncedTime: Date | null = null;
  private lastSyncTime: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): TimeSyncService {
    if (!TimeSyncService.instance) {
      TimeSyncService.instance = new TimeSyncService();
    }
    return TimeSyncService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.detectUserLocation();
      await this.syncTimeWithGoogle();
      this.startPeriodicSync();
    } catch (error) {
      console.error('Failed to initialize time sync service:', error);
      // Fallback to local time
      this.syncedTime = new Date();
    }
  }

  private async detectUserLocation(): Promise<void> {
    try {
      // Try multiple IP detection services for reliability
      const services = [
        'https://ipapi.co/json/',
        'https://api.ipgeolocation.io/ipgeo?apiKey=free',
        'https://ipinfo.io/json'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            
            // Normalize response format
            this.timeZoneInfo = {
              ip: data.ip || data.query,
              country: data.country_name || data.country,
              timezone: data.timezone || data.time_zone?.name || Intl.DateTimeFormat().resolvedOptions().timeZone,
              utcOffset: data.utc_offset || this.getTimezoneOffset(data.timezone)
            };
            break;
          }
        } catch (serviceError) {
          console.warn(`Failed to get location from ${service}:`, serviceError);
          continue;
        }
      }

      // Fallback to browser timezone if all services fail
      if (!this.timeZoneInfo) {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.timeZoneInfo = {
          ip: 'unknown',
          country: 'unknown',
          timezone: browserTimezone,
          utcOffset: new Date().getTimezoneOffset() * -1
        };
      }
    } catch (error) {
      console.error('Error detecting user location:', error);
    }
  }

  private getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      return (targetTime.getTime() - utc.getTime()) / (1000 * 60);
    } catch {
      return new Date().getTimezoneOffset() * -1;
    }
  }

  private async syncTimeWithGoogle(): Promise<void> {
    try {
      if (!this.timeZoneInfo) {
        throw new Error('Timezone info not available');
      }

      // Use Google's time API with the detected timezone
      const timeApiUrl = `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(this.timeZoneInfo.timezone)}`;
      
      const response = await fetch(timeApiUrl);
      if (response.ok) {
        const timeData = await response.json();
        this.syncedTime = new Date(timeData.dateTime);
      } else {
        // Fallback to world time API
        const fallbackUrl = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(this.timeZoneInfo.timezone)}`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          this.syncedTime = new Date(fallbackData.datetime);
        } else {
          throw new Error('All time APIs failed');
        }
      }

      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Failed to sync time with Google:', error);
      // Fallback to local time
      this.syncedTime = new Date();
    }
  }

  private startPeriodicSync(): void {
    setInterval(async () => {
      await this.syncTimeWithGoogle();
    }, this.syncInterval);
  }

  getCurrentTime(): Date {
    if (!this.syncedTime) {
      return new Date();
    }

    // Calculate current time based on last sync
    const timeSinceSync = Date.now() - this.lastSyncTime;
    return new Date(this.syncedTime.getTime() + timeSinceSync);
  }

  getTimeZoneInfo(): TimeZoneInfo | null {
    return this.timeZoneInfo;
  }

  formatTime(format: 'full' | 'time' | 'date' | 'iso' = 'full'): string {
    const currentTime = this.getCurrentTime();
    const timezone = this.timeZoneInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    switch (format) {
      case 'time':
        return currentTime.toLocaleTimeString('en-US', { timeZone: timezone });
      case 'date':
        return currentTime.toLocaleDateString('en-US', { timeZone: timezone });
      case 'iso':
        return currentTime.toISOString();
      case 'full':
      default:
        return currentTime.toLocaleString('en-US', { 
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
    }
  }

  isTimeSync(): boolean {
    return this.syncedTime !== null && (Date.now() - this.lastSyncTime) < this.syncInterval;
  }
}

export const timeSyncService = TimeSyncService.getInstance();
export type { TimeZoneInfo };