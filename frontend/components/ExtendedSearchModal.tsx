'use client';

import React from 'react';
import { createPortal } from 'react-dom';

export function ExtendedSearchModal({
  open,
  onClose,
  onApply,
  title,
  closeLabel,
  applyLabel,
  children,
}: {
  open: boolean;
  /** გაუქმება (X / Escape / ფონი) — დრაფტი არ გამოიყენება */
  onClose: () => void;
  /** შედეგების გამოყენება */
  onApply: () => void;
  title: string;
  closeLabel: string;
  applyLabel: string;
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
      className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extended-search-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm dark:bg-black/75"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-h-[min(94vh,960px)] flex-col rounded-t-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:max-h-[min(90vh,920px)] sm:w-[min(96vw,56rem)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-8 sm:py-5">
          <h2 id="extended-search-title" className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={closeLabel}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-8 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:min-w-[140px] sm:px-5"
          >
            {closeLabel}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 sm:w-auto sm:min-w-[200px] sm:px-6"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
