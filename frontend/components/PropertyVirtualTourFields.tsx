'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  getTourBuilderEmbedUrl,
  getTourEditUrl,
  getPublishedTourUrl,
  extractTourId,
  isTourPublishedMessage,
  resolveTourPublicUrl,
  getOrCreateTourEmbedSession,
  clearTourEmbedSession,
  fetchPendingEmbedTourLink,
} from '@/lib/tourBuilder';
import { useAuth } from '@/components/AuthProvider';
import type { DefaultMediaView } from '@/lib/types';

type Props = {
  exteriorLink: string;
  interiorLink: string;
  tourLink: string;
  onExteriorChange: (v: string) => void;
  onInteriorChange: (v: string) => void;
  onTourChange: (v: string) => void;
  defaultMediaView: DefaultMediaView;
  onDefaultMediaViewChange: (v: DefaultMediaView) => void;
  hasPhotos: boolean;
};

const MEDIA_ORDER: DefaultMediaView[] = ['exterior', 'interior', 'tour', 'photos'];

export function PropertyVirtualTourFields({
  exteriorLink,
  interiorLink,
  tourLink,
  onExteriorChange,
  onInteriorChange,
  onTourChange,
  defaultMediaView,
  onDefaultMediaViewChange,
  hasPhotos,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const tourWindowRef = React.useRef<Window | null>(null);
  const embedSessionRef = React.useRef<string>('');
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualValue, setManualValue] = React.useState('');
  const [openError, setOpenError] = React.useState<string | null>(null);
  const [awaitingTour, setAwaitingTour] = React.useState(false);

  const hasExterior = !!exteriorLink.trim();
  const hasInterior = !!interiorLink.trim();
  const hasTour = !!resolveTourPublicUrl(tourLink);

  React.useEffect(() => {
    const available: Record<DefaultMediaView, boolean> = {
      exterior: hasExterior,
      interior: hasInterior,
      tour: hasTour,
      photos: hasPhotos,
    };
    if (available[defaultMediaView]) return;
    const next = MEDIA_ORDER.find((k) => available[k]);
    if (next && next !== defaultMediaView) onDefaultMediaViewChange(next);
  }, [
    hasExterior,
    hasInterior,
    hasTour,
    hasPhotos,
    defaultMediaView,
    onDefaultMediaViewChange,
  ]);

  const applyTourUrl = React.useCallback(
    (raw: string) => {
      const url = resolveTourPublicUrl(raw);
      if (!url) return;
      onTourChange(url);
      clearTourEmbedSession();
      setAwaitingTour(false);
    },
    [onTourChange]
  );

  const pollPendingTour = React.useCallback(async () => {
    const sessionId = embedSessionRef.current || getOrCreateTourEmbedSession();
    if (!sessionId) return;
    embedSessionRef.current = sessionId;
    const pending = await fetchPendingEmbedTourLink(sessionId);
    if (pending?.url) applyTourUrl(pending.url);
  }, [applyTourUrl]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTourPublishedMessage(event.data)) return;
      const raw =
        event.data.url.trim() ||
        (event.data.tourId ? getPublishedTourUrl(event.data.tourId) : '');
      applyTourUrl(raw);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyTourUrl]);

  // API polling fallback — when user returns from tour-builder tab
  React.useEffect(() => {
    if (!awaitingTour) return;
    const onFocus = () => {
      void pollPendingTour();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pollPendingTour();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => {
      void pollPendingTour();
    }, 2000);
    void pollPendingTour();
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [awaitingTour, pollPendingTour]);

  const openTourBuilder = () => {
    setOpenError(null);
    const sessionId = getOrCreateTourEmbedSession();
    embedSessionRef.current = sessionId;
    setAwaitingTour(true);

    const existingId = extractTourId(tourLink);
    const creatorId = user?.id || user?._id;
    const url = existingId
      ? getTourEditUrl(existingId, sessionId)
      : getTourBuilderEmbedUrl(creatorId, sessionId);

    const w = window.open(url, 'vrgeorgia-tour-builder');
    if (w) {
      tourWindowRef.current = w;
      w.focus();
      return;
    }
    setAwaitingTour(false);
    setOpenError(
      'ბრაუზერმა ახალი ტაბი დაბლოკა. ჩართეთ pop-up-ები ამ საიტისთვის, ან გამოიყენეთ ქვემოთ ბმული.'
    );
  };

  const clearTour = () => {
    onTourChange('');
    setManualValue('');
    setAwaitingTour(false);
    clearTourEmbedSession();
  };

  const applyManual = () => {
    const v = manualValue.trim();
    if (!v) return;
    onTourChange(v);
    setManualOpen(false);
    setAwaitingTour(false);
    clearTourEmbedSession();
  };

  const mediaOptions: { id: DefaultMediaView; label: string; enabled: boolean }[] = [
    { id: 'exterior', label: t('exterior'), enabled: hasExterior },
    { id: 'interior', label: t('interior'), enabled: hasInterior },
    { id: 'tour', label: t('view3d_tour'), enabled: hasTour },
    { id: 'photos', label: t('photos'), enabled: hasPhotos },
  ];

  return (
    <div className="pt-2 border-t">
      <p className="text-sm text-slate-500 mb-2">🔮 3D ({t('cadastral_optional')})</p>
      <p className="text-xs text-slate-400 mb-3">YouTube, Matterport, Kuula, Supersplat · {t('tour_3d_builder_hint')}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('exterior_3d')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-600 dark:bg-zinc-950"
            placeholder={t('exterior_3d')}
            value={exteriorLink}
            onChange={(e) => onExteriorChange(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('interior_3d')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-600 dark:bg-zinc-950"
            placeholder={t('interior_3d')}
            value={interiorLink}
            onChange={(e) => onInteriorChange(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('tour_3d')}
          </label>
          {tourLink ? (
            <div className="space-y-2">
              <p className="truncate text-xs text-green-700 dark:text-green-400" title={tourLink}>
                ✓ {t('tour_3d_attached')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openTourBuilder}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900"
                >
                  {t('tour_3d_edit')}
                </button>
                <button
                  type="button"
                  onClick={openTourBuilder}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900"
                  title={t('tour_3d_open_builder')}
                >
                  ↗
                </button>
                <button
                  type="button"
                  onClick={clearTour}
                  className="rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  {t('tour_3d_remove')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={openTourBuilder}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
              >
                <span aria-hidden>🧭</span>
                {t('tour_3d_open_builder')}
              </button>
              {awaitingTour && (
                <p className="text-center text-xs text-blue-600 dark:text-amber-400">
                  {t('tour_3d_awaiting_publish')}
                </p>
              )}
              {openError && (
                <p className="text-xs text-red-600 dark:text-red-400">{openError}</p>
              )}
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="block w-full text-center text-[11px] text-slate-400 underline-offset-2 hover:text-blue-600 hover:underline"
              >
                {t('tour_3d_paste_manual')}
              </button>
              {manualOpen && (
                <div className="flex gap-1">
                  <input
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-600 dark:bg-zinc-950"
                    placeholder="http://localhost:5000/v/..."
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyManual();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={applyManual}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {t('default_media_view')}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('default_media_view_hint')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mediaOptions.map((opt) => {
            const selected = defaultMediaView === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!opt.enabled}
                onClick={() => onDefaultMediaViewChange(opt.id)}
                title={!opt.enabled ? t('default_media_view_unavailable') : undefined}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-amber-500 dark:bg-amber-500/15 dark:text-amber-200'
                    : opt.enabled
                      ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-950 dark:text-slate-200'
                      : 'cursor-not-allowed border-slate-100 bg-slate-50/60 text-slate-300 dark:border-zinc-800 dark:text-zinc-600'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                      : 'border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-900'
                  }`}
                  aria-hidden
                >
                  {selected ? '✓' : ''}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
