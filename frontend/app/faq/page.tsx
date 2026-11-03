import type { Metadata } from 'next';
import { FAQ_ITEMS } from '@/lib/faqContent';
import { buildFaqPageJsonLd, jsonLdScript } from '@/lib/structuredData';
import { FaqPageClient } from '@/components/FaqPageClient';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';

const DESC = {
  ka: 'პასუხები Vhome-ზე: როგორ ვიპოვოთ ბინა ან სახლი თბილისში, რა არის 3D ტური, როგორ დავუკავშირდეთ აგენტს, ფასები და მიწის სტატუსი.',
  en: 'Answers about Vhome: finding an apartment or house in Tbilisi, what a 3D tour is, contacting agents, prices and land status.',
  ru: 'Ответы о Vhome: как найти квартиру или дом в Тбилиси, что такое 3D-тур, как связаться с агентом, цены и статус земли.',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const path = '/faq';
  return {
    title: { absolute: `${SEO_WORDS.faq[lang]} | Vhome` },
    description: DESC[lang],
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: SEO_WORDS.faq[lang],
      description: DESC[lang],
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export default async function FaqPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const items = FAQ_ITEMS.map((item) => ({
    question: item.question[lang],
    answer: item.answer[lang],
  }));
  const pageUrl = `${getSiteUrl()}${localizePath('/faq', lang)}`;
  const faqJsonLd = buildFaqPageJsonLd(items, pageUrl);

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />
      <FaqPageClient />
    </>
  );
}
