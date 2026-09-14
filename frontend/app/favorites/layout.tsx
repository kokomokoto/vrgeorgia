import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'რჩეულები',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
