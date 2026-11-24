/**
 * A site's logo as an app-style tile. Logos for the sites on Home ship in the
 * main bundle; the rest load once, on demand. Sites without a logo get a
 * letter tile, never an empty square. Decorative: the site's name is always
 * written next to it.
 */
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { ICONS as FEATURED } from '../lib/brands/featured.js';
import { cx } from './ui.jsx';

let others = null;
let loading = null;

function loadOthers() {
  loading ??= import('../lib/brands/all.js').then((m) => {
    others = m.ICONS;
    return others;
  });
  return loading;
}

/** Logo data for a site id, or null (no logo, or not loaded yet). */
export function brandOf(id) {
  return FEATURED[id] ?? others?.[id] ?? null;
}

/** Brand colour for progress bars, or null to use ink. */
export function brandAccent(id) {
  return brandOf(id)?.accent ?? null;
}

/** Re-render once the lazy logo module arrives (only for sites not featured). */
export function useBrand(id) {
  const [, force] = useState(0);
  const known = Boolean(FEATURED[id]) || others !== null;
  useEffect(() => {
    if (known || !id) return undefined;
    let live = true;
    loadOthers().then(() => live && force((n) => n + 1));
    return () => {
      live = false;
    };
  }, [id, known]);
  return brandOf(id);
}

const DOT = { ok: 'bg-ok-dot', warn: 'bg-warn-dot', bad: 'bg-bad-dot' };

export function SiteIcon({ id, name, size = 52, live = null, className, pop = false }) {
  const icon = useBrand(id);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.26) };
  const any = id === 'generic' || id === 'direct';
  let body;
  if (icon) {
    style.background = icon.bg;
    style.color = icon.fg;
    body =
      icon.fx === 'tiktok' ? (
        <svg viewBox="0 0 24 24" className="size-[58%] overflow-visible" aria-hidden="true">
          <path d={icon.path} fill="#25F4EE" transform="translate(-0.8 -0.8)" />
          <path d={icon.path} fill="#FE2C55" transform="translate(0.8 0.8)" />
          <path d={icon.path} fill="#FFFFFF" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[58%] overflow-visible" fill="currentColor" aria-hidden="true">
          <path d={icon.path} {...(icon.fx === 'outline' ? { stroke: '#000', strokeWidth: 1.6, paintOrder: 'stroke' } : {})} />
        </svg>
      );
  } else if (any) {
    body = <Globe className="size-[50%]" aria-hidden="true" />;
  } else {
    body = (
      <span data-monogram className="font-[760] leading-none" style={{ fontSize: Math.round(size * 0.42) }} aria-hidden="true">
        {(name ?? id ?? '?').replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase() || '?'}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        'relative inline-grid shrink-0 place-items-center',
        !icon && 'bg-field text-ink-2',
        icon?.light ? 'shadow-[inset_0_0_0_1px_var(--tile-ring)]' : 'dark:shadow-[inset_0_0_0_1px_var(--tile-ring)]',
        pop && 'pop-in',
        className,
      )}
    >
      {body}
      {live && <span className={cx('absolute -end-1 -top-1 size-3.5 rounded-full border-[2.5px] border-paper', DOT[live])} />}
    </span>
  );
}
