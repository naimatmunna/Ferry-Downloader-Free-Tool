import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { History as HistoryIcon, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { bytes, dayLabel, duration } from '../lib/format.js';
import { useAnalysis } from '../state/analysis.js';
import { useHistory } from '../state/history.js';
import { useSettings } from '../state/settings.js';
import { SiteIcon } from '../components/SiteIcon.jsx';
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
    <div className="mx-auto max-w-[960px] px-4 pt-6 sm:px-8 sm:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[2.15rem] sm:text-[2.75rem]">{t('history.title')}</h1>
        {entries.length > 0 && (
          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)}>
            {t('history.clear')}
          </Button>
        )}
      </div>
      {!saveHistory && (
        <p className="mt-3 text-ink-2">
          {t('history.off')}{' '}
          <Link to="/settings" className="font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
            {t('nav.settings')}
          </Link>
        </p>
      )}

      {entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={HistoryIcon} title={t('history.empty.title')} body={t('history.empty.body')} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="flex h-12 items-center gap-2.5 rounded-[var(--radius-control)] bg-paper px-4 text-ink-3 shadow-[inset_0_0_0_1.5px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)]">
              <Search className="size-5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t('history.search')}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('history.search')} className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none" />
            </label>
            <Select label={t('history.allPlatforms')} value={platform} onChange={setPlatform} options={[{ value: '', label: t('history.allPlatforms') }, ...platforms.map(([id, name]) => ({ value: id, label: name }))]} className="[&_label]:sr-only" />
          </div>
          <Segmented
            legend={t('history.title')}
            legendClassName="sr-only"
            name="history-filter"
            value={filter}
            onChange={setFilter}
            className="mt-3 max-w-md"
            options={[
              { value: 'all', label: t('history.filters.all') },
              { value: 'ready', label: t('history.filters.ready') },
              { value: 'failed', label: t('history.filters.failed') },
            ]}
          />

          {visible.length === 0 && <p className="mt-8 text-ink-2">{t('history.noMatch', { q })}</p>}
          {groups.map(([day, list]) => (
            <section key={day} className="mt-7">
              <h2 className="mb-2 text-sm font-bold text-ink-2">{day}</h2>
              <ul className="grid gap-2">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-paper p-2.5 pe-2">
                    <SiteIcon id={e.platformId} name={e.platformName} size={42} />
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setDetails(e)}>
                      <span className="block truncate font-bold">{e.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-2">
                        <span>{e.platformName}</span>
                        <span>{requestLabel(e.request, t)}</span>
                        {e.output?.[0]?.sizeBytes ? <span className="tabular-nums">{bytes(e.output[0].sizeBytes, { locale })}</span> : null}
                        {!FINISHED.includes(e.status) && <span className="font-semibold text-bad">{t(`downloads.status.${e.status}`)}</span>}
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
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-ink-2">{t('history.fields.platform')}</dt>
            <dd className="flex items-center gap-2">
              <SiteIcon id={details.platformId} name={details.platformName} size={22} />
              {details.platformName}
            </dd>
            <dt className="text-ink-2">{t('history.fields.format')}</dt>
            <dd>{requestLabel(details.request, t)}</dd>
            {details.durationSec != null && (
              <>
                <dt className="text-ink-2">{t('preview.length')}</dt>
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
                <a href={details.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-[1.5px] underline-offset-[3px]">
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
          <Button variant="line" onClick={() => setConfirmClear(false)}>
            {t('actions.cancel')}
          </Button>
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
