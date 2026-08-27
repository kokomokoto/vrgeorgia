import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vhome Analytics',
  description: 'ანალიტიკის პანელი',
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  // ანალიტიკის გვერდებს არ სჭირდება Header/Footer — ცალკე დიზაინი
  return <>{children}</>;
}
