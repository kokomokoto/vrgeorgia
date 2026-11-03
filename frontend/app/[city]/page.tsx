import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  LANDING_DEALS,
  LANDING_TYPES,
  cityHubPath,
  cityHubText,
  districtsOfCity,
  findLandingCity,
  fmtUsd,
  landingPath,
  type LandingCity,
} from '@/lib/landingPages';
import { fetchListingStatsServer, fetchListingsServer } from '@/lib/serverListings';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph, SEO_WORDS } from '@/lib/seoI18n';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { localizePath, type SiteLang } from '@/lib/siteLang';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildListingItemListJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';
import { PropertyCard } from '@/components/PropertyCard';

type Params = Promise<{ city: string }>;

async function loadHub(city: LandingCity, lang: SiteLang) {
  const base = { city: city.cityKa };
  const [all, sale, rent, latest] = await Promise.all([
    fetchListingStatsServer(base),
    fetchListingStatsServer({ ...base, dealType: JSON.stringify(['sale']) }),
    fetchListingStatsServer({ ...base, dealType: JSON.stringify(['rent']) }),
    fetchListingsServer({ ...base, priceType: 'total', sort: 'date_desc', lang, page: 1, limit: 12 }, { revalidate: 300 }),
  ]);
  return { all, sale, rent, latest: latest.properties };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  const c = findLandingCity(city);
  if (!c) return { robots: { index: false, follow: false } };
  const lang = await getRequestLang();
  const text = cityHubText(c, lang);
  const path = cityHubPath(c);
  return {
    title: { absolute: text.title },
    description: text.description,
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, { title: text.title, description: text.description, path, images: [DEFAULT_OG_IMAGE] }),
  };
}

const UI = {
  total: { ka: 'აქტიური განცხადება', en: 'active listings', ru: 'активных объявлений' },
  saleMedian: { ka: 'მედიანური ფასი (გაყიდვა)', en: 'Median price (sale)', ru: 'Медианная цена (продажа)' },
  rentMedian: { ka: 'მედიანური ქირა / თვე', en: 'Median rent / month', ru: 'Медианная аренда / мес' },
  sqm: { ka: 'მედიანა 1 მ² (გაყიდვა)', en: 'Median per m² (sale)', ru: 'Медиана за 1 м² (продажа)' },
  latest: { ka: 'ბოლო განცხადებები', en: 'Latest listings', ru: 'Последние объявления' },
  map: { ka: 'რუკაზე ნახვა', en: 'Open on the map', ru: 'Открыть на карте' },
} as const;

/** /tbilisi — city hub linking every type × deal segment and district. */
export default async function CityHubPage({ params }: { params: Params }) {
  const { city } = await params;
  const c = findLandingCity(city);
  if (!c) notFound();
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const text = cityHubText(c, lang);
  const { all, sale, rent, latest } = await loadHub(c, lang);
  const site = getSiteUrl();
  const L = (p: string) => localizePath(p, lang);
  const pageUrl = `${site}${L(cityHubPath(c))}`;
  const districts = districtsOfCity(c.slug);

  const jsonLd = [
    buildCollectionPageJsonLd({ url: pageUrl, name: text.h1, description: text.description, lang }),
    buildBreadcrumbJsonLd([
      { name: SEO_WORDS.home[lang], url: `${site}${L('/')}` },
      { name: c.name[lang], url: pageUrl },
    ]),
    ...(latest.length ? [buildListingItemListJsonLd(pageUrl, text.h1, latest, lang)] : []),
  ];

  return (
    <article className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />
      ))}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">{text.h1}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700 dark:text-zinc-300">{text.intro}</p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Market statistics">
        {[
          [String(all?.count ?? 0), UI.total[lang]],
          [fmtUsd(sale?.price.median), UI.saleMedian[lang]],
          [fmtUsd(rent?.price.median), UI.rentMedian[lang]],
          [fmtUsd(sale?.pricePerSqm.median), UI.sqm[lang]],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{v}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-400">{l}</div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-zinc-50">{text.segmentsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LANDING_DEALS.map((deal) => (
            <div key={deal.slug} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="mb-2 font-semibold capitalize text-slate-900 dark:text-zinc-50">{deal.label[lang]}</h3>
              <ul className="space-y-1 text-sm">
                {LANDING_TYPES.map((t) => (
                  <li key={t.slug}>
                    <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(c, t, deal))}>
                      {t.plural[lang]} {deal.label[lang]} {c.inName[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {districts.length ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-zinc-50">{text.districtsTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {districts.map((d) => (
              <div key={d.slug} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{d.name[lang]}</h3>
                <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-zinc-400">{d.blurb[lang]}</p>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {LANDING_DEALS.map((deal) => (
                    <li key={deal.slug}>
                      <Link className="text-blue-700 hover:underline dark:text-blue-400" href={L(landingPath(c, LANDING_TYPES[0], deal, d))}>
                        {LANDING_TYPES[0].plural[lang]} {deal.label[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {latest.length ? (
        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-50">{UI.latest[lang]}</h2>
            <Link
              href={L(`/map?city=${encodeURIComponent(c.cityKa)}&region=${c.region}`)}
              className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              {UI.map[lang]} →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latest.map((p, i) => (
              <PropertyCard key={p._id} p={p} compactPhoto priority={i < 4} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
