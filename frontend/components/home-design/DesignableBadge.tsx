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
  return (
    <span
      className={`pointer-events-none z-40 rounded-md px-2 py-0.5 text-[10px] font-bold shadow ${
        placement === 'inside'
          ? 'absolute left-1 top-1'
          : 'absolute left-0 top-0 -translate-y-full'
      } ${selected ? 'bg-blue-600 text-white' : 'bg-slate-700/90 text-white'}`}
    >
      {DESIGNABLE_LABELS[id]}
    </span>
  );
}
