'use client';

import { useState, useEffect } from 'react';
import { timeSyncService, type TimeZoneInfo } from '@/lib/time-sync';

interface ClientTimeProps {
  format?: 'full' | 'time' | 'date' | 'iso';
  className?: string;
  showTimezone?: boolean;
  showCountry?: boolean;
}

export function ClientTime({ 
  format = 'full', 
  className = '', 
  showTimezone = false, 
  showCountry = false 
}: ClientTimeProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeZoneInfo, setTimeZoneInfo] = useState<TimeZoneInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const initializeTimeSync = async () => {
      try {
        await timeSyncService.initialize();
        setTimeZoneInfo(timeSyncService.getTimeZoneInfo());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize time sync:', error);
        setIsInitialized(true); // Still set to true to show fallback time
      }
    };

    initializeTimeSync();
  }, [isMounted]);

  useEffect(() => {
    if (!isInitialized || !isMounted) return;

    const updateTime = () => {
      setCurrentTime(timeSyncService.formatTime(format));
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [format, isInitialized, isMounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted || !isInitialized) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-300 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col space-y-1">
        <span className="font-mono text-sm">
          {currentTime || 'Loading...'}
        </span>
        
        {showTimezone && timeZoneInfo && (
          <span className="text-xs text-gray-500">
            {timeZoneInfo.timezone}
          </span>
        )}
        
        {showCountry && timeZoneInfo && (
          <span className="text-xs text-gray-400">
            {timeZoneInfo.country} ({timeZoneInfo.ip})
          </span>
        )}
      </div>
    </div>
  );
}

// Hook for accessing time sync service in other components
export function useTimeSync() {
  const [timeZoneInfo, setTimeZoneInfo] = useState<TimeZoneInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeTimeSync = async () => {
      try {
        await timeSyncService.initialize();
        setTimeZoneInfo(timeSyncService.getTimeZoneInfo());
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize time sync:', error);
        setIsInitialized(true);
      }
    };

    initializeTimeSync();
  }, []);

  return {
    timeZoneInfo,
    isInitialized,
    getCurrentTime: () => timeSyncService.getCurrentTime(),
    formatTime: (format?: 'full' | 'time' | 'date' | 'iso') => timeSyncService.formatTime(format),
    isTimeSync: () => timeSyncService.isTimeSync()
  };
}