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
} from '@/lib/tourBuilder';

type Props = {
  exteriorLink: string;
  interiorLink: string;
  tourLink: string;
  onExteriorChange: (v: string) => void;
  onInteriorChange: (v: string) => void;
  onTourChange: (v: string) => void;
};

export function PropertyVirtualTourFields({
  exteriorLink,
  interiorLink,
  tourLink,
  onExteriorChange,
  onInteriorChange,
  onTourChange,
}: Props) {
  const { t } = useTranslation();
  const tourWindowRef = React.useRef<Window | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualValue, setManualValue] = React.useState('');

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTourPublishedMessage(event.data)) return;
      const raw =
        event.data.url.trim() ||
        (event.data.tourId ? getPublishedTourUrl(event.data.tourId) : '');
      const url = resolveTourPublicUrl(raw);
      if (url) onTourChange(url);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onTourChange]);

  const openTourBuilder = () => {
    // არსებული ტურის რედაქტირება — იმავე ტურს ვხსნით; თუ არ არის — ახალს ვქმნით
    const existingId = extractTourId(tourLink);
    const url = existingId ? getTourEditUrl(existingId) : getTourBuilderEmbedUrl();
    // ახალ ტაბში; noopener-ს ვერ ვიყენებთ — საჭიროა window.opener postMessage-ისთვის
    const w = window.open(url, 'vrgeorgia-tour-builder');
    if (w) {
      tourWindowRef.current = w;
      w.focus();
    }
  };

  const clearTour = () => {
    onTourChange('');
    setManualValue('');
  };

  const applyManual = () => {
    const v = manualValue.trim();
    if (!v) return;
    onTourChange(v);
    setManualOpen(false);
  };

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
                    placeholder="http://localhost:3002/v/..."
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
    </div>
  );
}
