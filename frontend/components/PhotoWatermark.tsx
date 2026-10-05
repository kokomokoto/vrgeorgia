type PhotoWatermarkProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<PhotoWatermarkProps['size']>, string> = {
  sm: 'text-[10px] leading-none',
  md: 'text-xs leading-none sm:text-sm',
  lg: 'text-2xl leading-none sm:text-4xl',
};

/** ეკრანზე ჩანს, ფაილში არ იწერება. კლიკს არ იჭერს. */
export function PhotoWatermark({ size = 'md', className = '' }: PhotoWatermarkProps) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute select-none font-semibold tracking-wide text-white/90 ${SIZE_CLASS[size]} ${className}`}
      style={{
        textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.35)',
      }}
    >
      vhome.ge
    </span>
  );
}
