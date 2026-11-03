import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONTACT, SITE_SOCIAL_PROFILE_URLS } from '@/lib/siteContact';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';
import { jsonLdScript } from '@/lib/structuredData';

const COPY = {
  ka: {
    h1: 'კონტაქტი',
    lead: 'Vhome — უძრავი ქონების პლატფორმა საქართველოში. დაგვიკავშირდით განცხადების, 3D ტურის ან პარტნიორობის საკითხზე.',
    hours: 'სამუშაო საათები',
    hoursValue: 'ნებისმიერ დროს',
    address: 'მისამართი',
    social: 'სოციალური ქსელები',
    email: 'ელ-ფოსტა',
    phone: 'ტელეფონი',
  },
  en: {
    h1: 'Contact',
    lead: 'Vhome is a real-estate marketplace in Georgia. Reach us about listings, 3D tours or partnerships.',
    hours: 'Hours',
    hoursValue: 'Any time',
    address: 'Address',
    social: 'Social profiles',
    email: 'Email',
    phone: 'Phone',
  },
  ru: {
    h1: 'Контакты',
    lead: 'Vhome — рынок недвижимости в Грузии. Пишите по объявлениям, 3D-турам и партнёрству.',
    hours: 'Часы работы',
    hoursValue: 'В любое время',
    address: 'Адрес',
    social: 'Соцсети',
    email: 'Email',
    phone: 'Телефон',
  },
} as const;

const SOCIAL_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

function socialLabel(href: string): string {
  const host = href.toLowerCase();
  if (host.includes('youtube')) return SOCIAL_LABEL.youtube;
  if (host.includes('tiktok')) return SOCIAL_LABEL.tiktok;
  if (host.includes('instagram')) return SOCIAL_LABEL.instagram;
  if (host.includes('facebook')) return SOCIAL_LABEL.facebook;
  return href.replace(/^https?:\/\//, '');
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const c = COPY[lang];
  const path = '/contact';
  return {
    title: { absolute: `${c.h1} | Vhome` },
    description: c.lead,
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: c.h1,
      description: c.lead,
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default async function ContactPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const c = COPY[lang];
  const site = getSiteUrl();
  const pageUrl = `${site}${localizePath('/contact', lang)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': pageUrl,
    url: pageUrl,
    name: c.h1,
    description: c.lead,
    inLanguage: lang,
    isPartOf: { '@id': `${site}/#website` },
    about: { '@id': `${site}/#organization` },
    mainEntity: {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      email: SITE_CONTACT.email,
      telephone: SITE_CONTACT.phoneE164,
    },
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 text-slate-800 dark:text-zinc-200">
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-50">{c.h1}</h1>
      <p className="mt-4 text-[15px] leading-relaxed">{c.lead}</p>

      <ul className="mt-8 space-y-4 text-[15px]">
        <li>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.email}</div>
          <a className="text-blue-700 hover:underline dark:text-blue-400" href={`mailto:${SITE_CONTACT.email}`}>
            {SITE_CONTACT.email}
          </a>
        </li>
        <li>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.phone}</div>
          <a className="text-blue-700 hover:underline dark:text-blue-400" href={`tel:${SITE_CONTACT.phoneE164}`}>
            {SITE_CONTACT.phoneDisplay}
          </a>
        </li>
        <li>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.hours}</div>
          <p>{c.hoursValue}</p>
        </li>
        <li>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.address}</div>
          <p>
            {lang === 'ka' ? SITE_CONTACT.cityKa : SITE_CONTACT.city}, {lang === 'ru' ? 'Грузия' : lang === 'en' ? 'Georgia' : 'საქართველო'}
          </p>
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-slate-900 dark:text-zinc-50">{c.social}</h2>
      <ul className="mt-3 flex flex-wrap gap-4 text-sm">
        {SITE_SOCIAL_PROFILE_URLS.map((href) => (
          <li key={href}>
            <a
              className="text-blue-700 hover:underline dark:text-blue-400"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {socialLabel(href)}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-slate-500">
        <Link href={localizePath('/privacy', lang)} className="hover:underline">
          {SEO_WORDS.privacy[lang]}
        </Link>
        {' · '}
        <Link href={localizePath('/terms', lang)} className="hover:underline">
          {SEO_WORDS.terms[lang]}
        </Link>
      </p>
    </article>
  );
}
