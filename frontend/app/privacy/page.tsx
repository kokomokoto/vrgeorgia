import type { Metadata } from 'next';
import { LegalDocView } from '@/components/LegalDocView';
import { PRIVACY } from '@/lib/legalContent';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph } from '@/lib/seoI18n';
import { isNoIndexHost } from '@/lib/siteUrl';
import { jsonLdScript, SITE_URL } from '@/lib/structuredData';
import { localizePath } from '@/lib/siteLang';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const doc = PRIVACY[lang];
  const path = '/privacy';
  return {
    title: { absolute: `${doc.title} | Vhome` },
    description: doc.intro.slice(0, 160),
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: doc.title,
      description: doc.intro.slice(0, 160),
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default async function PrivacyPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const doc = PRIVACY[lang];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PrivacyPolicy',
    name: doc.title,
    url: `${SITE_URL}${localizePath('/privacy', lang)}`,
    inLanguage: lang,
  };
  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <LegalDocView doc={doc} />
    </>
  );
}
