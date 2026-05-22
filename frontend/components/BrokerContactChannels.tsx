'use client';

import React from 'react';
import { telegramUrl, telegramWebUrl, viberUrl, whatsAppUrl } from '@/lib/phoneLinks';

type Props = {
  phone?: string;
  email?: string;
};

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function MessengerIconButton({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 ${className}`}
    >
      {children}
    </a>
  );
}

export function BrokerContactChannels({ phone, email }: Props) {
  const displayPhone = phone?.trim();
  const wa = displayPhone ? whatsAppUrl(displayPhone) : null;
  const viber = displayPhone ? viberUrl(displayPhone) : null;
  const tgApp = displayPhone ? telegramUrl(displayPhone) : null;
  const tgWeb = displayPhone ? telegramWebUrl(displayPhone) : null;
  const mail = email?.trim();

  const handleTelegram = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tgApp) {
      window.location.href = tgApp;
      setTimeout(() => {
        if (tgWeb) openExternal(tgWeb);
      }, 600);
    } else if (tgWeb) openExternal(tgWeb);
  };

  if (!displayPhone && !mail) return null;

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-3">
      {displayPhone && (
        <a
          href={`tel:${displayPhone.replace(/\s/g, '')}`}
          className="text-center text-lg font-semibold tracking-wide text-slate-900 transition-colors hover:text-blue-700 sm:text-xl dark:text-amber-400 dark:hover:text-amber-300"
        >
          {displayPhone}
        </a>
      )}

      {(wa || viber || tgApp || mail) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {wa && (
            <MessengerIconButton href={wa} label="WhatsApp" className="bg-[#25D366] text-white shadow-sm">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </MessengerIconButton>
          )}

          {viber && (
            <MessengerIconButton href={viber} label="Viber" className="bg-[#7360f2] text-white shadow-sm">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.398.002C9.957.028 5.58.344 3.452 2.528 1.758 4.287 1.026 6.86.8 11.623c-.041.785-.09 2.241.777 2.664l.494 2.074s-.037.757.352.91c.39.154 1.236-.296 2.22-1.277.465-.462.99-1.087 1.42-1.59 3.68.304 6.517-1.57 6.83-1.77.74-.43 4.9-2.01 5.58-7.256.002-.014.076-1.34-.293-2.96-.616-2.87-2.77-4.196-3.048-4.396C18.78.094 14.178.002 11.398.002zm.033 1.873c2.337 0 6.548.078 8.988 1.718.188.14 2.07 1.15 2.576 3.385.28 1.306.22 2.453.215 2.576-.48 4.154-3.38 5.133-4.076 5.52-.405.213-3.38 1.818-6.605 1.55-.003.002-2.688 3.236-3.53 4.066-.13.128-.236.177-.32.19-.106.017-.204-.02-.276-.08l-1.095-2.52s3.285-1.57 3.33-1.586c3.24-1.18 4.89-4.78 5.14-5.1.517-.69 1.09-1.24 1.09-2.31 0-1.17-.95-2.12-2.12-2.12-.6 0-1.15.25-1.54.66-1.28 1.36-3.04 2.14-4.88 2.14H8.88c-.55 0-1-.45-1-1s.45-1 1-1h2.47c1.47 0 2.82-.62 3.78-1.64.39-.42.9-.64 1.44-.64.72 0 1.31.59 1.31 1.31 0 .5-.27.96-.7 1.2-.04.02-2.57 1.18-5.48 4.58-.42.5-1.05 1.22-1.65 1.88l2.18 1.01-.49-2.06c-.88-.37-.8-1.72-.77-2.35.2-4.4.85-6.62 2.36-8.15 1.78-1.84 5.65-2.12 7.15-2.14h.05z" />
              </svg>
            </MessengerIconButton>
          )}

          {(tgApp || tgWeb) && (
            <a
              href={tgWeb || tgApp || '#'}
              onClick={handleTelegram}
              title="Telegram"
              aria-label="Telegram"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#26A5E4] text-white shadow-sm transition-transform hover:scale-105"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          )}

          {mail && (
            <MessengerIconButton
              href={`mailto:${mail}`}
              label="Email"
              className="bg-slate-600 text-white shadow-sm"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </MessengerIconButton>
          )}
        </div>
      )}
    </div>
  );
}
