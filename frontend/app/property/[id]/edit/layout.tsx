import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'რედაქტირება',
};

export default function PropertyEditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
