import type { Metadata } from 'next';
import {
  buildDefaultShareMetadata,
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
    return buildDefaultShareMetadata();
  }
  return buildPropertyShareMetadata(id, property);
}

export default async function PropertyDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const property = await fetchPropertyForShareMetadata(id);
  const pageUrl = `${SITE_URL}/property/${id}`;
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
