'use client';

import React from 'react';

type HistogramRangeSliderProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step: number;
  histogram: number[];
  onChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
  className?: string;
  showRangeLabel?: boolean;
  showScaleLabels?: boolean;
};

export function HistogramRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step,
  histogram,
  onChange,
  formatValue,
  className = '',
  showRangeLabel = true,
  showScaleLabels = false,
}: HistogramRangeSliderProps) {
  const fmt = formatValue ?? ((n: number) => String(n));
  const safeMin = Math.min(valueMin, valueMax);
  const safeMax = Math.max(valueMin, valueMax);
  const span = max - min || step;
  const pctMin = ((safeMin - min) / span) * 100;
  const pctMax = ((safeMax - min) / span) * 100;
  const bucketCount = histogram.length || 1;
  const maxCount = Math.max(1, ...histogram);

  const handleMin = (raw: number) => {
    onChange(Math.min(raw, safeMax), safeMax);
  };

  const handleMax = (raw: number) => {
    onChange(safeMin, Math.max(raw, safeMin));
  };

  return (
    <div className={`histogram-range-slider ${className}`.trim()}>
      <div className="histogram-range-slider__chart" aria-hidden>
        {histogram.map((count, i) => {
          const bucketStart = min + (i / bucketCount) * span;
          const bucketEnd = min + ((i + 1) / bucketCount) * span;
          const inRange = bucketEnd >= safeMin && bucketStart <= safeMax;
          const heightPct = count > 0 ? Math.max(12, (count / maxCount) * 100) : 4;
          return (
            <div
              key={i}
              className={`histogram-range-slider__bar ${inRange ? 'histogram-range-slider__bar--active' : ''}`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      <div className="histogram-range-slider__track-wrap">
        <div className="histogram-range-slider__track" aria-hidden />
        <div
          className="histogram-range-slider__fill"
          style={{ left: `${pctMin}%`, width: `${Math.max(0, pctMax - pctMin)}%` }}
          aria-hidden
        />
        <input
          type="range"
          className="histogram-range-slider__input histogram-range-slider__input--min"
          min={min}
          max={max}
          step={step}
          value={safeMin}
          onChange={(e) => handleMin(Number(e.target.value))}
          aria-label={fmt(safeMin)}
        />
        <input
          type="range"
          className="histogram-range-slider__input histogram-range-slider__input--max"
          min={min}
          max={max}
          step={step}
          value={safeMax}
          onChange={(e) => handleMax(Number(e.target.value))}
          aria-label={fmt(safeMax)}
        />
      </div>

      {showScaleLabels ? (
        <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      ) : null}
      {showRangeLabel ? (
        <div className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-zinc-100">
          {fmt(safeMin)} – {fmt(safeMax)}
        </div>
      ) : null}
    </div>
  );
}
