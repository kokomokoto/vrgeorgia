import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

async function fetchAgentName(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase()}/api/agents/${encodeURIComponent(id)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; company?: string };
    return data.name?.trim() || data.company?.trim() || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const site = getSiteUrl();
  const name = await fetchAgentName(id);
  const title = name || 'აგენტი';
  const description = name
    ? `${name} — უძრავი ქონების აგენტი საქართველოში. განცხადებები და კონტაქტი Vhome-ზე.`
    : 'უძრავი ქონების აგენტის პროფილი საქართველოში — განცხადებები და კონტაქტი.';
  const url = `${site}/agents/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Vhome`,
      description,
      url,
      siteName: 'Vhome',
      locale: 'ka_GE',
      type: 'profile',
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

export default function AgentDetailLayout({ children }: LayoutProps) {
  return children;
}
