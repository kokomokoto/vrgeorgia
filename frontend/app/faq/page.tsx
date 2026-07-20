import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQ_ITEMS } from '@/lib/faqContent';
import { SITE_URL, buildFaqPageJsonLd, jsonLdScript } from '@/lib/structuredData';

export const metadata: Metadata = {
  title: 'ხშირად დასმული კითხვები (FAQ)',
  description:
    'პასუხები VR Georgia-ზე: როგორ ვიპოვოთ ბინა ან სახლი, რა არის VR ტური, როგორ დავუკავშირდეთ აგენტს, ფასები და მიწის სტატუსი.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: 'FAQ — VR Georgia',
    description: 'ხშირად დასმული კითხვები უძრავი ქონების ძიებაზე საქართველოში.',
    url: `${SITE_URL}/faq`,
    siteName: 'VR Georgia',
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
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900 dark:text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />

      <nav aria-label="breadcrumb" className="mb-6 text-sm text-slate-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-blue-600 dark:hover:text-amber-400">
              მთავარი
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-slate-800 dark:text-zinc-200">FAQ</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-amber-400">
        ხშირად დასმული კითხვები
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-zinc-300">
        მოკლე პასუხები VR Georgia-ს გამოყენებაზე — ძიება, აგენტები, ვირტუალური ტურები და განცხადებები.
      </p>

      <div className="mt-8 space-y-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.id}
            id={item.id}
            className="group rounded-xl border border-slate-200 bg-white open:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <summary className="cursor-pointer list-none px-4 py-3.5 text-left text-base font-semibold text-slate-900 marker:content-none dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                <span>{item.question.ka}</span>
                <span className="shrink-0 text-slate-400 transition group-open:rotate-180">▼</span>
              </span>
            </summary>
            <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
              <p>{item.answer.ka}</p>
              <p className="mt-3 text-slate-500 dark:text-zinc-400" lang="en">
                <span className="font-medium text-slate-600 dark:text-zinc-300">{item.question.en}</span>
                <br />
                {item.answer.en}
              </p>
            </div>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-slate-500 dark:text-zinc-400">
        მეტი ინფორმაცია:{' '}
        <Link href="/about" className="text-blue-600 hover:underline dark:text-amber-400">
          საიტის შესახებ
        </Link>
        {' · '}
        <Link href="/map" className="text-blue-600 hover:underline dark:text-amber-400">
          რუკაზე ძებნა
        </Link>
        {' · '}
        <Link href="/agents" className="text-blue-600 hover:underline dark:text-amber-400">
          აგენტები
        </Link>
      </p>
    </main>
  );
}
