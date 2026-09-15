'use client';

import React from 'react';
import type { User } from '@/lib/types';
import { getMe, refreshSession } from '@/lib/api';

/** ტოკენის განახლების ინტერვალი — ვადაზე ბევრად ხშირი, რომ სესია არ იწურებოდეს */
const SESSION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** ბოლო განახლების დროშტამპი — ზედმეტ მოთხოვნებს ვიცილებთ ტაბებს შორის */
const LAST_REFRESH_KEY = 'vr-session-refreshed-at';
/** ბოლო სესია ვადის გასვლით დასრულდა — შესვლის გვერდი ამის მიხედვით ხსნის მიზეზს */
export const SESSION_EXPIRED_KEY = 'vr-session-expired';

type AuthState = {
  user: User | null;
  token: string | null;
  /** true after getMe finishes (or when there is no token) — server-verified profile */
  profileLoaded: boolean;
  /** true after localStorage session was applied (before paint via useLayoutEffect) */
  authBootstrapped: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}

function readStoredSession(): { token: string | null; user: User | null } {
  try {
    const token = window.localStorage.getItem('token');
    const raw = window.localStorage.getItem('user');
    if (!raw) return { token, user: null };
    try {
      return { token, user: JSON.parse(raw) as User };
    } catch {
      window.localStorage.removeItem('user');
      return { token, user: null };
    }
  } catch {
    return { token: null, user: null };
  }
}

/** Keep <html data-vr-auth> in sync for first-paint CSS (set early by layout inline script too). */
function syncAuthDomAttrs(token: string | null, user: User | null) {
  try {
    const d = document.documentElement;
    if (token) {
      d.setAttribute('data-vr-auth', '1');
      const role = String(user?.role || '').trim();
      if (role) d.setAttribute('data-vr-role', role);
      else d.removeAttribute('data-vr-role');
    } else {
      d.removeAttribute('data-vr-auth');
      d.removeAttribute('data-vr-role');
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [authBootstrapped, setAuthBootstrapped] = React.useState(false);

  // Restore session BEFORE first paint — useEffect would flash the guest header.
  React.useLayoutEffect(() => {
    const { token: t, user: u } = readStoredSession();
    if (t) setToken(t);
    if (u) setUser(u);
    syncAuthDomAttrs(t, u);
    setAuthBootstrapped(true);
  }, []);

  React.useEffect(() => {
    if (!authBootstrapped) return;

    let cancelled = false;
    const t = token || window.localStorage.getItem('token');
    if (t) {
      getMe()
        .then((res) => {
          if (cancelled || !res?.user) return;
          setUser(res.user as User);
          window.localStorage.setItem('user', JSON.stringify(res.user));
          syncAuthDomAttrs(t, res.user as User);
        })
        .catch(() => {
          // 401-ს api.ts ამუშავებს (logout event)
        })
        .finally(() => {
          if (!cancelled) setProfileLoaded(true);
        });
    } else {
      setProfileLoaded(true);
    }

    return () => {
      cancelled = true;
    };
  }, [authBootstrapped, token]);

  const setAuth = React.useCallback((t: string, u: User) => {
    setToken(t);
    setUser(u);
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify(u));
    window.localStorage.removeItem(SESSION_EXPIRED_KEY);
    window.localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
    syncAuthDomAttrs(t, u);
    setAuthBootstrapped(true);
    setProfileLoaded(true);
  }, []);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem(LAST_REFRESH_KEY);
    syncAuthDomAttrs(null, null);
  }, []);

  React.useEffect(() => {
    const onUnauthorized = () => {
      // ატვირთვის დრაფტს არ ვშლით — აგენტმა შესვლის შემდეგ იმავე ადგილიდან უნდა გააგრძელოს
      window.localStorage.setItem(SESSION_EXPIRED_KEY, '1');
      logout();
    };
    window.addEventListener('vr-auth-unauthorized', onUnauthorized);
    return () => window.removeEventListener('vr-auth-unauthorized', onUnauthorized);
  }, [logout]);

  /**
   * Sliding session. ტოკენს refresh მექანიზმი არ ჰქონდა, ამიტომ ვადის გასვლის
   * მომენტში აგენტი სამუშაოს შუაში გადიოდა სისტემიდან. ახლა ვანახლებთ გვერდის
   * ჩატვირთვაზე, პერიოდულად და ტაბზე დაბრუნებისას.
   */
  React.useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const runRefresh = async (force = false) => {
      if (cancelled) return;
      if (!window.localStorage.getItem('token')) return;
      if (!force) {
        const last = Number(window.localStorage.getItem(LAST_REFRESH_KEY) || 0);
        if (last && Date.now() - last < SESSION_REFRESH_INTERVAL_MS) return;
      }
      try {
        const res = await refreshSession();
        if (cancelled || !res?.token) return;
        setToken(res.token);
        window.localStorage.setItem('token', res.token);
        window.localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
        if (res.user) {
          setUser(res.user);
          window.localStorage.setItem('user', JSON.stringify(res.user));
          syncAuthDomAttrs(res.token, res.user);
        }
      } catch {
        // 401-ს api.ts ამუშავებს; ქსელის შეცდომაზე უბრალოდ მოგვიანებით ვცდით
      }
    };

    void runRefresh(true);

    const interval = window.setInterval(() => void runRefresh(), SESSION_REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // token-ის ცვლილებაზე თავიდან არ უნდა გაეშვას — მხოლოდ სესიის დაწყება/დასრულებაზე
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(token)]);

  return (
    <AuthContext.Provider
      value={{ user, token, profileLoaded, authBootstrapped, setAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
