import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'მაძებარი',
};

export default function SearcherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
