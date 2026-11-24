/** Ferry mark: an arrow landing on a hull above the waterline. */
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#0B4F5C" />
      <path d="M256 92v176" stroke="#F5B700" strokeWidth="44" strokeLinecap="round" />
      <path d="M176 204l80 80 80-80" fill="none" stroke="#F5B700" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M118 330h276l-34 62H152z" fill="#FFFFFF" />
      <path d="M96 428c32 0 32-18 64-18s32 18 64 18 32-18 64-18 32 18 64 18 32-18 64-18" fill="none" stroke="#8FD3DB" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="size-8 rounded-[9px] ring-1 ring-white/15" />
      <span className="text-[1.35rem] font-extrabold tracking-[-0.02em]">Ferry</span>
    </span>
  );
}
