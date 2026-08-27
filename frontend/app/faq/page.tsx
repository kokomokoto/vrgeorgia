import type { Metadata } from 'next';
import { FAQ_ITEMS } from '@/lib/faqContent';
import { SITE_URL, buildFaqPageJsonLd, jsonLdScript } from '@/lib/structuredData';
import { FaqPageClient } from '@/components/FaqPageClient';

export const metadata: Metadata = {
  title: 'ხშირად დასმული კითხვები (FAQ)',
  description:
    'პასუხები VR Georgia-ზე: როგორ ვიპოვოთ ბინა ან სახლი, რა არის VR ტური, როგორ დავუკავშირდეთ აგენტს, ფასები და მიწის სტატუსი.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: 'FAQ — Vhome',
    description: 'ხშირად დასმული კითხვები უძრავი ქონების ძიებაზე საქართველოში.',
    url: `${SITE_URL}/faq`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function FaqPage() {
  const kaItems = FAQ_ITEMS.map((item) => ({
    question: item.question.ka,
    answer: item.answer.ka,
  }));
  const faqJsonLd = buildFaqPageJsonLd(kaItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />
      <FaqPageClient />
    </>
  );
}
