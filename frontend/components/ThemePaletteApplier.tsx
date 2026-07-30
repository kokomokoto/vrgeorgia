'use client';

import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  DEFAULT_THEME_PALETTES,
  applyThemePaletteToDom,
  themeModeFromThemeClass,
  type ThemePalette,
} from '@/lib/themePalettes';

function paletteSignature(p: ThemePalette): string {
  return [
    p.bodyBg,
    p.textColor,
    p.headerBg,
    p.headerText,
    p.accentColor,
    p.mutedText,
    p.surfaceBg,
    p.surfaceBorder,
    p.priceColor,
    p.mapTiles,
    p.glow1,
    p.glow1Opacity,
    p.glow2,
    p.glow2Opacity,
    p.glow3,
    p.glow3Opacity,
    p.gradientFrom,
    p.gradientMid,
    p.gradientTo,
    p.gridColor,
    p.gridOpacity,
  ].join('|');
}

/**
 * Applies the current theme's design-mode palette as CSS custom properties.
 * Works on every page (falls back to defaults when design layout is missing).
 */
export function ThemePaletteApplier() {
  const { theme } = useTheme();
  const design = useHomeDesignOptional();
  const mode = themeModeFromThemeClass(theme);
  const palette =
    design?.layout.themePalettes?.[mode] ?? DEFAULT_THEME_PALETTES[mode];
  const signature = paletteSignature(palette);

  React.useEffect(() => {
    applyThemePaletteToDom(palette);
    // signature captures all palette fields; palette identity alone is unstable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
