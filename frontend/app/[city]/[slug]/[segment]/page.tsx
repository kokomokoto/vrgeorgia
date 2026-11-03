import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  findLandingCity,
  findLandingDistrict,
  parseLandingSegment,
  type LandingSegment,
} from '@/lib/landingPages';
import { landingSegmentMetadata, loadLandingSegment } from '@/lib/landingRoute';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { LandingSegmentPage } from '@/components/landing/LandingSegmentPage';

type Params = Promise<{ city: string; slug: string; segment: string }>;

/** `slug` = district, `segment` = "<type>-<deal>". */
function resolve(city: string, slug: string, segment: string): LandingSegment | null {
  const c = findLandingCity(city);
  const d = findLandingDistrict(city, slug);
  const parsed = parseLandingSegment(segment);
  if (!c || !d || !parsed) return null;
  return { city: c, district: d, type: parsed.type, deal: parsed.deal };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city, slug, segment } = await params;
  const seg = resolve(city, slug, segment);
  if (!seg) return { robots: { index: false, follow: false } };
  return landingSegmentMetadata(seg, await getRequestLang());
}

/** /tbilisi/saburtalo/apartments-for-sale — district landing page (SSR). */
export default async function DistrictSegmentPage({ params }: { params: Params }) {
  const { city, slug, segment } = await params;
  const seg = resolve(city, slug, segment);
  if (!seg) notFound();
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const { stats, listings } = await loadLandingSegment(seg, lang);
  return <LandingSegmentPage seg={seg} lang={lang} stats={stats} listings={listings} nonce={nonce} />;
}
