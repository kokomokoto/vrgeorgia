'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
  value: number | null;
  customMin: number;
  onCommit: (value: number | null) => void;
  max?: number;
};

/** პრესეტ ღილაკების გვერდით — ხელით ჩაწერა (მაგ. 15, 54) ნაწილობრივი ციფრებითაც */
export function usePresetCountDraftInput({ value, customMin, onCommit, max }: Options) {
  const isCustom = value !== null && value >= customMin;
  const [draft, setDraft] = useState('');
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setDraft(isCustom && value !== null ? String(value) : '');
  }, [value, isCustom]);

  const commitDraft = (raw: string) => {
    if (raw === '') {
      onCommit(null);
      setDraft('');
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < customMin) {
      setDraft(isCustom && value !== null ? String(value) : '');
      return;
    }
    const final = max !== undefined ? Math.min(n, max) : n;
    onCommit(final);
    setDraft(String(final));
  };

  const inputProps = {
    value: draft,
    onFocus: () => {
      focused.current = true;
      setDraft(isCustom && value !== null ? String(value) : '');
    },
    onBlur: () => {
      focused.current = false;
      commitDraft(draft);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/\D/g, '');
      setDraft(cleaned);
      if (cleaned === '') return;
      const n = parseInt(cleaned, 10);
      if (!Number.isFinite(n) || n < customMin) return;
      const final = max !== undefined ? Math.min(n, max) : n;
      onCommit(final);
    },
  };

  return { draft, isCustom, inputProps };
}

type CountOptions = {
  value: number;
  customMin: number;
  onChange: (value: number) => void;
  clearTo?: number;
  max?: number;
};

export function usePresetCountDraftInputNonNull({
  value,
  customMin,
  onChange,
  clearTo = 0,
  max,
}: CountOptions) {
  const { isCustom, inputProps } = usePresetCountDraftInput({
    value: value >= customMin ? value : null,
    customMin,
    max,
    onCommit: (n) => onChange(n === null ? clearTo : n),
  });

  return { isCustom: value >= customMin, inputProps };
}
