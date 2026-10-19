'use client';

import React from 'react';
import { useBranding } from '@/components/BrandingProvider';
import { DEFAULT_BRAND_LOGO_SRC } from '@/lib/branding';

type BrandLogoProps = {
  sizePx?: number;
  className?: string;
  /** Decorative next to visible text — empty alt. */
  decorative?: boolean;
  /** Optional override (e.g. preview before save). */
  srcOverride?: string | null;
};

/** Site mark — size is independent from brand text (Design Mode controllable). */
export function BrandLogo({
  sizePx = 32,
  className,
  decorative = true,
  srcOverride,
}: BrandLogoProps) {
  const { logoSrc } = useBranding();
  const px = Math.max(16, Math.min(96, Math.round(sizePx)));
  const src = (srcOverride && String(srcOverride).trim()) || logoSrc || DEFAULT_BRAND_LOGO_SRC;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={decorative ? '' : 'Vhome'}
      width={px}
      height={px}
      className={className ?? 'shrink-0 object-contain object-center'}
      style={{ width: px, height: px }}
      draggable={false}
      decoding="async"
    />
  );
}
