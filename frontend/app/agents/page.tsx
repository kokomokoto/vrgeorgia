import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveImageUrl, type Agent } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { buildLanguageAlternates, localizedOpenGraph } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';
import { jsonLdScript } from '@/lib/structuredData';

const COPY = {
  ka: {
    h1: 'უძრავი ქონების აგენტები საქართველოში',
    lead: 'სანდო აგენტები თბილისში, ბათუმსა და სხვა ქალაქებში — პროფილები, რეიტინგი და მათი განცხადებები Vhome-ზე.',
    empty: 'ამ მომენტში საჯარო აგენტი არ არის.',
    reviews: 'შეფასება',
    years: 'წელი გამოცდილება',
  },
  en: {
    h1: 'Real-estate agents in Georgia',
    lead: 'Trusted agents in Tbilisi, Batumi and beyond — profiles, ratings and their listings on Vhome.',
    empty: 'No public agents at the moment.',
    reviews: 'reviews',
    years: 'years of experience',
  },
  ru: {
    h1: 'Агенты по недвижимости в Грузии',
    lead: 'Проверенные агенты в Тбилиси, Батуми и других городах — профили, рейтинг и их объявления на Vhome.',
    empty: 'Сейчас нет публичных агентов.',
    reviews: 'оценок',
    years: 'лет опыта',
  },
} as const;

async function fetchAgentsServer(): Promise<Agent[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents?limit=100&page=1`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { agents?: Agent[] };
    return Array.isArray(data.agents) ? data.agents : [];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const c = COPY[lang];
  const path = '/agents';
  return {
    title: { absolute: `${c.h1} | Vhome` },
    description: c.lead,
    alternates: buildLanguageAlternates(path, lang),
    robots: isNoIndexHost() ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: localizedOpenGraph(lang, {
      title: c.h1,
      description: c.lead,
      path,
      images: [DEFAULT_OG_IMAGE],
    }),
  };
}

export const revalidate = 300;

export default async function AgentsPage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const agents = await fetchAgentsServer();
  const c = COPY[lang];
  const site = getSiteUrl();
  const L = (p: string) => localizePath(p, lang);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: c.h1,
    url: `${site}${L('/agents')}`,
    numberOfItems: agents.length,
    itemListElement: agents.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site}${L(`/agents/${a._id}`)}`,
      name: a.name,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-zinc-950">
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">{c.h1}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-zinc-400">{c.lead}</p>

        {agents.length === 0 ? (
          <p className="py-20 text-center text-slate-500">{c.empty}</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent._id}
                href={L(`/agents/${agent._id}`)}
                className="rounded-xl border border-slate-200 bg-white p-6 no-underline transition-shadow hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                    {agent.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveImageUrl(agent.photo)} alt={agent.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400" aria-hidden>
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-zinc-50">{agent.name}</h2>
                    {agent.company ? <p className="mt-1 text-sm text-slate-500">{agent.company}</p> : null}
                    <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                      {agent.avgRating ? `${agent.avgRating.toFixed(1)} · ` : ''}
                      {agent.totalReviews} {c.reviews}
                    </p>
                    {agent.experience > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {agent.experience} {c.years}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
