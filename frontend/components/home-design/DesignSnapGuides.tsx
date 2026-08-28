'use client';

import React from 'react';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  subscribeDesignSnapGuides,
  type SnapGuide,
} from '@/lib/designSnap';

/**
 * Magenta alignment lines while dragging in Design Mode.
 * Pointer-events none so they never steal the gesture.
 */
export function DesignSnapGuides() {
  const design = useHomeDesignOptional();
  const [guides, setGuides] = React.useState<SnapGuide[]>([]);

  React.useEffect(() => subscribeDesignSnapGuides(setGuides), []);

  if (!design?.designMode || guides.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[350]"
      data-design-snap-guides
      aria-hidden
    >
      {guides.map((g) =>
        g.axis === 'v' ? (
          <div
            key={`v:${g.pos}`}
            className="absolute top-0 h-full w-px bg-pink-500 shadow-[0_0_4px_#ec4899]"
            style={{ left: g.pos }}
          />
        ) : (
          <div
            key={`h:${g.pos}`}
            className="absolute left-0 h-px w-full bg-pink-500 shadow-[0_0_4px_#ec4899]"
            style={{ top: g.pos }}
          />
        )
      )}
    </div>
  );
}
