import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findLandingCity, parseLandingSegment, type LandingSegment } from '@/lib/landingPages';
import { landingSegmentMetadata, loadLandingSegment } from '@/lib/landingRoute';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { LandingSegmentPage } from '@/components/landing/LandingSegmentPage';

type Params = Promise<{ city: string; slug: string }>;

/** `slug` here is the "<type>-<deal>" segment, e.g. apartments-for-sale. */
function resolve(city: string, slug: string): LandingSegment | null {
  const c = findLandingCity(city);
  const parsed = parseLandingSegment(slug);
  if (!c || !parsed) return null;
  return { city: c, district: null, type: parsed.type, deal: parsed.deal };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city, slug } = await params;
  const seg = resolve(city, slug);
  if (!seg) return { robots: { index: false, follow: false } };
  return landingSegmentMetadata(seg, await getRequestLang());
}

/** /tbilisi/apartments-for-sale — city × type × deal landing page (SSR). */
export default async function CitySegmentPage({ params }: { params: Params }) {
  const { city, slug } = await params;
  const seg = resolve(city, slug);
  if (!seg) notFound();
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const { stats, listings } = await loadLandingSegment(seg, lang);
  return <LandingSegmentPage seg={seg} lang={lang} stats={stats} listings={listings} nonce={nonce} />;
}
