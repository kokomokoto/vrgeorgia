'use client';

import React from 'react';
import { createPortal } from 'react-dom';

export function ExtendedSearchModal({
  open,
  onClose,
  title,
  closeLabel,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extended-search-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] dark:bg-black/70"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-h-[min(92vh,900px)] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-2xl sm:rounded-2xl lg:max-w-3xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-zinc-800">
          <h2 id="extended-search-title" className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-zinc-800 sm:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white dark:bg-amber-500 dark:text-black"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
