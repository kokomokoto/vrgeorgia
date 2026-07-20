import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} VR Georgia</div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/faq" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {t('faq_nav')}
          </Link>
          <Link href="/about" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {t('about_nav')}
          </Link>
          <Link href="/services" className="hover:text-slate-800 dark:hover:text-zinc-200">
            {t('services_nav')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
