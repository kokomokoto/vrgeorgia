'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { isAdminRole, isAgentRole } from '@/lib/userRoles';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import { DEFAULT_HEADER } from '@/lib/homeDesignLayout';

const DRAG_THRESHOLD_PX = 3;

export function Header() {
  const { t } = useTranslation();
  const { user, profileLoaded } = useAuth();
  const design = useHomeDesignOptional();
  const designMode = design?.designMode ?? false;
  const selected = design?.selectedId === 'header';
  const headerLayout = design?.layout.header;
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const headerH = headerLayout?.h ?? DEFAULT_HEADER.h;
  const brandFontSize = headerLayout?.brandFontSize ?? DEFAULT_HEADER.brandFontSize;
  const navFontSize = headerLayout?.navFontSize ?? DEFAULT_HEADER.navFontSize;
  const brandColor = headerLayout?.brandColor?.trim() || '';
  const navColor = headerLayout?.navColor?.trim() || '';

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--site-header-height', `${headerH}px`);
    return () => {
      document.documentElement.style.removeProperty('--site-header-height');
    };
  }, [headerH]);

  const dragRef = React.useRef<{
    startY: number;
    origH: number;
    historyStarted: boolean;
  } | null>(null);

  const onHeightPointerDown = (e: React.PointerEvent) => {
    if (!design || !designMode) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('header');
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = {
      startY: e.clientY,
      origH: headerH,
      historyStarted: false,
    };
  };

  const onHeightPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !design) return;
    const dy = e.clientY - d.startY;
    if (!d.historyStarted) {
      if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      design.beginHistoryGesture();
      d.historyStarted = true;
    }
    design.updateHeader({ h: d.origH + dy });
  };

  const onHeightPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current || !design) return;
    const started = dragRef.current.historyStarted;
    dragRef.current = null;
    if (started) design.endHistoryGesture();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // Logo-ზე კლიკით გვერდის სრული გადატვირთვა (ფილტრების reset-ისთვის)
  const handleLogoClick = (e: React.MouseEvent) => {
    if (designMode) {
      e.preventDefault();
      e.stopPropagation();
      design?.setSelectedId('header');
      return;
    }
    e.preventDefault();
    window.location.href = '/';
  };

  const appName = headerLayout?.brandLabel?.trim() || 'Vhome';
  const uploadText =
    headerLayout?.uploadLabel?.trim() || (mounted ? t('upload') : 'განცხადების დამატება');
  const loginText =
    headerLayout?.loginLabel?.trim() || (mounted ? t('login') : 'შესვლა');
  const profileText = mounted ? t('profile') : 'პროფილი';
  const favoritesText =
    headerLayout?.favoritesLabel?.trim() || (mounted ? t('favorites') : 'ფავორიტები');
  const compareText =
    headerLayout?.compareLabel?.trim() || (mounted ? t('compare') : 'შედარება');
  const agentsText =
    headerLayout?.agentsLabel?.trim() || (mounted ? t('agents') : 'აგენტები');
  const servicesNavText =
    headerLayout?.servicesLabel?.trim() || (mounted ? t('services_nav') : 'მომსახურება');
  const aboutNavText =
    headerLayout?.aboutLabel?.trim() || (mounted ? t('about_nav') : 'შესახებ');
  const messagesText = mounted ? t('messages') : 'შეტყობინებები';
  const adminText = mounted ? t('admin_panel') : 'ადმინ პანელი';
  const isAdmin = profileLoaded && isAdminRole(user?.role);
  const isAgent = profileLoaded && isAgentRole(user?.role);

  const navStyle: React.CSSProperties = {
    fontSize: navFontSize,
    ...(navColor ? { color: navColor } : {}),
  };
  const brandStyle: React.CSSProperties = {
    fontSize: brandFontSize,
    ...(brandColor ? { color: brandColor } : {}),
  };

  const uploadLinkClass =
    isAgent || isAdmin
      ? 'font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
      : 'text-slate-800 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-amber-400';

  const headerCssVars = {
    ...(navColor ? ({ ['--theme-header-text']: navColor } as React.CSSProperties) : {}),
    ...(brandColor ? ({ ['--theme-accent']: brandColor } as React.CSSProperties) : {}),
  };

  return (
    <header
      data-site-header
      data-designable="header"
      className="sticky top-0 z-20 box-border border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:backdrop-blur-md relative"
      style={{
        height: headerH,
        ...headerCssVars,
        outline: designMode
          ? selected
            ? '2px solid #2563eb'
            : '1px dashed #94a3b8'
          : undefined,
        outlineOffset: designMode ? -2 : undefined,
        cursor: designMode ? 'pointer' : undefined,
      }}
      onClick={
        designMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              design?.setSelectedId('header');
            }
          : undefined
      }
    >
      <div
        className={`relative mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 ${
          designMode ? 'pointer-events-none' : ''
        }`}
      >
        {designMode ? (
          <DesignableBadge id="header" selected={selected} placement="inside" />
        ) : null}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={handleLogoClick}
            data-theme-brand
            className="cursor-pointer font-semibold leading-none"
            style={brandStyle}
          >
            {appName}
          </a>
        </div>

        <nav className="hidden items-center gap-4 md:flex">
          <Link
            href="/services"
            data-theme-nav
            className="flex items-center gap-1"
            style={navStyle}
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
          <Link href="/about" data-theme-nav className="" style={navStyle}>
            {aboutNavText}
          </Link>
          <Link
            href="/agents"
            data-theme-nav
            className="flex items-center gap-1"
            style={navStyle}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {agentsText}
          </Link>
          <Link
            href="/upload"
            className={uploadLinkClass}
            style={isAgent || isAdmin ? { fontSize: navFontSize } : navStyle}
            {...(isAgent || isAdmin ? {} : { 'data-theme-nav': true })}
          >
            {uploadText}
          </Link>
          <Link
            href="/favorites"
            data-theme-nav
            className="flex items-center gap-1"
            style={navStyle}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {favoritesText}
          </Link>
          <Link
            href="/compare"
            data-theme-nav
            className="flex items-center gap-1"
            style={navStyle}
          >
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
            <Link href="/login" data-theme-nav className="font-medium" style={navStyle}>
              {loginText}
            </Link>
          ) : (
            <>
              <Link
                href="/messages"
                data-theme-nav
                className="flex items-center gap-1"
                style={navStyle}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {messagesText}
              </Link>
              <Link href="/profile" data-theme-nav className="font-medium" style={navStyle}>
                {profileText}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="font-semibold flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300" style={{ fontSize: navFontSize }}>
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
            className="rounded-md border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            style={{ fontSize: navFontSize }}
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div
          data-theme-surface
          className="border-t md:hidden"
          style={{ ...headerCssVars }}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            <Link href="/services" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {servicesNavText}
            </Link>
            <Link href="/about" data-theme-nav onClick={() => setOpen(false)} className="py-2" style={navStyle}>
              {aboutNavText}
            </Link>
            <Link href="/agents" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {agentsText}
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className={`${uploadLinkClass} py-2`}
              style={isAgent || isAdmin ? { fontSize: navFontSize } : navStyle}
              {...(isAgent || isAdmin ? {} : { 'data-theme-nav': true })}
            >
              {uploadText}
            </Link>
            <Link href="/favorites" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesText}
            </Link>
            <Link href="/compare" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
              <Link href="/login" data-theme-nav onClick={() => setOpen(false)} className="py-2 font-medium" style={navStyle}>
                {loginText}
              </Link>
            ) : (
              <>
                <Link href="/messages" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
                  <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {messagesText}
                </Link>
                <Link href="/profile" data-theme-nav onClick={() => setOpen(false)} className="py-2 font-medium" style={navStyle}>
                  {profileText}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2 font-semibold text-rose-600" style={{ fontSize: navFontSize }}>
                    <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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

      {designMode ? (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 flex h-3 cursor-ns-resize items-center justify-center bg-blue-600/80"
          title="ჰედერის სიმაღლე"
          onPointerDown={onHeightPointerDown}
          onPointerMove={onHeightPointerMove}
          onPointerUp={onHeightPointerUp}
          onPointerCancel={onHeightPointerUp}
        />
      ) : null}
    </header>
  );
}
