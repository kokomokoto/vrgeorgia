'use client';

import React from 'react';
import { formatNumberInputDisplay, parseLooseNumberInput } from '@/lib/formatNumberInput';

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: string;
  onChange: (cleanValue: string) => void;
};

/** ფასი, კვ.მ — ათასების გამოყოფა `,`-ით, ათწილადი `.`-ით */
export function FormattedNumberInput({ value, onChange, className, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={formatNumberInputDisplay(value)}
      onChange={(e) => onChange(parseLooseNumberInput(e.target.value))}
    />
  );
}
