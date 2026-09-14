import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'შეტყობინებები',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
