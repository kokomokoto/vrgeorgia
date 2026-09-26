'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/components/BrandLogo';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import type { FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS, buildMapHref } from '@/lib/mapQuery';
import {
  EMPTY_SITE_SOCIAL_LINKS,
  configuredSiteSocials,
  type SiteSocialNetwork,
} from '@/lib/siteSocialLinks';

const SITE_PHONE_DISPLAY = '+995 597 046 604';
const SITE_PHONE_TEL = '+995597046604';
const SITE_EMAIL = 'virtualhome.ge@gmail.com';
const SITE_WEB_DISPLAY = 'www.vhome.ge';
const SITE_WEB_HREF = 'https://www.vhome.ge';

function searchHref(patch: Partial<Pick<FiltersState, 'dealType' | 'type' | 'city' | 'has3d'>>): string {
  return buildMapHref({ ...DEFAULT_MAP_FILTERS, ...patch }, 'date_desc');
}

type FooterLink = { key: string; fallback: string; href: string };

const SEARCH_GROUPS: { labelKey: string; labelFallback: string; items: FooterLink[] }[] = [
  {
    labelKey: 'dealType',
    labelFallback: 'გარიგება',
    items: [
      { key: 'deal_sale', fallback: 'იყიდება', href: searchHref({ dealType: ['sale'] }) },
      { key: 'deal_rent', fallback: 'ქირავდება', href: searchHref({ dealType: ['rent'] }) },
      { key: 'deal_mortgage', fallback: 'გირავდება', href: searchHref({ dealType: ['mortgage'] }) },
    ],
  },
  {
    labelKey: 'type',
    labelFallback: 'ტიპი',
    items: [
      { key: 'apartment', fallback: 'ბინა', href: searchHref({ type: ['apartment'] }) },
      { key: 'house', fallback: 'კერძო სახლი', href: searchHref({ type: ['house'] }) },
      { key: 'commercial', fallback: 'კომერციული', href: searchHref({ type: ['commercial'] }) },
      { key: 'has3d', fallback: '3D აქვს', href: searchHref({ has3d: 'true' }) },
    ],
  },
  {
    labelKey: 'city',
    labelFallback: 'ქალაქი',
    items: [
      { key: 'region_tbilisi', fallback: 'თბილისი', href: searchHref({ city: 'თბილისი' }) },
      { key: 'footer_city_batumi', fallback: 'ბათუმი', href: searchHref({ city: 'ბათუმი' }) },
    ],
  },
];

const SITE_LINKS: FooterLink[] = [
  { key: 'map', fallback: 'რუკა', href: '/map' },
  { key: 'upload', fallback: 'განცხადების დამატება', href: '/upload' },
  { key: 'agents', fallback: 'აგენტები', href: '/agents' },
  { key: 'mortgageCalculator', fallback: 'იპოთეკის კალკულატორი', href: '/mortgage-calculator' },
  { key: 'services_nav', fallback: 'მომსახურება', href: '/services' },
  { key: 'faq_nav', fallback: 'FAQ', href: '/faq' },
  { key: 'about_nav', fallback: 'შესახებ', href: '/about' },
];

const SOCIAL_NAME: Record<SiteSocialNetwork, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

const SOCIAL_BTN: Record<SiteSocialNetwork, string> = {
  facebook: 'bg-[#1877F2]',
  instagram: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]',
  twitter: 'bg-black',
  whatsapp: 'bg-[#25D366]',
  telegram: 'bg-[#229ED9]',
  youtube: 'bg-[#FF0000]',
  tiktok: 'bg-black',
  linkedin: 'bg-[#0A66C2]',
};

function SocialGlyph({ network }: { network: SiteSocialNetwork }) {
  const common = { className: 'h-4 w-4', fill: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': true as const };
  if (network === 'facebook') {
    return (
      <svg {...common}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }
  if (network === 'instagram') {
    return (
      <svg {...common}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    );
  }
  if (network === 'youtube') {
    return (
      <svg {...common}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (network === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.91-1.81 2.5-5.5 3.55-8.64 2.65-3.06-.86-5.28-3.18-5.85-6.27-.16-.81-.16-1.64-.16-2.47 0-3.23 2.18-6.16 5.32-7.05 1.08-.3 2.2-.28 3.28-.08.01 1.48-.04 2.96-.04 4.44-.65-.21-1.35-.27-2.02-.08-1.58.48-2.69 2.08-2.69 3.71 0 2.31 1.87 4.17 4.18 4.17 2.13 0 3.83-1.7 3.83-3.83.02-3.41-.01-6.83.02-10.24z" />
      </svg>
    );
  }
  if (network === 'whatsapp') {
    return (
      <svg {...common}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    );
  }
  if (network === 'telegram') {
    return (
      <svg {...common}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    );
  }
  if (network === 'twitter') {
    return (
      <svg {...common}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ContactIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: 'var(--theme-accent)' }} aria-hidden>
      {children}
    </span>
  );
}

const iconSvg = 'h-[18px] w-[18px]';

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
      <span className="h-4 w-1 rounded-full" style={{ backgroundColor: 'var(--theme-accent)' }} aria-hidden />
      {children}
    </h2>
  );
}

const pillClass =
  'inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';

const siteLinkClass =
  'block rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-white hover:text-[var(--theme-accent)] dark:text-zinc-300 dark:hover:bg-zinc-900';

export function Footer() {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const design = useHomeDesignOptional();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);
  const socials = configuredSiteSocials(design?.layout.socialLinks ?? EMPTY_SITE_SOCIAL_LINKS);

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--theme-accent), transparent)' }} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <Link href="/" className="inline-flex items-center gap-2.5 text-slate-900 no-underline dark:text-zinc-100">
            <BrandLogo sizePx={40} decorative />
            <span className="text-xl font-semibold tracking-tight">Vhome</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            {tx(
              'footer_blurb',
              'Vhome არის უძრავი ქონების პლატფორმა საქართველოში — განცხადებები, რუკა და 3D ტურები.'
            )}
          </p>

          <h2 className="mt-6 text-sm font-semibold text-slate-900 dark:text-zinc-100">
            {tx('footer_col_contact', 'კონტაქტი')}
          </h2>
          <ul className="mt-3 space-y-1.5">
            <li>
              <a
                href={SITE_WEB_HREF}
                className="flex items-center gap-2 text-sm font-medium text-slate-800 no-underline hover:text-[var(--theme-accent)] dark:text-zinc-100"
              >
                <ContactIcon>
                  <svg className={iconSvg} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </ContactIcon>
                {SITE_WEB_DISPLAY}
              </a>
            </li>
            <li>
              <a
                href={`tel:${SITE_PHONE_TEL}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-800 no-underline hover:text-[var(--theme-accent)] dark:text-zinc-100"
              >
                <ContactIcon>
                  <svg className={iconSvg} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </ContactIcon>
                {SITE_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-800 no-underline hover:text-[var(--theme-accent)] dark:text-zinc-100"
              >
                <ContactIcon>
                  <svg className={iconSvg} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </ContactIcon>
                {SITE_EMAIL}
              </a>
            </li>
          </ul>

          {socials.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map(({ network, href }) => (
                <li key={network}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_NAME[network]}
                    title={SOCIAL_NAME[network]}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white no-underline shadow-sm transition hover:brightness-110 ${SOCIAL_BTN[network]}`}
                  >
                    <SocialGlyph network={network} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label={tx('footer_col_search', 'ძიება')} className="lg:col-span-5">
          <ColumnTitle>{tx('footer_col_search', 'ძიება')}</ColumnTitle>
          <div className="mt-4 space-y-4">
            {SEARCH_GROUPS.map((group) => (
              <div key={group.labelKey}>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">
                  {tx(group.labelKey, group.labelFallback)}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={pillClass}>
                        {tx(item.key, item.fallback)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <nav aria-label={tx('footer_col_site', 'საიტი')} className="lg:col-span-3">
          <ColumnTitle>{tx('footer_col_site', 'საიტი')}</ColumnTitle>
          <ul className="mt-4 space-y-0.5">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={siteLinkClass}>
                  {tx(item.key, item.fallback)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-4 text-sm text-slate-500 dark:text-zinc-500">
          © {new Date().getFullYear()} Vhome
        </div>
      </div>
    </footer>
  );
}
