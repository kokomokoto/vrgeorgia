import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { isNoIndexHost } from '@/lib/siteUrl';

const DESC = {
  ka: 'იპოვეთ უძრავი ქონება საქართველოში რუკაზე: ბინები, სახლები, მიწა და კომერციული ფართები თბილისში, ბათუმსა და სხვა ქალაქებში.',
  en: 'Find real estate in Georgia on the map: apartments, houses, land and commercial space in Tbilisi, Batumi and beyond.',
  ru: 'Найдите недвижимость в Грузии на карте: квартиры, дома, земля и коммерция в Тбилиси, Батуми и других городах.',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const title = `${SEO_WORDS.map[lang]} — ${SEO_WORDS.realEstateGeorgia[lang]}`;
  const path = '/map';
  return {
    title: { absolute: `${title} | Vhome` },
    description: DESC[lang],
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title,
      description: DESC[lang],
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
