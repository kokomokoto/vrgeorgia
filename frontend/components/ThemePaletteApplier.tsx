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
import { resolveActiveThemeMode } from '@/lib/themeModes';

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
  const { theme, activeModeId } = useTheme();
  const design = useHomeDesignOptional();
  const modes = design?.layout.themeModes;
  const active =
    modes && modes.length > 0
      ? resolveActiveThemeMode(modes, activeModeId, theme)
      : null;
  const legacyMode = themeModeFromThemeClass(theme);
  const palette =
    active?.palette ||
    design?.layout.themePalettes?.[legacyMode] ||
    DEFAULT_THEME_PALETTES[legacyMode];
  const signature = `${activeModeId}|${paletteSignature(palette)}`;

  React.useEffect(() => {
    applyThemePaletteToDom(palette);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
