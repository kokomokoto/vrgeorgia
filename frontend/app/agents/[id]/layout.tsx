import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import {
  SITE_URL,
  buildAgentJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

type AgentSeo = {
  _id: string;
  name?: string;
  photo?: string;
  company?: string;
  bio?: { ka?: string };
  areas?: string[];
  avgRating?: number;
  totalReviews?: number;
  phone?: string;
  email?: string;
};

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

async function fetchAgentForSeo(id: string): Promise<AgentSeo | null> {
  try {
    const res = await fetch(`${apiBase()}/api/agents/${encodeURIComponent(id)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AgentSeo;
    if (!data?._id) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const site = getSiteUrl();
  const agent = await fetchAgentForSeo(id);

  if (!agent) {
    const url = `${site}/agents/${id}`;
    return {
      title: 'აგენტი ვერ მოიძებნა',
      description: 'ეს აგენტის პროფილი აღარ არის ხელმისაწვდომი ან წაშლილია.',
      alternates: { canonical: url },
      robots: { index: false, follow: false },
      openGraph: {
        title: 'აგენტი ვერ მოიძებნა | Vhome',
        description: 'ეს აგენტის პროფილი აღარ არის ხელმისაწვდომი.',
        url,
        siteName: 'Vhome',
        locale: 'ka_GE',
        type: 'profile',
      },
    };
  }

  const canonicalId = String(agent._id);
  const name = agent.name?.trim() || agent.company?.trim() || 'აგენტი';
  const description = `${name} — უძრავი ქონების აგენტი საქართველოში. განცხადებები და კონტაქტი Vhome-ზე.`;
  const url = `${site}/agents/${canonicalId}`;
  const image = agent.photo
    ? { url: agent.photo, alt: name }
    : DEFAULT_OG_IMAGE;

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} | Vhome`,
      description,
      url,
      siteName: 'Vhome',
      locale: 'ka_GE',
      type: 'profile',
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default async function AgentDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const agent = await fetchAgentForSeo(id);
  const jsonLdBlocks: unknown[] = [];

  if (agent) {
    const name = agent.name?.trim() || agent.company?.trim() || 'აგენტი';
    const pageUrl = `${SITE_URL}/agents/${agent._id}`;
    jsonLdBlocks.push(buildAgentJsonLd(agent));
    jsonLdBlocks.push(
      buildBreadcrumbJsonLd([
        { name: 'მთავარი', url: SITE_URL },
        { name: 'აგენტები', url: `${SITE_URL}/agents` },
        { name: name, url: pageUrl },
      ])
    );
  }

  return (
    <>
      {jsonLdBlocks.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
        />
      ))}
      {children}
    </>
  );
}
