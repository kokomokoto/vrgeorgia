'use client';

import React from 'react';
import { DESIGNABLE_LABELS, type DesignableId } from '@/lib/homeDesignLayout';

/** Small name tag on designable blocks in Design Mode */
export function DesignableBadge({
  id,
  selected,
  placement = 'above',
}: {
  id: DesignableId;
  selected: boolean;
  /** above = sits on top edge; inside = top-left corner inside the block */
  placement?: 'above' | 'inside';
}) {
  if (!selected) {
    return (
      <span
        className={`pointer-events-none z-40 rounded-md bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 shadow transition group-hover/designable:opacity-100 ${
          placement === 'inside'
            ? 'absolute left-1 top-1'
            : 'absolute left-0 top-0 -translate-y-full'
        }`}
      >
        {DESIGNABLE_LABELS[id]}
      </span>
    );
  }

  return (
    <span
      className={`pointer-events-none z-40 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow ${
        placement === 'inside'
          ? 'absolute left-1 top-1'
          : 'absolute left-0 top-0 -translate-y-full'
      }`}
    >
      {DESIGNABLE_LABELS[id]}
    </span>
  );
}
