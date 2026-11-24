import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { api } from '../lib/api.js';
import { usePlatforms } from '../lib/registry.js';
import { PolicyBadge, cx } from '../components/ui.jsx';

const POLICY_ORDER = ['allowed', 'attestation', 'export_only', 'blocked', 'disabled'];
const HEALTH_TONE = { operational: 'text-kelp', degraded: 'text-amber', failing: 'text-buoy', unknown: 'text-ink-2' };

export default function PlatformsPage() {
  const { t } = useI18n();
  const platforms = usePlatforms((s) => s.platforms);
  const [q, setQ] = useState('');
  const [policy, setPolicy] = useState('all');
  const [health, setHealth] = useState({});

  useEffect(() => {
    api.status().then((s) => setHealth(s.platforms ?? {}), () => {});
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return platforms
      .filter((p) => p.id !== 'generic' && p.id !== 'direct')
      .filter((p) => policy === 'all' || p.policy === policy)
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.hosts.some((h) => h.includes(needle)))
      .sort((a, b) => POLICY_ORDER.indexOf(a.policy) - POLICY_ORDER.indexOf(b.policy) || a.name.localeCompare(b.name));
  }, [platforms, q, policy]);

  const counts = useMemo(() => Object.fromEntries(POLICY_ORDER.map((p) => [p, platforms.filter((x) => x.policy === p && x.id !== 'generic' && x.id !== 'direct').length])), [platforms]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('platforms.title')}</h1>
      <p className="mt-2 max-w-[60ch] text-ink-2">{t('platforms.lede')}</p>

      <section aria-labelledby="cats" className="mt-8">
        <h2 id="cats" className="text-lg font-bold">
          {t('categories.title')}
        </h2>
        <ol className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-hull text-xs font-bold text-hull tabular-nums dark:border-signal dark:text-signal">
                {n}
              </span>
              <div>
                <h3 className="font-semibold">{t(`categories.${n}.title`)}</h3>
                <p className="text-sm text-ink-2">{t(`categories.${n}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label htmlFor="pf-search" className="sr-only">
            {t('platforms.search')}
          </label>
          <Search className="pointer-events-none absolute start-3 top-3 size-5 text-ink-2" aria-hidden="true" />
          <input id="pf-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('platforms.search')} className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface ps-10 pe-3" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('platforms.title')}>
        {['all', ...POLICY_ORDER].map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={policy === p}
            onClick={() => setPolicy(p)}
            className={cx('flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold', policy === p ? 'border-hull bg-hull text-hull-ink' : 'border-line bg-surface hover:border-line-strong')}
          >
            {p === 'all' ? t('platforms.filters.all') : t(`policy.${p}`)}
            <span className="tabular-nums opacity-75">{p === 'all' ? platforms.length - 2 : counts[p]}</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink-2" aria-live="polite">
        {list.length ? t('platforms.count', { count: list.length }) : t('platforms.none', { q })}
      </p>
      <ul className="mt-2 divide-y divide-line border-t border-line">
        {list.map((p) => {
          const h = health[p.id];
          return (
            <li key={p.id}>
              <details className="group">
                <summary className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className="min-w-[10rem] flex-1 font-semibold">{p.name}</span>
                  <span className="text-sm text-ink-2">{p.content.map((c) => t(`platforms.content.${c}`)).join(', ')}</span>
                  {h && <span className={cx('text-sm font-semibold', HEALTH_TONE[h.status])}>{t(`platforms.health.${h.status}`)}</span>}
                  <PolicyBadge policy={p.available === false && p.policy !== 'blocked' ? 'disabled' : p.policy} label={p.available === false && p.policy !== 'blocked' ? t('policy.unavailable') : t(`policy.${p.policy}`)} />
                </summary>
                <div className="flex flex-col gap-2 pb-4 text-sm">
                  <p>{t(`policy.explain.${p.policy}`)}</p>
                  {p.reason && <p className="font-semibold">{p.reason}</p>}
                  {p.restrictions && <p className="text-ink-2">{p.restrictions}</p>}
                  {p.license && <p className="text-ink-2">{t('preview.license', { license: p.license })}</p>}
                  {h && <p className="text-ink-2">{t('platforms.healthTitle', { rate: h.successRate, count: h.attempts })}</p>}
                  <p className="text-ink-2">
                    {t(`platforms.reliability.${p.reliability}`)}. {p.hosts.slice(0, 4).join(', ')}
                  </p>
                  {p.routes?.length > 0 && (
                    <div>
                      <p className="font-semibold">{t('platforms.routes')}</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {p.routes.map((r) => (
                          <li key={r.label}>
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-hull underline underline-offset-4 dark:text-signal">
                                {r.label}
                              </a>
                            ) : (
                              r.label
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-ink-2">{t('platforms.checked', { date: p.lastChecked })}</p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
