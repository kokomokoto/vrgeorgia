import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'მოთხოვნები',
};

export default function AgentRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
