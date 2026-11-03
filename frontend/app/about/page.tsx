import type { Metadata } from 'next';
import { buildAboutPageJsonLd, jsonLdScript } from '@/lib/structuredData';
import { AboutPageClient } from '@/components/AboutPageClient';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { isNoIndexHost } from '@/lib/siteUrl';

const DESC = {
  ka: 'Vhome — უძრავი ქონების პლატფორმა საქართველოში: ბინები და სახლები, რუკა, აგენტები და 3D ტურები, მათ შორის Gaussian Splatting.',
  en: 'Vhome is a real-estate marketplace in Georgia: apartments and houses, map search, agents and 3D tours including Gaussian splatting.',
  ru: 'Vhome — рынок недвижимости в Грузии: квартиры и дома, карта, агенты и 3D-туры, включая Gaussian Splatting.',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const path = '/about';
  return {
    title: { absolute: `${SEO_WORDS.about[lang]} | Vhome` },
    description: DESC[lang],
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: SEO_WORDS.about[lang],
      description: DESC[lang],
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default async function AboutPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildAboutPageJsonLd(lang)) }}
      />
      <AboutPageClient />
    </>
  );
}
