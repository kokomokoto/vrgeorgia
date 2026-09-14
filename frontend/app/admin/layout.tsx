import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'ადმინი',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
