'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  consumeInstallPrompt,
  isIosSafari,
  reportAppInstall,
  shouldOfferInstall,
  subscribeInstallState,
} from '@/lib/pwaInstall';

export function InstallAppMenuItem({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [offer, setOffer] = React.useState(false);
  const [iosHelp, setIosHelp] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => subscribeInstallState(() => setOffer(shouldOfferInstall())), []);

  React.useEffect(() => {
    setOffer(shouldOfferInstall());
  }, []);

  if (!offer) return null;

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };
  const label = tr('install_app', 'აპის დაყენება');

  const onClick = async () => {
    const prompt = consumeInstallPrompt();
    if (prompt) {
      setBusy(true);
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') reportAppInstall();
        setOffer(shouldOfferInstall());
        onClose();
      } catch {
        setOffer(shouldOfferInstall());
      } finally {
        setBusy(false);
      }
      return;
    }
    setIosHelp((open) => !open);
  };

  const iosText = isIosSafari()
    ? tr('install_app_ios', 'Safari-ში დააჭირე გაზიარების ღილაკს, შემდეგ „მთავარ ეკრანზე დამატება“.')
    : tr('install_app_ios_other', 'გახსენი ეს გვერდი Safari-ში, დააჭირე გაზიარებას და შემდეგ „მთავარ ეკრანზე დამატება“.');

  return (
    <div className="mt-2 border-t border-slate-200 pt-2 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className="install-app-cta group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left ring-1 ring-green-600/30 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 dark:ring-green-400/40"
      >
        <span className="install-app-ripples" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </span>
        <span
          className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-md"
          style={{ backgroundColor: 'var(--install-green)' }}
        >
          <svg className="relative h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6m0 0l-2.2-2.2M12 13l2.2-2.2" />
          </svg>
        </span>
        <span className="relative z-10 min-w-0 flex-1 text-[15px] font-semibold leading-5 text-slate-900 dark:text-white">
          {label}
        </span>
        <span className="relative z-10 text-lg leading-none text-green-600 transition group-hover:translate-x-0.5 dark:text-green-400" aria-hidden>
          ›
        </span>
      </button>
      {iosHelp ? (
        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
          {iosText}
        </p>
      ) : null}
    </div>
  );
}
