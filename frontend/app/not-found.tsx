import type { Metadata } from 'next';
import NotFoundClient from '@/components/NotFoundClient';

export const metadata: Metadata = {
  title: 'გვერდი ვერ მოიძებნა',
  description: 'მოთხოვნილი გვერდი არ არსებობს ან გადატანილია.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
