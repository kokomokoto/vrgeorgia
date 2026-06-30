'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { isAdminRole, isAgentRole } from '@/lib/userRoles';

export function Header() {
  const { t } = useTranslation();
  const { user, logout, profileLoaded } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Logo-ზე კლიკით გვერდის სრული გადატვირთვა (ფილტრების reset-ისთვის)
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/';
  };

  // თარგმანები მხოლოდ client-ზე რომ hydration error არ იყოს
  const appName = mounted ? t('appName') : 'VR Georgia';
  const uploadText = mounted ? t('upload') : 'განცხადების დამატება';
  const loginText = mounted ? t('login') : 'შესვლა';
  const registerText = mounted ? t('register') : 'რეგისტრაცია';
  const logoutText = mounted ? t('logout') : 'გამოსვლა';
  const profileText = mounted ? t('profile') : 'პროფილი';
  const favoritesText = mounted ? t('favorites') : 'ფავორიტები';
  const compareText = mounted ? t('compare') : 'შედარება';
  const agentsText = mounted ? t('agents') : 'აგენტები';
  const servicesNavText = mounted ? t('services_nav') : 'მომსახურება';
  const messagesText = mounted ? t('messages') : 'შეტყობინებები';
  const adminText = mounted ? t('admin_panel') : 'ადმინ პანელი';
  const isAdmin = profileLoaded && isAdminRole(user?.role);
  const isAgent = profileLoaded && isAgentRole(user?.role);
  const uploadLinkClass =
    isAgent || isAdmin
      ? 'text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
      : 'text-sm text-slate-800 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-amber-400';

  return (
    <header
      data-site-header
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/" onClick={handleLogoClick} className="text-base font-semibold text-yellow-500 cursor-pointer dark:text-amber-400 dark:hover:text-amber-300">
            {appName}
          </a>
        </div>

        <nav className="hidden items-center gap-4 md:flex">
          <Link
            href="/services"
            className="text-sm flex items-center gap-1 text-slate-700 hover:text-amber-700 dark:text-zinc-200 dark:hover:text-amber-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {servicesNavText}
          </Link>
          <Link href="/agents" className="text-sm flex items-center gap-1 text-slate-700 hover:text-slate-900 dark:text-zinc-200 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {agentsText}
          </Link>
          <Link href="/upload" className={uploadLinkClass}>
            {uploadText}
          </Link>
          <Link href="/favorites" className="text-sm flex items-center gap-1 text-slate-700 hover:text-red-500 dark:text-zinc-200 dark:hover:text-red-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {favoritesText}
          </Link>
          <Link href="/compare" className="text-sm flex items-center gap-1 text-slate-700 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {compareText}
          </Link>
          {!user ? (
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-amber-400 dark:hover:text-amber-300">
              {loginText}
            </Link>
          ) : (
            <>
              <Link href="/messages" className="text-sm flex items-center gap-1 text-slate-700 hover:text-green-600 dark:text-zinc-200 dark:hover:text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {messagesText}
              </Link>
              <Link href="/profile" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-amber-400 dark:hover:text-amber-300">
                {profileText}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-sm font-semibold flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {adminText}
                </Link>
              )}
            </>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
            <Link href="/services" onClick={() => setOpen(false)} className="text-sm flex items-center gap-2 text-slate-800 dark:text-zinc-100">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {servicesNavText}
            </Link>
            <Link href="/agents" onClick={() => setOpen(false)} className="text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {agentsText}
            </Link>
            <Link href="/upload" onClick={() => setOpen(false)} className={uploadLinkClass}>
              {uploadText}
            </Link>
            <Link href="/favorites" onClick={() => setOpen(false)} className="text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesText}
            </Link>
            <Link href="/compare" onClick={() => setOpen(false)} className="text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {compareText}
            </Link>
            {!user ? (
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-blue-600">
                {loginText}
              </Link>
            ) : (
              <>
                <Link href="/messages" onClick={() => setOpen(false)} className="text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {messagesText}
                </Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="text-sm font-medium text-blue-600">
                  {profileText}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="text-sm font-semibold flex items-center gap-2 text-rose-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {adminText}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
