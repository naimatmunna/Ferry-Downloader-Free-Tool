/**
 * "Where Ferry works": real site logos, grouped by what Ferry can do with each
 * site right now (effective policy, operator overrides included), with live
 * status dots when the server has recent data.
 */
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Check, Lock } from 'lucide-react';
import { useI18n } from '../../lib/i18n/index.jsx';
import { usePlatforms } from '../../lib/registry.js';
import { liveDot, shelfOf, siteStatus } from '../../lib/siteStatus.js';
import { useLiveStatus } from '../../state/liveStatus.js';
import { SiteIcon } from '../../components/SiteIcon.jsx';
import { LiveDot, liveLabel } from '../../components/StatusPill.jsx';
import { cx } from '../../components/ui.jsx';

/** Shown first, in this order, in whichever shelf their current policy puts them. */
export const FEATURED = [
  // The sites people paste most come first (phones show the first 7 of a shelf, wider screens 13).
  'tiktok', 'youtube', 'instagram', 'facebook', 'x', 'soundcloud', 'vimeo', 'twitch', 'reddit', 'pinterest', 'bluesky', 'internet-archive', 'dailymotion',
  'tumblr', 'vk', 'peertube', 'flickr', 'imgur', 'kick', 'rumble', 'bilibili', 'mastodon', 'ted', 'nasa', 'wikimedia-commons', 'snapchat', 'bandcamp',
  'threads',
  'netflix', 'spotify', 'apple-music', 'tidal', 'deezer', 'hbo-max',
];

const SHELVES = [
  { key: 'direct', icon: Check, tone: 'bg-ok-soft text-ok', desktop: 13, phone: 7 },
  { key: 'official', icon: ArrowUpRight, tone: 'bg-off-soft text-off', desktop: 6, phone: 3 },
  { key: 'protected', icon: Lock, tone: 'bg-lock-soft text-lock', desktop: 6, phone: 3, muted: true },
];

const SHORT = { 'internet-archive': 'Archive', 'wikimedia-commons': 'Commons' };

/** Tile label: the site's name without the parenthetical ("X (Twitter)" → "X"). */
export function shortName(p) {
  return SHORT[p.id] ?? p.name.replace(/\s*\(.*\)\s*$/, '');
}

/** Sites per Home shelf, from the registry. */
export function useShelves() {
  const platforms = usePlatforms((s) => s.platforms);
  return useMemo(() => {
    const by = { direct: [], official: [], protected: [] };
    for (const p of platforms) {
      const shelf = shelfOf(siteStatus(p));
      if (shelf) by[shelf].push(p);
    }
    return SHELVES.map((s) => {
      const list = by[s.key];
      const featured = FEATURED.map((id) => list.find((p) => p.id === id)).filter(Boolean);
      return { ...s, total: list.length, featured };
    });
  }, [platforms]);
}

function MoreTile({ count, shelf, className }) {
  const { t } = useI18n();
  if (count <= 0) return null;
  return (
    <li className={className}>
      <Link to={`/sites?shelf=${shelf}`} aria-label={t('where.more', { count })} className="flex flex-col items-center gap-1.5 rounded-2xl px-0.5 pb-1.5 pt-2 text-ink-2 transition-colors hover:bg-field">
        <span className="grid size-[52px] place-items-center rounded-[14px] bg-field text-[15px] font-bold tabular-nums">+{count}</span>
        <span className="text-[11.5px] font-semibold">{t('where.moreShort')}</span>
      </Link>
    </li>
  );
}

export function WherePanel({ matchId = null }) {
  const { t } = useI18n();
  const shelves = useShelves();
  const sites = useLiveStatus((s) => s.sites);
  const total = usePlatforms((s) => s.platforms.filter((p) => p.id !== 'generic' && p.id !== 'direct').length);

  useEffect(() => {
    useLiveStatus.getState().load();
  }, []);

  const shown = shelves.some((s) => s.featured.slice(0, s.desktop).some((p) => p.id === matchId));
  // Live status is only shown for sites Ferry downloads from (the "Download directly" shelf).
  const anyLive = shelves.some((s) => s.key === 'direct' && s.featured.some((p) => liveDot(sites[p.id])));
  if (!shelves.some((s) => s.total)) return null;

  return (
    <section aria-labelledby="where-title" className="self-start rounded-[28px] bg-paper px-4 pb-4 pt-5 text-ink shadow-card sm:px-6">
      <div className="flex items-center gap-3 px-1">
        <h2 id="where-title" className="heading text-[19px]">
          {t('where.title')}
        </h2>
        {anyLive && (
          <span className="ms-auto inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-2" title={t('where.liveHelp')}>
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-ink-3" />
            {t('where.live')}
          </span>
        )}
      </div>

      {shelves.map((s, n) => {
        if (!s.total) return null;
        const Icon = s.icon;
        const tiles = s.featured.slice(0, s.desktop);
        return (
          <div key={s.key} role="group" aria-labelledby={`shelf-${s.key}`} className={cx(n > 0 && 'mt-3 border-t border-line pt-3.5', n === 0 && 'mt-3')}>
            <div className="mb-1.5 flex items-center gap-2.5 px-1">
              <span className={cx('grid size-7 shrink-0 place-items-center rounded-[9px]', s.tone)}>
                <Icon aria-hidden="true" className="size-4" strokeWidth={2.6} />
              </span>
              <div className="min-w-0">
                <div id={`shelf-${s.key}`} className="text-[15px] font-bold leading-tight">
                  {t(`where.${s.key}.title`)}
                </div>
                <div className="text-[12.5px] leading-snug text-ink-2">{t(`where.${s.key}.sub`)}</div>
              </div>
              <span className="ms-auto shrink-0 text-[13px] font-semibold text-ink-2 tabular-nums">{t('where.count', { count: s.total })}</span>
            </div>
            <ul className="grid grid-cols-4 gap-0.5 sm:grid-cols-7">
              {tiles.map((p, i) => {
                const status = siteStatus(p);
                const dot = s.key === 'direct' ? liveDot(sites[p.id]) : null;
                const match = p.id === matchId;
                const label = `${p.name}: ${t(`status.${status}`)}${dot ? `. ${liveLabel(dot, t)}` : ''}`;
                return (
                  <li key={p.id} className={cx(i >= s.phone && 'hidden sm:block')}>
                    <Link
                      to={`/sites?site=${p.id}`}
                      aria-label={label}
                      title={label}
                      className={cx(
                        'flex flex-col items-center gap-1.5 rounded-2xl px-0.5 pb-1.5 pt-2 text-ink-2 transition-[opacity,background-color] duration-300 hover:bg-field',
                        shown && !match && 'opacity-30',
                        match && 'bg-field text-ink',
                      )}
                    >
                      <SiteIcon
                        id={p.id}
                        name={p.name}
                        size={52}
                        live={dot?.tone}
                        className={cx('transition-transform duration-300', s.muted && 'opacity-50 grayscale', match && '-translate-y-1 scale-[1.08] shadow-[0_0_0_3px_var(--paper),0_0_0_5.5px_var(--ink)]')}
                      />
                      <span className="max-w-full truncate text-[11.5px] font-semibold">{shortName(p)}</span>
                    </Link>
                  </li>
                );
              })}
              <MoreTile count={s.total - Math.min(tiles.length, s.phone)} shelf={s.key} className="sm:hidden" />
              <MoreTile count={s.total - tiles.length} shelf={s.key} className="hidden sm:block" />
            </ul>
            {s.key === 'direct' && <p className="mt-1.5 px-1 text-[12.5px] text-ink-2">{t('where.permNote')}</p>}
          </div>
        );
      })}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-1 pt-3 text-[13px]">
        {anyLive ? (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2" title={t('where.liveHelp')}>
            {['ok', 'warn', 'bad'].map((tone) => (
              <span key={tone} className="inline-flex items-center gap-1.5">
                <LiveDot tone={tone} />
                {t(`live.${tone}`)}
              </span>
            ))}
            <span className="sr-only">{t('where.liveHelp')}</span>
          </span>
        ) : (
          <span />
        )}
        <Link to="/sites" className="font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
          {t('where.seeAll', { count: total })}
        </Link>
      </div>
    </section>
  );
}
