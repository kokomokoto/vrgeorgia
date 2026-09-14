import type { Metadata } from 'next';
import { privateRobotsMetadata } from '@/lib/privateMetadata';

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: 'ატვირთვა',
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
