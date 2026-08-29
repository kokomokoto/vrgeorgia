'use client';

/**
 * Design Mode chrome for admins on the homepage.
 * — Off: compact “რედაქტირება” control (visitors never see it).
 * — On: sticky status bar + გამორთვა.
 */
import { usePathname } from 'next/navigation';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';

export function DesignBranchBanner() {
  const pathname = usePathname();
  const design = useHomeDesignOptional();
  const isHome = pathname === '/';
  const showDesignToggle = Boolean(design?.canDesignMode) && isHome;
  const designOn = Boolean(design?.designMode);

  if (!showDesignToggle) return null;

  if (designOn) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-2 z-[300] flex justify-center">
        <div
          role="status"
          className="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-blue-700 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-lg"
        >
          <span>რედაქტირების რეჟიმი{design?.isDirty ? ' · შეუნახავი' : ''}</span>
          <button
            type="button"
            onClick={() => design?.setDesignMode(false)}
            className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-bold hover:bg-white/25"
          >
            გამორთვა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[300] -translate-x-1/2">
      <button
        type="button"
        onClick={() => design?.setDesignMode(true)}
        className="pointer-events-auto rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
      >
        რედაქტირება
      </button>
    </div>
  );
}
