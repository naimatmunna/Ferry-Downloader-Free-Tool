/**
 * "Where Ferry works": real logos of the sites Ferry can really download from
 * right now (effective policy with operator overrides, engine on this server,
 * not known to fail), with live status dots when the server has recent data.
 * Sites Ferry can't download from aren't shown; pasting their links still
 * explains what Ferry can do.
 */
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n/index.jsx';
import { usePlatforms } from '../../lib/registry.js';
import { isDownloadable, liveDot, siteStatus } from '../../lib/siteStatus.js';
import { useLiveStatus } from '../../state/liveStatus.js';
import { SiteIcon } from '../../components/SiteIcon.jsx';
import { LiveDot, liveLabel } from '../../components/StatusPill.jsx';
import { cx } from '../../components/ui.jsx';

/** The order sites appear in on Home and Sites. Only downloadable ones are shown. */
export const FEATURED = [
  // The sites people paste most come first.
  'tiktok', 'youtube', 'instagram', 'facebook', 'x', 'soundcloud', 'vimeo', 'twitch', 'reddit', 'pinterest', 'bluesky', 'internet-archive', 'dailymotion',
  'tumblr', 'vk', 'peertube', 'flickr', 'imgur', 'kick', 'rumble', 'bilibili', 'mastodon', 'ted', 'nasa', 'wikimedia-commons', 'snapchat', 'bandcamp',
  // Next in line when a site above stops downloading.
  'youtube-music', 'linkedin', 'streamable', 'odysee', 'niconico',
  'threads',
  'netflix', 'spotify', 'apple-music', 'tidal', 'deezer', 'hbo-max',
];

/** Logos before the "more" tile: three rows of 7 on wider screens, three rows of 4 on phones. */
const SHOW = { wide: 20, phone: 11 };

const SHORT = { 'internet-archive': 'Archive', 'wikimedia-commons': 'Commons' };

/** Tile label: the site's name without the parenthetical ("X (Twitter)" → "X"). */
export function shortName(p) {
  return SHORT[p.id] ?? p.name.replace(/\s*\(.*\)\s*$/, '');
}

/** The sites Ferry can download from: how many, and the featured ones in order. */
export function useDownloadable() {
  const platforms = usePlatforms((s) => s.platforms);
  return useMemo(() => {
    const list = platforms.filter(isDownloadable);
    const featured = FEATURED.map((id) => list.find((p) => p.id === id)).filter(Boolean);
    return { total: list.length, featured };
  }, [platforms]);
}

function MoreTile({ count, className }) {
  const { t } = useI18n();
  if (count <= 0) return null;
  return (
    <li className={className}>
      <Link to="/sites" aria-label={t('where.more', { count })} className="flex flex-col items-center gap-1.5 rounded-2xl px-0.5 pb-1.5 pt-2 text-ink-2 transition-colors hover:bg-field">
        <span className="grid size-[52px] place-items-center rounded-[14px] bg-field text-[15px] font-bold tabular-nums">+{count}</span>
        <span className="text-[11.5px] font-semibold">{t('where.moreShort')}</span>
      </Link>
    </li>
  );
}

export function WherePanel({ matchId = null }) {
  const { t } = useI18n();
  const { total, featured } = useDownloadable();
  const sites = useLiveStatus((s) => s.sites);

  useEffect(() => {
    useLiveStatus.getState().load();
  }, []);

  if (!total) return null;
  const tiles = featured.slice(0, SHOW.wide);
  const shown = tiles.some((p) => p.id === matchId);
  const anyLive = tiles.some((p) => liveDot(sites[p.id]));

  return (
    <section aria-labelledby="where-title" className="self-start rounded-[28px] bg-paper px-4 pb-4 pt-5 text-ink shadow-card sm:px-6">
      <div className="flex items-center gap-3 px-1">
        <h2 id="where-title" className="heading text-[19px]">
          {t('where.title')}
        </h2>
        <span className="ms-auto shrink-0 text-[13px] font-semibold text-ink-2 tabular-nums">{t('where.count', { count: total })}</span>
      </div>
      <p className="mb-2 mt-0.5 px-1 text-[13px] leading-snug text-ink-2">{t('where.sub')}</p>

      <ul className="grid grid-cols-4 gap-0.5 sm:grid-cols-7">
        {tiles.map((p, i) => {
          const dot = liveDot(sites[p.id]);
          const match = p.id === matchId;
          const label = `${p.name}: ${t(`status.${siteStatus(p)}`)}${dot ? `. ${liveLabel(dot, t)}` : ''}`;
          return (
            <li key={p.id} className={cx(i >= SHOW.phone && 'hidden sm:block')}>
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
                  className={cx('transition-transform duration-300', match && '-translate-y-1 scale-[1.08] shadow-[0_0_0_3px_var(--paper),0_0_0_5.5px_var(--ink)]')}
                />
                <span className="max-w-full truncate text-[11.5px] font-semibold">{shortName(p)}</span>
              </Link>
            </li>
          );
        })}
        <MoreTile count={total - Math.min(tiles.length, SHOW.phone)} className="sm:hidden" />
        <MoreTile count={total - tiles.length} className="hidden sm:block" />
      </ul>
      <p className="mt-1.5 px-1 text-[12.5px] text-ink-2">{t('where.permNote')}</p>

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
