import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  findLandingCity,
  findLandingDistrict,
  parseLandingSegment,
  segmentSlug,
  type LandingSegment,
} from '@/lib/landingPages';
import {
  landingSegmentMetadata,
  loadLandingSegment,
  redirectIfLandingEmpty,
} from '@/lib/landingRoute';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { localizePath } from '@/lib/siteLang';
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
  // Misspelled district slug in the URL → canonical district path.
  if (seg.district && seg.district.slug !== slug.toLowerCase()) {
    permanentRedirect(
      localizePath(`/${city}/${seg.district.slug}/${segmentSlug(seg.type, seg.deal)}`, lang)
    );
  }
  const { stats, listings } = await loadLandingSegment(seg, lang);
  redirectIfLandingEmpty(seg, stats, lang);
  return <LandingSegmentPage seg={seg} lang={lang} stats={stats} listings={listings} nonce={nonce} />;
}
