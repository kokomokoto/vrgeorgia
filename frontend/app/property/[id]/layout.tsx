import type { Metadata } from 'next';
import Link from 'next/link';
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
      {property ? (
        <nav
          aria-label="breadcrumb"
          className="mx-auto max-w-6xl px-4 pt-3 text-sm text-slate-500 dark:text-zinc-400"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-blue-600 dark:hover:text-amber-400">
                მთავარი
              </Link>
            </li>
            {typeLabel ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/?type=${encodeURIComponent(JSON.stringify([property.type]))}`}
                    className="hover:text-blue-600 dark:hover:text-amber-400"
                  >
                    {typeLabel}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="max-w-[14rem] truncate font-medium text-slate-800 dark:text-zinc-200 sm:max-w-md">
              {title}
            </li>
          </ol>
        </nav>
      ) : null}
      {children}
    </>
  );
}
