import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { History as HistoryIcon, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { bytes, dayLabel, duration } from '../lib/format.js';
import { useAnalysis } from '../state/analysis.js';
import { useHistory } from '../state/history.js';
import { useSettings } from '../state/settings.js';
import { Button, EmptyState, IconButton, Segmented, Select, Sheet } from '../components/ui.jsx';
import { requestLabel } from './DownloadsPage.jsx';

const FINISHED = ['ready', 'saved', 'expired'];

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const entries = useHistory((s) => s.entries);
  const remove = useHistory((s) => s.remove);
  const clear = useHistory((s) => s.clear);
  const saveHistory = useSettings((s) => s.privacy.saveHistory);
  const again = useAnalysis((s) => s.again);
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('');
  const [filter, setFilter] = useState('all');
  const [details, setDetails] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const platforms = useMemo(() => [...new Map(entries.map((e) => [e.platformId, e.platformName])).entries()], [entries]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (platform && e.platformId !== platform) return false;
      if (filter === 'ready' && !FINISHED.includes(e.status)) return false;
      if (filter === 'failed' && FINISHED.includes(e.status)) return false;
      if (!needle) return true;
      return [e.title, e.uploader, e.platformName].some((x) => x?.toLowerCase().includes(needle));
    });
  }, [entries, q, platform, filter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of visible) {
      const k = dayLabel(e.createdAt, locale);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return [...map.entries()];
  }, [visible, locale]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('history.title')}</h1>
        {entries.length > 0 && (
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)}>
            {t('history.clear')}
          </Button>
        )}
      </div>
      {!saveHistory && (
        <p className="mt-3 text-ink-2">
          {t('history.off')}{' '}
          <Link to="/settings" className="font-semibold text-hull underline underline-offset-4 dark:text-signal">
            {t('nav.settings')}
          </Link>
        </p>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={HistoryIcon} title={t('history.empty.title')} body={t('history.empty.body')} />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="relative">
              <label htmlFor="history-search" className="sr-only">
                {t('history.search')}
              </label>
              <Search className="pointer-events-none absolute start-3 top-3 size-5 text-ink-2" aria-hidden="true" />
              <input
                id="history-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('history.search')}
                className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface ps-10 pe-3"
              />
            </div>
            <Select label={t('history.allPlatforms')} value={platform} onChange={setPlatform} options={[{ value: '', label: t('history.allPlatforms') }, ...platforms.map(([id, name]) => ({ value: id, label: name }))]} className="[&_label]:sr-only" />
          </div>
          <Segmented
            legend={t('history.title')}
            name="history-filter"
            value={filter}
            onChange={setFilter}
            className="mt-4 max-w-md [&_legend]:sr-only"
            options={[
              { value: 'all', label: t('history.filters.all') },
              { value: 'ready', label: t('history.filters.ready') },
              { value: 'failed', label: t('history.filters.failed') },
            ]}
          />

          {visible.length === 0 && <p className="mt-8 text-ink-2">{t('history.noMatch', { q })}</p>}
          {groups.map(([day, list]) => (
            <section key={day} className="mt-8">
              <h2 className="text-sm font-semibold text-ink-2">{day}</h2>
              <ul className="mt-2 divide-y divide-line border-t border-line">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setDetails(e)}>
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-2">
                        <span>{e.platformName}</span>
                        <span>{requestLabel(e.request)}</span>
                        {e.output?.[0]?.sizeBytes ? <span className="tabular-nums">{bytes(e.output[0].sizeBytes, { locale })}</span> : null}
                        {!FINISHED.includes(e.status) && <span className="text-buoy">{t(`downloads.status.${e.status}`)}</span>}
                      </span>
                    </button>
                    {e.sourceUrl && (
                      <IconButton
                        label={t('history.again')}
                        icon={RotateCcw}
                        onClick={() => {
                          again(e.sourceUrl, e.request);
                          navigate('/');
                        }}
                      />
                    )}
                    <IconButton label={t('history.delete')} icon={Trash2} onClick={() => remove(e.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <Sheet open={Boolean(details)} onClose={() => setDetails(null)} title={details?.title ?? ''} closeLabel={t('actions.close')}>
        {details && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-2">{t('history.fields.platform')}</dt>
            <dd>{details.platformName}</dd>
            <dt className="text-ink-2">{t('history.fields.format')}</dt>
            <dd>{requestLabel(details.request)}</dd>
            {details.durationSec != null && (
              <>
                <dt className="text-ink-2">{t('picker.trim.end')}</dt>
                <dd className="tabular-nums">{duration(details.durationSec)}</dd>
              </>
            )}
            <dt className="text-ink-2">{t('history.fields.size')}</dt>
            <dd className="tabular-nums">{bytes(details.output?.[0]?.sizeBytes, { locale }) ?? '—'}</dd>
            <dt className="text-ink-2">{t('history.fields.date')}</dt>
            <dd>{new Date(details.createdAt).toLocaleString(locale)}</dd>
            <dt className="text-ink-2">{t('history.fields.status')}</dt>
            <dd>{t(`downloads.status.${details.status === 'saved' ? 'ready' : details.status}`)}</dd>
            <dt className="text-ink-2">{t('history.fields.source')}</dt>
            <dd className="break-all">
              {details.sourceUrl ? (
                <a href={details.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-hull underline underline-offset-4 dark:text-signal">
                  {details.sourceUrl}
                </a>
              ) : (
                t('history.noSource')
              )}
            </dd>
          </dl>
        )}
      </Sheet>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title={t('history.clear')} closeLabel={t('actions.close')}>
        <p className="text-ink-2">{t('history.clearConfirm')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setConfirmClear(false)}>{t('actions.cancel')}</Button>
          <Button
            variant="primary"
            onClick={() => {
              clear();
              setConfirmClear(false);
            }}
          >
            {t('history.clear')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
