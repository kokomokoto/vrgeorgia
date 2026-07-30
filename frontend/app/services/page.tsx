'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  SERVICE_SECTION_IDS,
  SERVICE_SECTION_STYLE,
  servicePath,
  type ServiceSectionId,
} from '@/lib/servicesCatalog';
import { ServiceSectionIcon } from '@/components/services/ServiceSectionVisuals';

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
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10"
        aria-hidden
      />

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
              {(['arch', 'interior', 'vis'] as ServiceSectionId[]).map((k) => (
                <Link
                  key={k}
                  href={servicePath(k)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-4 text-center transition hover:border-amber-300 hover:bg-amber-50/60 dark:border-zinc-700/50 dark:bg-zinc-800/40 dark:hover:border-amber-500/40"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md ring-2 ${SERVICE_SECTION_STYLE[k].ring} ${SERVICE_SECTION_STYLE[k].gradient}`}
                  >
                    <ServiceSectionIcon id={k} />
                  </div>
                  <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-600 dark:text-zinc-400 sm:text-xs">
                    {t(`services_section_${k}_title`)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </header>

        <div className="space-y-6 md:space-y-8">
          {SERVICE_SECTION_IDS.map((id, index) => {
            const st = SERVICE_SECTION_STYLE[id];
            return (
              <Link
                key={id}
                href={servicePath(id)}
                className="group relative block scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/30 backdrop-blur-sm transition hover:border-slate-300/90 hover:shadow-xl dark:border-zinc-700/90 dark:bg-zinc-900/60 dark:shadow-black/30 dark:hover:border-zinc-600"
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
                      <ServiceSectionIcon id={id} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 md:text-2xl">
                        {t(`services_section_${id}_title`)}
                      </h2>
                      <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:border-amber-500/50 dark:group-hover:text-amber-300">
                        {t('services_open_page')} →
                      </span>
                    </div>
                    <div className={`mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
                    <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-slate-600 dark:text-zinc-300 md:text-base md:leading-7">
                      {t(`services_section_${id}_body`)}
                    </p>
                  </div>
                </div>
              </Link>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
            </div>
            <p className="min-w-0 pt-1">{t('services_footer_note')}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
