import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'შესვლა',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
