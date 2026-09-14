import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'რეგისტრაცია',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
