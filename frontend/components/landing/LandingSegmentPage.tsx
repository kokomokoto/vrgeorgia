import Link from 'next/link';
import type { SiteLang } from '@/lib/siteLang';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl } from '@/lib/siteUrl';
import {
  LANDING_DEALS,
  LANDING_TYPES,
  type LandingSegment,
  type LandingStats,
  cityHubPath,
  districtsOfCity,
  fmtUsd,
  landingDescription,
  landingFaq,
  landingH1,
  landingIntro,
  landingPath,
  landingSearchHref,
} from '@/lib/landingPages';
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildListingItemListJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';
import { SEO_WORDS } from '@/lib/seoI18n';
import { PropertyCard } from '@/components/PropertyCard';
import { formatListedDay } from '@/lib/propertyDisplay';
import type { Property } from '@/lib/types';

const UI = {
  listings: { ka: 'აქტიური განცხადება', en: 'active listings', ru: 'активных объявлений' },
  median: { ka: 'მედიანური ფასი', en: 'Median price', ru: 'Медианная цена' },
  perSqm: { ka: 'მედიანა 1 მ²', en: 'Median per m²', ru: 'Медиана за 1 м²' },
  range: { ka: 'ფასების დიაპაზონი', en: 'Price range', ru: 'Диапазон цен' },
  with3d: { ka: '3D ტურით', en: 'with 3D tour', ru: 'с 3D-туром' },
  latest: { ka: 'ბოლო განცხადებები', en: 'Latest listings', ru: 'Последние объявления' },
  viewAll: { ka: 'ყველას ნახვა რუკაზე', en: 'View all on the map', ru: 'Все объявления на карте' },
  viewAllList: { ka: 'ყველა განცხადება ფილტრებით', en: 'All listings with filters', ru: 'Все объявления с фильтрами' },
  faq: { ka: 'ხშირად დასმული კითხვები', en: 'Frequently asked questions', ru: 'Частые вопросы' },
  related: { ka: 'მსგავსი ძიებები', en: 'Related searches', ru: 'Похожие запросы' },
  districts: { ka: 'უბნების მიხედვით', en: 'By district', ru: 'По районам' },
  otherTypes: { ka: 'სხვა ტიპის ქონება', en: 'Other property types', ru: 'Другие типы недвижимости' },
  empty: {
    ka: 'ამ სეგმენტში ამჟამად აქტიური განცხადება არ არის. ნახეთ მეზობელი უბნები ან მთლიანი ქალაქი.',
    en: 'There are no active listings in this segment right now. Try neighbouring districts or the whole city.',
    ru: 'В этом сегменте сейчас нет активных объявлений. Посмотрите соседние районы или весь город.',
  },
  updated: { ka: 'განახლებულია', en: 'Updated', ru: 'Обновлено' },
  perMonth: { ka: '/თვე', en: '/mo', ru: '/мес' },
} as const;

export function LandingSegmentPage({
  seg,
  lang,
  stats,
  listings,
  nonce,
}: {
  seg: LandingSegment;
  lang: SiteLang;
  stats: LandingStats | null;
  listings: Property[];
  nonce?: string;
}) {
  const site = getSiteUrl();
  const path = landingPath(seg.city, seg.type, seg.deal, seg.district);
  const pageUrl = `${site}${localizePath(path, lang)}`;
  const h1 = landingH1(seg, lang);
  const description = landingDescription(seg, lang, stats);
  const intro = landingIntro(seg, lang, stats);
  const faq = landingFaq(seg, lang, stats);
  const isRent = seg.deal.deal === 'rent';
  const isLand = seg.type.type === 'land';
  const L = (p: string) => localizePath(p, lang);

  const typeDealName = `${seg.type.plural[lang]} ${seg.deal.label[lang]}`;
  const crumbs = [
    { name: SEO_WORDS.home[lang], url: `${site}${L('/')}` },
    { name: seg.city.name[lang], url: `${site}${L(cityHubPath(seg.city))}` },
    ...(seg.district
      ? [{ name: typeDealName, url: `${site}${L(landingPath(seg.city, seg.type, seg.deal))}` }]
      : []),
    { name: seg.district ? seg.district.name[lang] : typeDealName, url: pageUrl },
  ];

  const jsonLd = [
    buildCollectionPageJsonLd({ url: pageUrl, name: h1, description, lang }),
    buildBreadcrumbJsonLd(crumbs),
    ...(listings.length ? [buildListingItemListJsonLd(pageUrl, h1, listings, lang)] : []),
    buildFaqPageJsonLd(faq, pageUrl),
  ];

  const districts = districtsOfCity(seg.city.slug);
  const otherDeal = LANDING_DEALS.find((d) => d.deal !== seg.deal.deal)!;

  return (
    <article className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />
      ))}

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 dark:text-zinc-400">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <li key={c.url} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < crumbs.length - 1 ? (
                <Link href={c.url.replace(site, '')} className="hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-slate-700 dark:text-zinc-200">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">{h1}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-zinc-300 sm:text-base">{description}</p>
      </header>

      <section aria-label="Market statistics" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{stats?.count ?? 0}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">{UI.listings[lang]}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
            {fmtUsd(stats?.price.median)}
            {isRent && stats?.price.median ? <span className="text-sm font-medium text-slate-500">{UI.perMonth[lang]}</span> : null}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">{UI.median[lang]}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
            {isLand ? fmtUsd(stats?.price.min) + '–' + fmtUsd(stats?.price.max) : fmtUsd(stats?.pricePerSqm.median)}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">{isLand ? UI.range[lang] : UI.perSqm[lang]}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{stats?.with3d ?? 0}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">{UI.with3d[lang]}</div>
        </div>
      </section>

      <section className="prose prose-slate mb-8 max-w-none dark:prose-invert">
        {intro.map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">
            {p}
          </p>
        ))}
      </section>

      <section className="mb-8" aria-labelledby="latest-listings">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="latest-listings" className="text-xl font-semibold text-slate-900 dark:text-zinc-50">
            {UI.latest[lang]}
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={L(landingSearchHref(seg, '/map'))}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {UI.viewAll[lang]} →
            </Link>
          </div>
        </div>
        {listings.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((p, i) => (
              <PropertyCard key={p._id} p={p} compactPhoto priority={i < 4} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
            {UI.empty[lang]}
          </p>
        )}
        {stats?.newestAt ? (
          <p className="mt-2 text-xs text-slate-400">
            {UI.updated[lang]}: {formatListedDay(stats.newestAt)}
          </p>
        ) : null}
      </section>

      <section className="mb-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-3 text-xl font-semibold text-slate-900 dark:text-zinc-50">
          {UI.faq[lang]}
        </h2>
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-900">
          {faq.map((item) => (
            <details key={item.question} className="group p-4">
              <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none dark:text-zinc-50">
                {item.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-4 grid gap-6 md:grid-cols-3" aria-label={UI.related[lang]}>
        <div>
          <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-zinc-50">{UI.related[lang]}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(seg.city, seg.type, otherDeal, seg.district))}>
                {seg.type.plural[lang]} {otherDeal.label[lang]} {(seg.district ?? seg.city).inName[lang]}
              </Link>
            </li>
            {seg.district ? (
              <li>
                <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(seg.city, seg.type, seg.deal))}>
                  {seg.type.plural[lang]} {seg.deal.label[lang]} {seg.city.inName[lang]}
                </Link>
              </li>
            ) : null}
            <li>
              <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(cityHubPath(seg.city))}>
                {SEO_WORDS.realEstate[lang]} — {seg.city.name[lang]}
              </Link>
            </li>
            <li>
              <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L('/3d-tours')}>
                {SEO_WORDS.tours3d[lang]}
              </Link>
            </li>
          </ul>
        </div>
        {districts.length ? (
          <div>
            <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-zinc-50">{UI.districts[lang]}</h2>
            <ul className="columns-2 space-y-1 text-sm">
              {districts
                .filter((d) => d.slug !== seg.district?.slug)
                .map((d) => (
                  <li key={d.slug}>
                    <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(seg.city, seg.type, seg.deal, d))}>
                      {d.name[lang]}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        <div>
          <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-zinc-50">{UI.otherTypes[lang]}</h2>
          <ul className="space-y-1 text-sm">
            {LANDING_TYPES.filter((t) => t.type !== seg.type.type).map((t) => (
              <li key={t.slug}>
                <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(seg.city, t, seg.deal))}>
                  {t.plural[lang]} {seg.deal.label[lang]} {seg.city.inName[lang]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
