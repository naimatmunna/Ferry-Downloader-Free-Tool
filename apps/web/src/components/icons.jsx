/** Two icons Lucide doesn't have: a video with sound, and a video without sound. */
function Base({ className, children }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function VideoSoundIcon({ className = 'size-5' }) {
  return (
    <Base className={className}>
      <rect x="2" y="5" width="15" height="14" rx="3" />
      <path d="M8 9.5v5l4.2-2.5z" />
      <path d="M20 9a4.5 4.5 0 0 1 0 6" />
    </Base>
  );
}

export function VideoMuteIcon({ className = 'size-5' }) {
  return (
    <Base className={className}>
      <rect x="2" y="5" width="15" height="14" rx="3" />
      <path d="M8 9.5v5l4.2-2.5z" />
      <path d="m19.5 10 3 4m0-4-3 4" />
    </Base>
  );
}
