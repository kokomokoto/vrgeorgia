'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const SECTION_IDS = [
  'arch',
  'docs',
  'planning',
  'interior',
  'landscape',
  'vis',
  'heritage',
  'consult',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

const SECTION_STYLE: Record<
  SectionId,
  {
    gradient: string;
    ring: string;
    stripe: string;
    blob: string;
  }
> = {
  arch: {
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    ring: 'ring-amber-500/25',
    stripe: 'from-amber-500 to-orange-500',
    blob: 'bg-amber-400/30',
  },
  docs: {
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    ring: 'ring-blue-500/25',
    stripe: 'from-sky-500 to-indigo-600',
    blob: 'bg-sky-400/30',
  },
  planning: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    ring: 'ring-emerald-500/25',
    stripe: 'from-emerald-500 to-teal-600',
    blob: 'bg-emerald-400/30',
  },
  interior: {
    gradient: 'from-rose-400 via-fuchsia-500 to-purple-600',
    ring: 'ring-rose-500/25',
    stripe: 'from-rose-500 to-purple-600',
    blob: 'bg-rose-400/25',
  },
  landscape: {
    gradient: 'from-lime-400 via-green-500 to-emerald-700',
    ring: 'ring-green-500/25',
    stripe: 'from-lime-500 to-emerald-700',
    blob: 'bg-lime-400/30',
  },
  vis: {
    gradient: 'from-violet-400 via-purple-500 to-indigo-700',
    ring: 'ring-violet-500/25',
    stripe: 'from-violet-500 to-indigo-700',
    blob: 'bg-violet-400/30',
  },
  heritage: {
    gradient: 'from-stone-400 via-amber-700 to-stone-800',
    ring: 'ring-amber-700/20',
    stripe: 'from-stone-500 to-amber-800',
    blob: 'bg-stone-400/25',
  },
  consult: {
    gradient: 'from-cyan-400 via-sky-500 to-blue-700',
    ring: 'ring-cyan-500/25',
    stripe: 'from-cyan-500 to-blue-700',
    blob: 'bg-cyan-400/30',
  },
};

function SectionIcon({ id }: { id: SectionId }) {
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12.75v13.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5V3z" />
        </svg>
      );
    case 'landscape':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case 'vis':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 7.5V18M9 7.5v10.5M3 7.5v10.5M3.75 18h16.5M4.5 7.5h15M9 4.5h-.75A2.25 2.25 0 006 6.75v.75m12-3h.75a2.25 2.25 0 012.25 2.25v.75M9 4.5V3m6 1.5V3m-9 18v-1.5m12 1.5v-1.5" />
        </svg>
      );
    case 'heritage':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
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

/** აბსტრაქტული „მინი-სქემა“ აღწერის ვიზუალური მხარდაჭერისთვის */
function SectionVisualAccent({ id, stripe }: { id: SectionId; stripe: string }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-zinc-600/60 dark:bg-zinc-950/50">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${SECTION_STYLE[id].blob}`}
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
          <div className={`h-px flex-1 max-w-[4rem] self-center bg-gradient-to-r ${stripe} opacity-40`} />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-2 w-2 rounded-full bg-gradient-to-br ${stripe} opacity-70`}
              />
            ))}
          </div>
          <div className={`h-px flex-1 max-w-[4rem] self-center bg-gradient-to-l ${stripe} opacity-40`} />
        </div>
        <div className="flex gap-2 sm:justify-end" aria-hidden>
          <div className={`h-14 w-14 rounded-lg border border-white/40 bg-gradient-to-br ${stripe} p-0.5 shadow-md dark:border-white/10`}>
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

export default function ServicesPage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-amber-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10" aria-hidden />
      <div className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
        <header className="relative mb-12 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:shadow-black/40 md:p-10">
          <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200/60 to-orange-300/40 blur-2xl dark:from-amber-600/20 dark:to-orange-600/10" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 -translate-x-1/2 rounded-full bg-gradient-to-t from-sky-100/80 to-transparent blur-2xl dark:from-sky-900/30" />

          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              {t('services_nav')}
            </p>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 md:text-4xl md:leading-tight">
              {t('services_pageTitle')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-zinc-300 md:text-lg">
              {t('services_pageLead')}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-8 dark:border-zinc-700/80">
              {[
                { k: 'arch', label: t('services_section_arch_title') },
                { k: 'interior', label: t('services_section_interior_title') },
                { k: 'vis', label: t('services_section_vis_title') },
              ].map((item) => (
                <div
                  key={item.k}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-4 text-center dark:border-zinc-700/50 dark:bg-zinc-800/40"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md ring-2 ${SECTION_STYLE[item.k as SectionId].ring} ${SECTION_STYLE[item.k as SectionId].gradient}`}
                  >
                    <SectionIcon id={item.k as SectionId} />
                  </div>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-600 dark:text-zinc-400 sm:text-xs">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="space-y-6 md:space-y-8">
          {SECTION_IDS.map((id, index) => {
            const st = SECTION_STYLE[id];
            return (
              <section
                key={id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/30 backdrop-blur-sm transition hover:border-slate-300/90 hover:shadow-xl dark:border-zinc-700/90 dark:bg-zinc-900/60 dark:shadow-black/30 dark:hover:border-zinc-600"
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${st.stripe} opacity-90`}
                  aria-hidden
                />
                <div className="flex flex-col gap-6 p-6 pl-7 md:flex-row md:items-start md:gap-8 md:p-8 md:pl-9">
                  <div className="flex shrink-0 flex-col items-center gap-3 md:w-36">
                    <div
                      className={`relative flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-4 transition group-hover:scale-[1.02] ${st.ring} ${st.gradient}`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                      <SectionIcon id={id} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 md:text-2xl">
                      {t(`services_section_${id}_title`)}
                    </h2>
                    <div className={`mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
                    <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-zinc-300 md:text-base md:leading-7">
                      {t(`services_section_${id}_body`)}
                    </p>
                    <SectionVisualAccent id={id} stripe={st.stripe} />
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-12 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-6 text-sm leading-relaxed text-slate-600 shadow-inner dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-400 md:p-8">
          <div className="flex gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <p className="min-w-0 pt-1">{t('services_footer_note')}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
