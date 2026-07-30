'use client';

/**
 * Temporary marker — only exists on branch_1.
 * Lets you see which Git branch the running site is on.
 * Remove when the design experiment is done (or never merge this file to master).
 */
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';

export function DesignBranchBanner() {
  const design = useHomeDesignOptional();

  return (
    <div
      role="status"
      className="sticky top-0 z-[300] flex flex-wrap items-center justify-center gap-2 border-b border-amber-700/40 bg-amber-500 px-3 py-2 text-center text-sm font-semibold text-amber-950 shadow-sm"
    >
      <span>
        DESIGN BRANCH — <code className="rounded bg-amber-600/30 px-1.5 py-0.5">branch_1</code>
        {' · '}
        ეს ზოლი მხოლოდ საცდელ branch-ზე ჩანს.
      </span>
      {design ? (
        <button
          type="button"
          onClick={() => design.setDesignMode(!design.designMode)}
          className={`rounded-lg px-3 py-1 text-xs font-bold shadow-sm transition ${
            design.designMode
              ? design.isDirty
                ? 'bg-amber-900 text-amber-50 ring-2 ring-white/70'
                : 'bg-blue-700 text-white ring-2 ring-white/70'
              : 'bg-white text-amber-950 hover:bg-amber-50'
          }`}
        >
          {design.designMode
            ? design.isDirty
              ? 'Design Mode: ON · შეუნახავი'
              : 'Design Mode: ON'
            : 'Design Mode'}
        </button>
      ) : null}
    </div>
  );
}
