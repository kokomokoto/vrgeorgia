'use client';

import React from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  SERVICE_SECTION_IDS,
  SERVICE_SECTION_STYLE,
  isServiceSectionId,
  servicePath,
  type ServiceSectionId,
} from '@/lib/servicesCatalog';
import {
  ServiceSectionIcon,
  ServiceSectionVisualAccent,
} from '@/components/services/ServiceSectionVisuals';

export default function ServiceDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  if (!isServiceSectionId(slug)) {
    notFound();
  }

  const id = slug as ServiceSectionId;
  const st = SERVICE_SECTION_STYLE[id];
  const index = SERVICE_SECTION_IDS.indexOf(id);
  const prev = index > 0 ? SERVICE_SECTION_IDS[index - 1] : null;
  const next =
    index >= 0 && index < SERVICE_SECTION_IDS.length - 1
      ? SERVICE_SECTION_IDS[index + 1]
      : null;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-amber-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl px-4 py-10 md:py-14">
        <Link
          href="/services"
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← {t('services_back')}
        </Link>

        <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-900/70 dark:shadow-black/30">
          <div className={`h-2 w-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
          <div className="p-6 md:p-10">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div
                className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ring-4 ${st.ring} ${st.gradient}`}
              >
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                <ServiceSectionIcon id={id} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {t('services_nav')} · {String(index + 1).padStart(2, '0')} /{' '}
                  {String(SERVICE_SECTION_IDS.length).padStart(2, '0')}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 md:text-4xl">
                  {t(`services_section_${id}_title`)}
                </h1>
                <div className={`mt-3 h-1 w-20 rounded-full bg-gradient-to-r ${st.stripe}`} aria-hidden />
              </div>
            </div>

            <p className="mt-8 text-base leading-relaxed text-slate-600 dark:text-zinc-300 md:text-lg md:leading-8">
              {t(`services_section_${id}_body`)}
            </p>

            <ServiceSectionVisualAccent id={id} stripe={st.stripe} />

            <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400">
              {t('services_footer_note')}
            </p>
          </div>
        </article>

        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {prev ? (
            <Link
              href={servicePath(prev)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              ← {t(`services_section_${prev}_title`)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={servicePath(next)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t(`services_section_${next}_title`)} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}
