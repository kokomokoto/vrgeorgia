'use client';

import React from 'react';

import { usePresetCountDraftInputNonNull } from '@/components/usePresetCountDraftInput';

export type CountSelectorTheme = {
  selected: string;
  unselected: string;
  inputSelected: string;
  inputUnselected: string;
};

export const COUNT_THEME_ORANGE: CountSelectorTheme = {
  selected: 'border-orange-500 bg-orange-500 text-white shadow-md',
  unselected: 'border-slate-200 bg-white text-slate-700 hover:border-orange-300',
  inputSelected: 'border-orange-500 bg-orange-500 text-white shadow-md focus:ring-orange-300',
  inputUnselected: 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 focus:ring-orange-200',
};

export const COUNT_THEME_PURPLE: CountSelectorTheme = {
  selected: 'border-purple-500 bg-purple-500 text-white shadow-md',
  unselected: 'border-slate-200 bg-white text-slate-700 hover:border-purple-300',
  inputSelected: 'border-purple-500 bg-purple-500 text-white shadow-md focus:ring-purple-300',
  inputUnselected: 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 focus:ring-purple-200',
};

export const COUNT_THEME_CYAN: CountSelectorTheme = {
  selected: 'border-cyan-500 bg-cyan-500 text-white shadow-md',
  unselected: 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300',
  inputSelected: 'border-cyan-500 bg-cyan-500 text-white shadow-md focus:ring-cyan-300',
  inputUnselected: 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 focus:ring-cyan-200',
};

export const BALCONY_PRESETS = [0, 1, 2, 3] as const;
export const BALCONY_CUSTOM_MIN = 4;
export const BATHROOM_PRESETS = [0, 1, 2, 3, 4, 5] as const;
export const BATHROOM_CUSTOM_MIN = 6;

type Props = {
  value: number;
  onChange: (value: number) => void;
  presets: readonly number[];
  /** რიცხვითი ველი: ამ მნიშვნელობიდან ზემოთ (ჩათვლით) */
  customMin: number;
  ariaLabel: string;
  theme: CountSelectorTheme;
  /** 0 ღილაკზე „—“ */
  showZeroDash?: boolean;
  /** ცარიელი ველისას (customMin-ზე მაღალი მნიშვნელობა იყო) */
  clearTo?: number;
  max?: number;
};

export function PropertyCountSelector({
  value,
  onChange,
  presets,
  customMin,
  ariaLabel,
  theme,
  showZeroDash = true,
  clearTo = 0,
  max,
}: Props) {
  const { isCustom, inputProps } = usePresetCountDraftInputNonNull({
    value,
    customMin,
    onChange,
    clearTo,
    max,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-12 h-12 rounded-xl border-2 font-bold transition-all hover:scale-105 ${
            value === num && !isCustom ? theme.selected : theme.unselected
          }`}
        >
          {num === 0 && showZeroDash ? '—' : num}
        </button>
      ))}
      <input
        type="text"
        inputMode="numeric"
        placeholder={String(customMin)}
        aria-label={ariaLabel}
        className={`w-16 h-12 rounded-xl border-2 text-center font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          isCustom ? theme.inputSelected : theme.inputUnselected
        }`}
        {...inputProps}
      />
    </div>
  );
}
