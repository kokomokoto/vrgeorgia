import type { Metadata } from 'next';
import {
  buildDefaultShareMetadata,
  buildPropertyShareMetadata,
  fetchPropertyForShareMetadata,
} from '@/lib/propertyShareMetadata';

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

export default function PropertyDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
