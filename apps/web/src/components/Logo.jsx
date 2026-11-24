/** Ferry mark: an arrow landing on the water line. Colours follow the theme. */
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" style={{ fill: 'var(--mark-bg)' }} />
      <path d="M16 6.5V19M10.5 13.5 16 19l5.5-5.5" style={{ stroke: 'var(--mark-arrow)' }} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 25q2.25-2.6 4.5 0t4.5 0 4.5 0 4.5 0" style={{ stroke: 'var(--mark-wave)' }} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark className="size-8" />
      <span className="text-[1.3rem] font-[820] tracking-[-0.015em] text-hero-head [font-stretch:125%]">Ferry</span>
    </span>
  );
}
