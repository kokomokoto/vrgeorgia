'use client';

/**
 * Temporary marker — only exists on branch_1.
 * Lets you see which Git branch the running site is on.
 * Remove when the design experiment is done (or never merge this file to master).
 */
export function DesignBranchBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[300] border-b border-amber-700/40 bg-amber-500 px-3 py-2 text-center text-sm font-semibold text-amber-950 shadow-sm"
    >
      DESIGN BRANCH — <code className="rounded bg-amber-600/30 px-1.5 py-0.5">branch_1</code>
      {' · '}
      ეს ზოლი მხოლოდ საცდელ branch-ზე ჩანს. master-ზე გადართვისას გაქრება.
    </div>
  );
}
