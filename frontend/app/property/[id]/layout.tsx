import type { Metadata } from 'next';
import { headers } from 'next/headers';
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

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchPropertyForShareMetadata(id);
  if (!property) {
    return buildMissingPropertyMetadata(id);
  }
  return buildPropertyShareMetadata(id, property);
}

export default async function PropertyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const property = await fetchPropertyForShareMetadata(id);
  const pathname = (await headers()).get('x-pathname') || '';
  const isEdit = pathname === `/property/${id}/edit` || pathname.startsWith(`/property/${id}/edit/`);
  if (!isEdit && property) {
    const target = canonicalPropertyPathId(id, property);
    if (target && target !== id) {
      permanentRedirect(`/property/${target}`);
    }
  }
  const pageUrl = `${SITE_URL}/property/${property?._id || id}`;
  const title = property?.title?.trim() || 'განცხადება';
  const typeLabel = propertyTypeLabel(property?.type);

  const jsonLdBlocks: unknown[] = [];
  if (property) {
    jsonLdBlocks.push(buildPropertyJsonLd(id, property));
    // BreadcrumbList only in JSON-LD (SEO/AI) — not shown visually
    jsonLdBlocks.push(
      buildBreadcrumbJsonLd([
        { name: 'მთავარი', url: SITE_URL },
        ...(typeLabel
          ? [{ name: typeLabel, url: `${SITE_URL}/?type=${encodeURIComponent(JSON.stringify([property.type]))}` }]
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
          dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
        />
      ))}
      {children}
    </>
  );
}
