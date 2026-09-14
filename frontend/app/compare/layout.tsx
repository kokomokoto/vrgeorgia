import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'შედარება',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
