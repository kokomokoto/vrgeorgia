import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SITE_META } from '@/lib/seoI18n';
import { isNoIndexHost } from '@/lib/siteUrl';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const meta = SITE_META[lang];
  return {
    alternates: buildLanguageAlternates('/', lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: meta.title,
      description: meta.description,
      path: '/',
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
