'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_KEY = 'vrgeorgia_session';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function extractIds(path: string): { propertyId?: string; agentId?: string } {
  const propMatch = path.match(/^\/property\/([a-f0-9]{24})/);
  if (propMatch) return { propertyId: propMatch[1] };
  const agentMatch = path.match(/^\/agents\/([a-f0-9]{24})/);
  if (agentMatch) return { agentId: agentMatch[1] };
  return {};
}

async function collectDeviceInfo() {
  const info: Record<string, unknown> = {
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    platform: (navigator as any).userAgentData?.platform || navigator.platform || '',
    vendor: navigator.vendor || '',
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    deviceMemory: (navigator as any).deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
  };

  // ბატარეა
  try {
    if ('getBattery' in navigator) {
      const battery: any = await (navigator as any).getBattery();
      info.batteryLevel = Math.round(battery.level * 100);
      info.batteryCharging = battery.charging;
    }
  } catch { /* not supported */ }

  // ინტერნეტ კავშირი
  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      info.connectionType = conn.effectiveType || conn.type || '';
      info.connectionDownlink = conn.downlink || null;
    }
  } catch { /* not supported */ }

  return info;
}

export function usePageTracking() {
  const pathname = usePathname();
  const lastTracked = useRef('');
  const enterTime = useRef(Date.now());

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/analytics')) return;
    if (lastTracked.current === pathname) return;

    // გაუშვა duration წინა გვერდისთვის
    if (lastTracked.current) {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      if (duration > 0) {
        const body = JSON.stringify({
          sessionId: getSessionId(),
          path: lastTracked.current,
          duration
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE}/analytics/duration`, blob);
        } else {
          fetch(`${API_BASE}/analytics/duration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true
          }).catch(() => {});
        }
      }
    }

    lastTracked.current = pathname;
    enterTime.current = Date.now();

    const sessionId = getSessionId();
    const { propertyId, agentId } = extractIds(pathname);

    collectDeviceInfo().then(deviceInfo => {
      fetch(`${API_BASE}/analytics/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          propertyId,
          agentId,
          sessionId,
          referrer: document.referrer || '',
          ...deviceInfo
        })
      }).catch(() => {});
    });
  }, [pathname]);

  // გვერდის დატოვებისას duration-ის გაგზავნა
  useEffect(() => {
    const handleUnload = () => {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      if (duration > 0 && lastTracked.current) {
        const body = JSON.stringify({
          sessionId: getSessionId(),
          path: lastTracked.current,
          duration
        });
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE}/analytics/duration`, blob);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
}
