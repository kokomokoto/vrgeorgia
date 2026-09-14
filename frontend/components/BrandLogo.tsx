import React from 'react';

type BrandLogoProps = {
  sizePx?: number;
  className?: string;
  /** Decorative next to visible text — empty alt. */
  decorative?: boolean;
};

/** Site mark — size is independent from brand text (Design Mode controllable). */
export function BrandLogo({ sizePx = 32, className, decorative = true }: BrandLogoProps) {
  const px = Math.max(16, Math.min(96, Math.round(sizePx)));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/vhome-icon.png"
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
