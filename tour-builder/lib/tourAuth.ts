export const TOUR_AUTH_STORAGE_KEY = 'vr-tour-auth';
export const TOUR_AUTH_READY = 'VRGEORGIA_TOUR_AUTH_READY';
export const TOUR_AUTH_MESSAGE = 'VRGEORGIA_TOUR_AUTH';

export function readTourAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(TOUR_AUTH_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function storeTourAuthToken(token: string) {
  if (!token || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TOUR_AUTH_STORAGE_KEY, token);
  } catch {
    /* private mode */
  }
}

/** რედაქტორის ფანჯარა მშობელ საიტს სთხოვს შესვლის ტოკენს. ტოკენი მისამართში არ იწერება. */
export function listenForTourAuth() {
  if (typeof window === 'undefined') return () => {};

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== TOUR_AUTH_MESSAGE || typeof data.token !== 'string') return;
    storeTourAuthToken(data.token.trim());
  };

  const ping = () => {
    const opener = window.opener as Window | null;
    if (!opener || opener.closed) return;
    opener.postMessage({ type: TOUR_AUTH_READY }, '*');
  };

  window.addEventListener('message', onMessage);
  ping();
  const timers = [200, 800, 2000].map((ms) => window.setTimeout(ping, ms));

  return () => {
    window.removeEventListener('message', onMessage);
    timers.forEach((id) => window.clearTimeout(id));
  };
}

export function waitForTourAuth(timeoutMs = 1800): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (readTourAuthToken()) return Promise.resolve();

  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (readTourAuthToken() || Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}
