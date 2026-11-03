import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { canonicalPropertyPathId } from '@/lib/seoDuplicateCanonical';
import {
  buildMissingPropertyMetadata,
  buildPropertyShareMetadata,
  fetchPropertyForShareMetadata,
} from '@/lib/propertyShareMetadata';
import {
  SITE_URL,
  buildBreadcrumbJsonLd,
  buildPropertyJsonLd,
  jsonLdScript,
  propertyTypeLabel,
} from '@/lib/structuredData';
import { getRequestLang, getRequestNonce, getRequestPathname } from '@/lib/serverLang';
import { localizePath } from '@/lib/siteLang';
import { SEO_WORDS, dealLabel } from '@/lib/seoI18n';
import { landingHrefForProperty } from '@/lib/landingPages';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const lang = await getRequestLang();
  const property = await fetchPropertyForShareMetadata(id, lang);
  if (!property) {
    return buildMissingPropertyMetadata(id, lang);
  }
  return buildPropertyShareMetadata(id, property, lang);
}

export default async function PropertyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const [lang, nonce, pathname] = await Promise.all([
    getRequestLang(),
    getRequestNonce(),
    getRequestPathname(),
  ]);
  const property = await fetchPropertyForShareMetadata(id, lang);
  const isEdit = pathname === `/property/${id}/edit` || pathname.startsWith(`/property/${id}/edit/`);
  if (!isEdit && property) {
    const target = canonicalPropertyPathId(id, property);
    if (target && target !== decodeURIComponent(id)) {
      permanentRedirect(localizePath(`/property/${target}`, lang));
    }
  }
  const pageUrl = `${SITE_URL}${localizePath(
    `/property/${property ? canonicalPropertyPathId(id, property) : id}`,
    lang
  )}`;
  const title = property?.title?.trim() || SEO_WORDS.listings[lang];
  const typeLabel = propertyTypeLabel(property?.type, lang);

  const jsonLdBlocks: unknown[] = [];
  if (property) {
    jsonLdBlocks.push(buildPropertyJsonLd(id, property, lang));
    const hub = landingHrefForProperty(property);
    // BreadcrumbList only in JSON-LD (SEO/AI) — not shown visually
    jsonLdBlocks.push(
      buildBreadcrumbJsonLd([
        { name: SEO_WORDS.home[lang], url: `${SITE_URL}${localizePath('/', lang)}` },
        ...(hub
          ? [{ name: `${typeLabel} ${dealLabel(property.dealType, lang)}`.trim(), url: `${SITE_URL}${localizePath(hub, lang)}` }]
          : typeLabel
            ? [{ name: typeLabel, url: `${SITE_URL}${localizePath('/', lang)}?type=${encodeURIComponent(JSON.stringify([property.type]))}` }]
            : []),
        { name: title, url: pageUrl },
      ])
    );
  }

  return (
    <>
      {jsonLdBlocks.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
        />
      ))}
      {children}
    </>
  );
}
