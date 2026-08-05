'use client';

/**
 * Temporary marker — only exists on branch_1.
 * Lets you see which Git branch the running site is on.
 * Remove when the design experiment is done (or never merge this file to master).
 */
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';

export function DesignBranchBanner() {
  const design = useHomeDesignOptional();
  const showDesignToggle = Boolean(design?.canDesignMode);
  const designOn = Boolean(design?.designMode);

  if (designOn) {
    return (
      <div
        role="status"
        className="sticky top-0 z-[300] flex items-center justify-center gap-2 border-b border-blue-800/30 bg-blue-700 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-sm"
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
    );
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-[300] flex flex-wrap items-center justify-center gap-2 border-b border-amber-700/40 bg-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-amber-950 shadow-sm"
    >
      <span>
        საცდელი branch · <code className="rounded bg-amber-600/30 px-1 py-0.5">branch_1</code>
      </span>
      {showDesignToggle ? (
        <button
          type="button"
          onClick={() => design?.setDesignMode(true)}
          className="rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-amber-950 shadow-sm hover:bg-amber-50"
        >
          რედაქტირება
        </button>
      ) : null}
    </div>
  );
}
