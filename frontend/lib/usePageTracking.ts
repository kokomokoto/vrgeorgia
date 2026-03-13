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
  // /property/6abc123def → propertyId
  const propMatch = path.match(/^\/property\/([a-f0-9]{24})/);
  if (propMatch) return { propertyId: propMatch[1] };
  
  // /agents/6abc123def → agentId
  const agentMatch = path.match(/^\/agents\/([a-f0-9]{24})/);
  if (agentMatch) return { agentId: agentMatch[1] };
  
  return {};
}

export function usePageTracking() {
  const pathname = usePathname();
  const lastTracked = useRef('');

  useEffect(() => {
    // არ ავტრეკოთ admin გვერდები
    if (pathname.startsWith('/admin')) return;
    
    // არ გავიმეოროთ იგივე გვერდი
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const sessionId = getSessionId();
    const { propertyId, agentId } = extractIds(pathname);

    // Fire and forget — არ ველოდებით პასუხს
    fetch(`${API_BASE}/analytics/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        propertyId,
        agentId,
        sessionId,
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      })
    }).catch(() => {
      // ანალიტიკის შეცდომა არ არის კრიტიკული
    });
  }, [pathname]);
}
