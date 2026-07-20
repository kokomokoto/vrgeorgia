'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const tx = (key: string, fallback: string) => (mounted ? t(key) : fallback);

  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} VR Georgia</div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/faq" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {tx('faq_nav', 'FAQ')}
          </Link>
          <Link href="/about" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {tx('about_nav', 'შესახებ')}
          </Link>
          <Link href="/services" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {tx('services_nav', 'მომსახურება')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
