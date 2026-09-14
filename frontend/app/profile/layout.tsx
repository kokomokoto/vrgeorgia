import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'პროფილი',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
