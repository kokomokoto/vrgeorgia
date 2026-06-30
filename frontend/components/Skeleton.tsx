'use client';

import React from 'react';

export function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`.trim()} aria-hidden />;
}

export function PropertyCardSkeleton({ compactPhoto = false }: { compactPhoto?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900"
      aria-hidden
    >
      <Shimmer className={compactPhoto ? 'aspect-[3/2] w-full' : 'aspect-[4/3] w-full'} />
      <div className={`space-y-2.5 ${compactPhoto ? 'p-3' : 'p-3.5'}`}>
        <Shimmer className="h-5 w-2/5 rounded-md" />
        <Shimmer className="h-4 w-full rounded-md" />
        <Shimmer className="h-4 w-4/5 rounded-md" />
        <div className="flex gap-2 pt-1">
          <Shimmer className="h-6 w-14 rounded-full" />
          <Shimmer className="h-6 w-14 rounded-full" />
          <Shimmer className="h-6 w-10 rounded-full" />
        </div>
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 dark:border-zinc-800">
          <Shimmer className="h-3 w-16 rounded" />
          <Shimmer className="h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export function PropertyCardGridSkeleton({
  count = 8,
  compactPhoto = false,
  gridClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}: {
  count?: number;
  compactPhoto?: boolean;
  gridClassName?: string;
}) {
  return (
    <div
      className={`grid gap-4 ${gridClassName}`}
      aria-busy="true"
      aria-label="იტვირთება"
    >
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} compactPhoto={compactPhoto} />
      ))}
    </div>
  );
}

export function PropertyMapListRowSkeleton() {
  return (
    <div
      className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
      aria-hidden
    >
      <Shimmer className="h-16 w-20 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <Shimmer className="h-4 w-3/4 rounded" />
        <Shimmer className="h-3.5 w-1/2 rounded" />
        <Shimmer className="h-4 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function PropertyMapListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="იტვირთება">
      {Array.from({ length: count }, (_, i) => (
        <PropertyMapListRowSkeleton key={i} />
      ))}
    </div>
  );
}
