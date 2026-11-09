import { API_BASE } from '@/lib/config';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const SESSION_KEY = 'vrgeorgia_session';

let promptEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
let relatedInstalled = false;
let reported = false;
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function subscribeInstallState(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function getInstallPrompt() {
  return promptEvent;
}

export function consumeInstallPrompt() {
  const event = promptEvent;
  promptEvent = null;
  emit();
  return event;
}

export function isRunningAsApp() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOs;
}

export function isIosSafari() {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent || '';
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}

export function shouldOfferInstall() {
  if (typeof window === 'undefined') return false;
  if (installed || relatedInstalled || isRunningAsApp()) return false;
  return Boolean(promptEvent) || isIosDevice();
}

function sessionId() {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function loggedInUserId() {
  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) return '';
    const id = String((JSON.parse(raw) as { _id?: string })._id || '');
    return /^[a-f0-9]{24}$/i.test(id) ? id : '';
  } catch {
    return '';
  }
}

export function reportAppInstall() {
  if (typeof window === 'undefined' || reported) return;
  reported = true;
  const body = JSON.stringify({
    sessionId: sessionId(),
    userId: loggedInUserId(),
  });
  void fetch(`${API_BASE}/api/analytics/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

async function detectRelatedInstall() {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<{ platform?: string }[]>;
  };
  if (!nav.getInstalledRelatedApps) return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    if (apps.some((app) => app.platform === 'webapp')) {
      relatedInstalled = true;
      emit();
    }
  } catch {
    /* browser may refuse the call */
  }
}

if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    installed = true;
    emit();
    reportAppInstall();
  });
  void detectRelatedInstall();
}
