import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, buildAboutPageJsonLd, jsonLdScript } from '@/lib/structuredData';

export const metadata: Metadata = {
  title: 'საიტის შესახებ',
  description:
    'რა არის VR Georgia: უძრავი ქონების ძიება საქართველოში, რუკა, აგენტები და ვირტუალური ტურები.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'VR Georgia-ს შესახებ',
    description: 'უძრავი ქონების პლატფორმა საქართველოში — ძიება, რუკა, VR ტურები, აგენტები.',
    url: `${SITE_URL}/about`,
    siteName: 'VR Georgia',
    locale: 'ka_GE',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-900 dark:text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildAboutPageJsonLd()) }}
      />

      <nav aria-label="breadcrumb" className="mb-6 text-sm text-slate-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-blue-600 dark:hover:text-amber-400">
              მთავარი
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-slate-800 dark:text-zinc-200">შესახებ</li>
        </ol>
      </nav>

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-amber-400">
          რა არის VR Georgia?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-zinc-300">
          VR Georgia არის ონლაინ პლატფორმა უძრავი ქონების მოსაძებნად საქართველოში. აქ
          იკრიბება განცხადებები ბინებზე, სახლებზე, მიწაზე, კომერციულ ფართებსა და სხვა
          ტიპებზე — რუკით, ფილტრებით და ხშირად ვირტუალური / 3D ტურებით.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-100">
          რას ნახავთ საიტზე
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700 dark:text-zinc-300">
          <li>
            <Link href="/" className="text-blue-600 hover:underline dark:text-amber-400">
              მთავარი ძიება
            </Link>{' '}
            — ტიპი, ფასი, ფართობი, ქალაქი/უბანი
          </li>
          <li>
            <Link href="/map" className="text-blue-600 hover:underline dark:text-amber-400">
              რუკა
            </Link>{' '}
            — ობიექტები გეოგრაფიულად
          </li>
          <li>
            <Link href="/agents" className="text-blue-600 hover:underline dark:text-amber-400">
              აგენტები
            </Link>{' '}
            — პროფილები და მათი განცხადებები
          </li>
          <li>
            <Link href="/services" className="text-blue-600 hover:underline dark:text-amber-400">
              მომსახურება
            </Link>{' '}
            — არქიტექტურა და დიზაინი
          </li>
          <li>
            <Link href="/faq" className="text-blue-600 hover:underline dark:text-amber-400">
              FAQ
            </Link>{' '}
            — ხშირად დასმული კითხვები
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-100">
          ვისთვისაა
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-zinc-300">
          მყიდველებისა და დამქირავებლებისთვის — სწრაფი ძიება და ვიზუალური მიმოხილვა.
          აგენტებისა და მფლობელებისთვის — განცხადებების განთავსება და კონტაქტი
          დაინტერესებულ პირებთან.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900 dark:text-zinc-100" lang="en">
          About VR Georgia (English)
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-zinc-300" lang="en">
          VR Georgia is a real-estate marketplace for Georgia (Sakartvelo). Search apartments,
          houses, land and commercial listings with map filters and optional VR/3D tours. Browse
          agents, open a listing page for details and contact information, or start from the map
          view to explore by location.
        </p>
      </article>
    </main>
  );
}
