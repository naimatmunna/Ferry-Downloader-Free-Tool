/**
 * The sites Ferry can download from, with one plain answer each: what it
 * allows, why, the site's own download routes, and live status from this
 * server. Sites Ferry can't download from aren't listed: searching for one
 * says why, and a direct link (?site=) still opens its details.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronDown, Search } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { usePlatforms } from '../lib/registry.js';
import { hiddenReason, isDownloadable, liveDot, shelfOf, siteStatus } from '../lib/siteStatus.js';
import { useLiveStatus } from '../state/liveStatus.js';
import { FEATURED } from '../features/downloader/WherePanel.jsx';
import { RouteList } from '../features/downloader/Panels.jsx';
import { SiteIcon } from '../components/SiteIcon.jsx';
import { LivePill, StatusPill, liveLabel } from '../components/StatusPill.jsx';
import { Sheet, cx } from '../components/ui.jsx';

const FILTERS = ['all', 'free', 'perm'];
/** At most this many unlisted sites are explained for one search. */
const MAX_HIDDEN = 3;
const rank = (id) => {
  const i = FEATURED.indexOf(id);
  return i === -1 ? FEATURED.length : i;
};

const WIDE = '(min-width: 1024px)';

/** True on screens wide enough for the side detail panel (Tailwind's lg). */
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE);
    if (!mq) return undefined;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** `inSheet`: the sheet's own title already names the site, so the heading is not repeated. */
function Detail({ platform, live: liveEntry, headingId, inSheet = false }) {
  const { t } = useI18n();
  const status = siteStatus(platform);
  // Live status only for sites Ferry downloads from.
  const direct = shelfOf(status) === 'direct';
  const live = direct ? liveEntry : null;
  // Allowed, but known to fail (only reachable through a direct link or a search).
  const broken = hiddenReason(platform) === 'broken';
  const types = (platform.content ?? []).filter((c) => c !== 'playlist').map((c) => t(`platforms.content.${c}`));
  return (
    <>
      <div className="flex items-center gap-3.5">
        <SiteIcon id={platform.id} name={platform.name} size={inSheet ? 48 : 64} />
        <div className="min-w-0">
          {!inSheet && (
            <h2 id={headingId} tabIndex={-1} className="heading text-2xl leading-tight">
              {platform.name}
            </h2>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusPill status={status} />
            <LivePill live={live} surface="field" />
          </div>
        </div>
      </div>
      {types.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-bold">{t('sites.has')}</h3>
          <p className="mt-1 text-sm text-ink-2">{types.join(', ')}</p>
        </>
      )}
      <h3 className="mt-5 text-sm font-bold">{t('sites.handles')}</h3>
      {broken && <p className="mt-1 text-sm font-semibold">{t('sites.hidden.broken', { name: platform.name })}</p>}
      <p className="mt-1 text-sm text-ink-2">{t(`sites.explain.${status}`)}</p>
      {platform.reason && <p className="mt-1.5 text-sm font-semibold">{platform.reason}</p>}
      {platform.attestation && status === 'perm' && <p className="mt-1.5 text-sm text-ink-2">{platform.attestation}</p>}
      {platform.restrictions && <p className="mt-1.5 text-sm text-ink-2">{platform.restrictions}</p>}
      {platform.routes?.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-bold">{t('sites.routes', { name: platform.name })}</h3>
          <RouteList routes={platform.routes} />
        </>
      )}
      {direct && (
        <>
          <h3 className="mt-5 text-sm font-bold">{t('sites.live')}</h3>
          <p className="mt-1 text-sm text-ink-2">{live ? t('live.detail', { window: t(`live.window.${live.window}`), rate: Math.round(live.successRate), count: live.attempts }) : t('live.none')}</p>
        </>
      )}
      {(status === 'free' || status === 'perm') && platform.reliability && (
        <>
          <h3 className="mt-5 text-sm font-bold">{t('sites.tools')}</h3>
          <p className="mt-1 text-sm text-ink-2">{t(`platforms.reliability.${platform.reliability}`)}</p>
        </>
      )}
      {platform.lastChecked && <p className="mt-5 text-xs text-ink-3">{t('sites.checked', { date: platform.lastChecked })}</p>}
    </>
  );
}

/** A search found a site Ferry can't download from: say it isn't listed, and why. */
function HiddenHit({ platform, onDetails }) {
  const { t } = useI18n();
  const reason = hiddenReason(platform);
  const why = reason === 'broken' ? t('sites.hidden.broken', { name: platform.name }) : t(`status.say.${reason}`, { name: platform.name });
  return (
    <li className="flex items-start gap-3.5 rounded-[18px] bg-paper p-4 shadow-card">
      <SiteIcon id={platform.id} name={platform.name} size={48} />
      <div className="min-w-0">
        <p className="font-bold leading-snug text-ink">{t('sites.hidden.title', { name: platform.name })}</p>
        <p className="mt-1 text-sm text-ink-2">{why}</p>
        <button
          type="button"
          onClick={onDetails}
          aria-label={t('sites.hidden.detailsFor', { name: platform.name })}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]"
        >
          {t('sites.hidden.details')}
        </button>
      </div>
    </li>
  );
}

export default function SitesPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const platforms = usePlatforms((s) => s.platforms);
  const liveSites = useLiveStatus((s) => s.sites);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const selectedId = params.get('site');
  const wide = useWide();
  // Phones show the detail in a sheet; arriving from a Home logo opens it straight away.
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(selectedId));

  useEffect(() => {
    useLiveStatus.getState().load();
  }, []);

  // Every site Ferry knows, in Home's order. Only the ones it can download from are listed.
  const all = useMemo(
    () =>
      platforms
        .filter((p) => p.id !== 'generic' && p.id !== 'direct')
        .map((p) => ({ p, status: siteStatus(p), listed: isDownloadable(p) }))
        .sort((a, b) => rank(a.p.id) - rank(b.p.id) || a.p.name.localeCompare(b.p.name)),
    [platforms],
  );
  const listed = useMemo(() => all.filter((x) => x.listed), [all]);
  const counts = useMemo(() => {
    const c = { all: listed.length, free: 0, perm: 0 };
    for (const x of listed) c[x.status] += 1;
    return c;
  }, [listed]);
  const needle = q.trim().toLowerCase();
  const matches = (p) => !needle || p.name.toLowerCase().includes(needle) || p.hosts.some((h) => h.includes(needle));
  const list = listed.filter((x) => (filter === 'all' || x.status === filter) && matches(x.p));
  // Nothing listed matches: explain the matching sites Ferry can't download from instead.
  const hidden = needle && !list.length ? all.filter((x) => !x.listed && matches(x.p)).slice(0, MAX_HIDDEN) : [];
  // A direct link (from Home, or an error's "How Ferry decides") opens any site, listed or not.
  const selected = all.find((x) => x.p.id === selectedId)?.p ?? null;

  // Wide screens: picking a card moves keyboard focus to its detail, so nobody tabs past every card to reach it.
  const focusDetail = useRef(false);
  useEffect(() => {
    if (!focusDetail.current) return;
    focusDetail.current = false;
    document.getElementById('site-detail')?.focus();
  }, [selectedId]);

  function choose(id) {
    if (wide && id === selectedId) {
      document.getElementById('site-detail')?.focus();
      return;
    }
    focusDetail.current = wide;
    const next = new URLSearchParams(params);
    next.set('site', id);
    setParams(next, { replace: true });
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-8 sm:pt-9">
      <h1 className="display text-[2.15rem] sm:text-[2.75rem]">{t('sites.title')}</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] text-ink-2">{t('sites.lede', { count: listed.length })}</p>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-12 items-center gap-2.5 rounded-[var(--radius-control)] bg-paper px-4 text-ink-3 shadow-[inset_0_0_0_1.5px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)] lg:w-80">
          <Search className="size-5 shrink-0" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sites.search')} aria-label={t('sites.search')} className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none" />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label={t('sites.title')}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors', filter === f ? 'bg-primary text-primary-ink' : 'bg-field text-ink-2 hover:text-ink')}
            >
              {t(`sites.filters.${f}`)}
              <span className={cx('font-bold tabular-nums', filter !== f && 'text-ink')}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <details className="group mt-4 rounded-2xl bg-paper px-4 shadow-card">
        <summary className="flex min-h-12 items-center justify-between font-bold">
          {t('sites.decides')}
          <ChevronDown aria-hidden="true" className="size-5 text-ink-2 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="grid gap-3 border-t border-line py-4 sm:grid-cols-2">
          {['free', 'perm'].map((s) => (
            <li key={s} className="flex flex-col items-start gap-1.5">
              <StatusPill status={s} />
              <p className="text-sm text-ink-2">{t(`sites.explain.${s}`)}</p>
            </li>
          ))}
          <li className="border-t border-dashed border-line-2 pt-3 sm:col-span-2">
            <p className="text-sm font-bold">{t('sites.whyNot.title')}</p>
            <p className="mt-1 text-sm text-ink-2">{t('sites.whyNot.body')}</p>
          </li>
        </ul>
      </details>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* The detail comes first in keyboard order and sits on the right on wide screens. */}
        <section aria-labelledby="site-detail" className="hidden rounded-[var(--radius-card)] bg-paper p-6 shadow-card lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:block">
          {selected ? <Detail platform={selected} live={liveDot(liveSites[selected.id])} headingId="site-detail" /> : <p id="site-detail" className="text-ink-2">{t('sites.pick')}</p>}
        </section>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <p className="mb-3 text-sm text-ink-2" aria-live="polite">
            {list.length ? t('sites.count', { count: list.length }) : hidden.length ? t('sites.noneListed', { q }) : t('sites.none', { q })}
          </p>
          {hidden.length > 0 && (
            <>
              <ul className="grid gap-2.5">
                {hidden.map(({ p }) => (
                  <HiddenHit key={p.id} platform={p} onDetails={() => choose(p.id)} />
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-2">{t('sites.stillTries')}</p>
            </>
          )}
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {list.map(({ p, status }) => {
              const live = liveDot(liveSites[p.id]);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={p.id === selectedId ? 'true' : undefined}
                    onClick={() => choose(p.id)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-[18px] bg-paper p-3 text-start transition-shadow',
                      p.id === selectedId ? 'shadow-[inset_0_0_0_2px_var(--ink)]' : 'hover:shadow-[inset_0_0_0_1.5px_var(--line-2)]',
                    )}
                  >
                    <SiteIcon id={p.id} name={p.name} size={44} live={live?.tone} />
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <span className="max-w-full truncate text-[15px] font-bold">{p.name}</span>
                      <StatusPill status={status} />
                      {live && <span className="sr-only">{liveLabel(live, t)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Phones: the detail opens as a sheet (never on wide screens: a modal there would block the page). */}
      {!wide && (
        <Sheet open={Boolean(selected) && sheetOpen} onClose={() => setSheetOpen(false)} title={selected?.name ?? ''} closeLabel={t('actions.close')}>
          {selected && <Detail platform={selected} live={liveDot(liveSites[selected.id])} inSheet />}
        </Sheet>
      )}
    </div>
  );
}
