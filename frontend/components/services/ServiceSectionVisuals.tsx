'use client';

import React from 'react';
import {
  SERVICE_SECTION_STYLE,
  type ServiceSectionId,
} from '@/lib/servicesCatalog';

export function ServiceSectionIcon({ id }: { id: ServiceSectionId }) {
  const common = 'h-8 w-8 text-white drop-shadow-sm';
  switch (id) {
    case 'arch':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M4.5 3h15M3 3v18M21 3v18M9 8.25h6M12 8.25v12" />
        </svg>
      );
    case 'docs':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      );
    case 'planning':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15h6V6.75M9 6.75H4.5v-3h15v3H15M9 20.25h6" />
        </svg>
      );
    case 'interior':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12.75v13.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5V3z"
          />
        </svg>
      );
    case 'landscape':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
          />
        </svg>
      );
    case 'vis':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 7.5V18M15 7.5V18M9 7.5v10.5M3 7.5v10.5M3.75 18h16.5M4.5 7.5h15M9 4.5h-.75A2.25 2.25 0 006 6.75v.75m12-3h.75a2.25 2.25 0 012.25 2.25v.75M9 4.5V3m6 1.5V3m-9 18v-1.5m12 1.5v-1.5"
          />
        </svg>
      );
    case 'heritage':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21"
          />
        </svg>
      );
    case 'consult':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ServiceSectionVisualAccent({
  id,
  stripe,
}: {
  id: ServiceSectionId;
  stripe: string;
}) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-zinc-600/60 dark:bg-zinc-950/50">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${SERVICE_SECTION_STYLE[id].blob}`}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-end gap-1.5" aria-hidden>
          {[0.45, 0.7, 1].map((h, i) => (
            <div
              key={i}
              className={`w-7 rounded-t-md bg-gradient-to-t ${stripe} opacity-90 shadow-sm`}
              style={{ height: `${h * 3.25}rem` }}
            />
          ))}
        </div>
        <div className="hidden flex-1 justify-center gap-2 sm:flex" aria-hidden>
          <div className={`h-px max-w-[4rem] flex-1 self-center bg-gradient-to-r ${stripe} opacity-40`} />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`h-2 w-2 rounded-full bg-gradient-to-br ${stripe} opacity-70`} />
            ))}
          </div>
          <div className={`h-px max-w-[4rem] flex-1 self-center bg-gradient-to-l ${stripe} opacity-40`} />
        </div>
        <div className="flex gap-2 sm:justify-end" aria-hidden>
          <div
            className={`h-14 w-14 rounded-lg border border-white/40 bg-gradient-to-br p-0.5 shadow-md dark:border-white/10 ${stripe}`}
          >
            <div className="h-full w-full rounded-[0.4rem] bg-white/90 dark:bg-zinc-900/90" />
          </div>
          <div className="flex flex-col justify-between py-0.5">
            <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${stripe} opacity-50`} />
            <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${stripe} opacity-35`} />
            <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${stripe} opacity-25`} />
          </div>
        </div>
      </div>
    </div>
  );
}
