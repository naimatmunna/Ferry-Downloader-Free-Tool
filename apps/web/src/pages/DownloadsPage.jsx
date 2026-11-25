import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, Download, FileArchive, Hourglass, Inbox, Pause, Play, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react';
import { AUDIO_FORMATS, VIDEO_CONTAINERS, qualityLabel } from '@ferry/shared/formats';
import { useI18n, errorText } from '../lib/i18n/index.jsx';
import { bytes, eta, relativeTime, speed } from '../lib/format.js';
import { fileHref } from '../lib/api.js';
import { needsExternalDownload } from '../lib/env.js';
import { usePlatforms } from '../lib/registry.js';
import { useDownloads } from '../state/downloads.js';
import { useSettings } from '../state/settings.js';
import { toast } from '../state/toasts.js';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { SiteIcon, brandAccent } from '../components/SiteIcon.jsx';
import { Button, EmptyState, IconButton, Select, Sheet, Switch, cx } from '../components/ui.jsx';

const ACTIVE = ['queued', 'downloading', 'processing', 'paused'];

/** Short label for what a job produces ("1080p MP4", "MP3", "3 images"). */
export function requestLabel(request, t) {
  if (!request?.mode) return '';
  if (request.mode === 'gallery') return t ? t('gallery.title', { count: request.gallery?.items?.length ?? 0 }) : '';
  if (request.mode === 'audio') return AUDIO_FORMATS[request.audio?.format]?.label ?? '';
  const c = VIDEO_CONTAINERS[request.video?.container]?.label ?? '';
  const q = request.video?.quality;
  return q && q !== 'best' ? `${qualityLabel(q).short} ${c}` : c;
}

/** What a job produces, in words: "Video + sound, 1080p MP4". */
function metaLine(job, t) {
  const mode = job.request?.mode;
  const kind = mode === 'gallery' ? t('caps.images') : mode === 'audio' ? t('caps.audio') : mode === 'video' ? t('caps.video') : t('caps.av');
  return [kind, requestLabel(job.request, t)].filter(Boolean).join(', ');
}

const STATE_TONE = {
  queued: 'bg-field text-ink-2',
  downloading: 'bg-perm-soft text-perm',
  processing: 'bg-perm-soft text-perm',
  paused: 'bg-field text-ink-2',
  ready: 'bg-ok-soft text-ok',
  failed: 'bg-bad-soft text-bad',
  cancelled: 'bg-field text-ink-2',
  expired: 'bg-field text-ink-2',
};

function StatePill({ status }) {
  const { t } = useI18n();
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-bold', STATE_TONE[status])}>
      {status === 'ready' && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
      {status === 'failed' ? t('history.filters.failed') : t(`downloads.status.${status}`)}
    </span>
  );
}

function StatusLine({ job }) {
  const { t, locale } = useI18n();
  const p = job.progress ?? {};
  const parts = [];
  if (job.status === 'queued') parts.push(p.queuePosition ? t('downloads.linePosition', { n: p.queuePosition }) : t('downloads.status.queued'));
  if (job.status === 'downloading' || job.status === 'paused') {
    if (typeof p.percent === 'number') parts.push(`${Math.round(p.percent)}%`);
    if (job.status === 'downloading' && p.stage === 'merging') parts.push(t('downloads.merging'));
    else if (job.status === 'downloading' && (p.stage === 'video' || p.stage === 'audio')) parts.push(t(`downloads.${p.stage}`));
    if (p.stage === 'images' && p.itemsTotal) parts.push(t('downloads.images', { done: p.itemsDone ?? 0, total: p.itemsTotal }));
    const done = bytes(p.downloadedBytes, { locale });
    const total = bytes(p.totalBytes, { locale, approx: p.totalIsEstimate });
    if (done && total) parts.push(t('downloads.progress', { done, total }));
    else if (done) parts.push(done);
    if (job.status === 'downloading') {
      const sp = speed(p.speedBps, locale);
      if (sp) parts.push(sp);
      const left = eta(p.etaSec, t);
      if (left && p.etaSec > 0) parts.push(t('downloads.left', { eta: left }));
    }
  }
  if (job.status === 'processing') {
    if (typeof p.percent === 'number' && p.phase !== 'finalizing') parts.push(`${Math.round(p.percent)}%`);
    parts.push(p.phase === 'finalizing' ? t('downloads.finalizing') : t('downloads.converting', { what: requestLabel(job.request, t) }));
    if (p.stage === 'images' && p.itemsTotal && p.phase !== 'finalizing') parts.push(t('downloads.images', { done: p.itemsDone ?? 0, total: p.itemsTotal }));
  }
  if (!parts.length) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-ink-2 tabular-nums">
      {parts.map((x, i) => (
        <span key={i} className={i === 0 ? 'font-bold text-ink' : undefined}>
          {x}
        </span>
      ))}
    </p>
  );
}

/** Notes and extra files under a finished download. */
function ReadyNotes({ job }) {
  const { t, locale } = useI18n();
  const save = useDownloads((s) => s.save);
  const act = useDownloads((s) => s.act);
  const files = job.output?.files ?? [];
  const main = files[0];
  const gallery = job.request?.mode === 'gallery';
  const expiresAt = job.expiresAt ? Date.parse(job.expiresAt) : null;
  const soon = expiresAt && expiresAt - Date.now() < 20 * 60_000;
  return (
    <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink-2">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {!gallery && main?.transcoded && (
          <span className={cx('inline-flex items-center gap-1 font-semibold', main.transcoded.video || main.transcoded.audio ? 'text-ink-2' : 'text-ok')}>
            {!(main.transcoded.video || main.transcoded.audio) && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
            {main.transcoded.video || main.transcoded.audio ? t('downloads.converted') : t('downloads.copied')}
          </span>
        )}
        {gallery && (
          <span className="inline-flex items-center gap-1 font-semibold text-ok">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t('downloads.location')}
          </span>
        )}
        {job.output?.notes?.includes('source-has-no-audio') && <span>{t('downloads.notes.noAudio')}</span>}
        {job.output?.notes?.includes('trim-keyframe') && <span>{t('downloads.notes.keyframe')}</span>}
        {job.output?.notes?.includes('gallery-partial') && <span className="font-semibold text-warn">{t('downloads.notes.galleryPartial', { done: files.length, total: job.request.gallery?.items?.length ?? files.length })}</span>}
        {expiresAt && <span className={cx(soon && 'font-semibold text-warn')}>{t('downloads.expires', { when: relativeTime(expiresAt, locale) })}</span>}
        {job.actions?.extend && (
          <button type="button" className="font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]" onClick={() => act(job.id, 'extend').catch(() => {})}>
            {t('downloads.keepLonger')}
          </button>
        )}
      </p>
      {files.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {(gallery ? files : files.slice(1)).map((f) => (
            <li key={f.id} className="flex items-baseline gap-1.5">
              <button type="button" className="font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]" onClick={() => save(job.id, f.id)}>
                {gallery ? t('downloads.files.image', { n: f.index }) : f.kind === 'subtitle' ? t('downloads.files.subtitle', { lang: f.language ?? '' }) : t('downloads.files.thumbnail')}
              </button>
              {gallery && <span className="tabular-nums">{bytes(f.sizeBytes, { locale })}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Ticket({ job, token }) {
  const { t, locale } = useI18n();
  const act = useDownloads((s) => s.act);
  const remove = useDownloads((s) => s.remove);
  const save = useDownloads((s) => s.save);
  const saveArchive = useDownloads((s) => s.saveArchive);
  const again = useDownloads((s) => s.again);
  // Downloads started before Ferry remembered choices can't be redone from here.
  const canRedo = useDownloads((s) => Boolean(s.tracked[job.id]?.body));
  const [playing, setPlaying] = useState(null);
  const run = (action) => act(job.id, action).catch((err) => toast({ title: errorText(t, err), tone: 'error' }));
  const files = job.output?.files ?? [];
  const main = files[0];
  const gallery = job.request?.mode === 'gallery';
  const active = ACTIVE.includes(job.status);
  const title = job.source?.title ?? '…';

  return (
    <li className="ticket grid grid-cols-[var(--stub)_minmax(0,1fr)] rounded-[20px] bg-paper shadow-card max-sm:[--stub:4.25rem]">
      <div className="ticket-stub grid place-items-center py-4">
        <SiteIcon id={job.source?.platformId} name={job.source?.platformName} size={52} className="max-sm:size-[42px]!" />
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="min-w-0 truncate text-[16px] font-bold sm:text-[16.5px]">{title}</h2>
            <StatePill status={job.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13.5px] text-ink-2">
            <span>{job.source?.platformName}</span>
            <span>{metaLine(job, t)}</span>
            {job.status === 'ready' && main?.sizeBytes ? <span className="tabular-nums">{bytes(gallery && files.length > 1 ? files.reduce((n, f) => n + (f.sizeBytes ?? 0), 0) : main.sizeBytes, { locale })}</span> : null}
            {job.attempt > 1 && <span>{t('downloads.attempt', { n: job.attempt, max: job.maxAttempts })}</span>}
          </p>
          {active && job.status !== 'queued' && <ProgressBar job={job} accent={brandAccent(job.source?.platformId)} className="mt-3" />}
          {active && <StatusLine job={job} />}
          {job.status === 'ready' && <ReadyNotes job={job} />}
          {job.status === 'failed' && job.error && <p className="mt-2 max-w-[62ch] text-[13.5px] text-ink">{errorText(t, job.error)}</p>}
          {job.status === 'expired' && <p className="mt-2 max-w-[62ch] text-[13.5px] text-ink-2">{canRedo ? t('downloads.gone') : t('errors.JOB_EXPIRED')}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {job.status === 'ready' &&
            (gallery && files.length > 1 ? (
              <Button variant="primary" size="sm" icon={FileArchive} onClick={() => saveArchive(job.id)}>
                {t('downloads.saveAll')}
              </Button>
            ) : (
              main && (
                <Button variant="primary" size="sm" icon={Download} onClick={() => save(job.id, main.id)}>
                  {t('downloads.saveFile')}
                </Button>
              )
            ))}
          {/* A video or song with extra files (subtitles, thumbnail) can also come as one ZIP. */}
          {job.status === 'ready' && !gallery && files.length > 1 && (
            <Button size="sm" icon={FileArchive} onClick={() => saveArchive(job.id)}>
              {t('downloads.saveAll')}
            </Button>
          )}
          {job.status === 'ready' && main && /^(video|audio)\//.test(main.mime) && <IconButton label={t('downloads.play')} icon={Play} variant="soft" size="sm" onClick={() => setPlaying(main)} />}
          {job.status === 'expired' && canRedo && (
            <Button variant="primary" size="sm" icon={RotateCcw} onClick={() => again(job.id)}>
              {t('downloads.again')}
            </Button>
          )}
          {job.actions?.pause && (
            <Button size="sm" icon={Pause} onClick={() => run('pause')}>
              {t('downloads.pause')}
            </Button>
          )}
          {job.actions?.resume && (
            <Button size="sm" icon={Play} onClick={() => run('resume')}>
              {t('downloads.resume')}
            </Button>
          )}
          {job.actions?.retry && (
            <Button size="sm" icon={RotateCcw} onClick={() => run('retry')}>
              {t('downloads.retry')}
            </Button>
          )}
          {job.actions?.cancel ? (
            <IconButton label={t('downloads.cancel')} icon={X} variant="soft" size="sm" onClick={() => run('cancel')} />
          ) : (
            <IconButton label={t('downloads.remove')} icon={Trash2} variant="soft" size="sm" onClick={() => remove(job.id)} />
          )}
        </div>
      </div>
      <Sheet open={Boolean(playing)} onClose={() => setPlaying(null)} title={title} closeLabel={t('actions.close')} wide>
        {playing &&
          (playing.mime.startsWith('video/') ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video controls preload="metadata" className="w-full rounded-xl bg-black" src={fileHref(playing, token, { inline: true })} />
          ) : (
            <audio controls preload="metadata" className="w-full" src={fileHref(playing, token, { inline: true })} />
          ))}
      </Sheet>
    </li>
  );
}

function Aside() {
  const { t } = useI18n();
  const s = useSettings();
  const ttl = usePlatforms((x) => x.config?.limits?.jobTtlMinutes);
  return (
    <aside className="hidden flex-col gap-3.5 lg:flex">
      {ttl && (
        <section className="rounded-[20px] bg-paper p-5 shadow-card">
          <h2 className="font-bold">{t('downloads.aside.readyTitle')}</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">{t('downloads.aside.readyBody', { minutes: ttl })}</p>
        </section>
      )}
      <section className="rounded-[20px] bg-paper p-5 shadow-card">
        <h2 className="font-bold">{t('downloads.aside.whileTitle')}</h2>
        <div className="mt-1 divide-y divide-line text-[14px]">
          <Switch checked={s.autoSave} onChange={(v) => s.update({ autoSave: v })} label={t('settings.autoSave.label')} />
          <Switch checked={s.privacy.deleteAfterSave} onChange={(v) => s.setPrivacy({ deleteAfterSave: v })} label={t('settings.deleteAfter.label')} />
          <Select label={t('settings.concurrency.label')} value={s.concurrency} onChange={(v) => s.update({ concurrency: Number(v) })} options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} className="pt-3" />
        </div>
        <Link to="/settings" className="mt-3 inline-block text-[13.5px] font-semibold underline decoration-[1.5px] underline-offset-[3px]">
          {t('downloads.aside.settings')}
        </Link>
      </section>
      <section className="rounded-[20px] bg-paper p-5 shadow-card">
        <h2 className="font-bold">{t('downloads.aside.historyTitle')}</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">{t('downloads.aside.historyBody')}</p>
        <Link to="/history" className="mt-2 inline-block text-[13.5px] font-semibold underline decoration-[1.5px] underline-offset-[3px]">
          {t('downloads.aside.openHistory')}
        </Link>
      </section>
    </aside>
  );
}

export default function DownloadsPage() {
  const { t } = useI18n();
  const tracked = useDownloads((s) => s.tracked);
  const jobs = useDownloads((s) => s.jobs);
  const queue = useDownloads((s) => s.queue);
  const clearFinished = useDownloads((s) => s.clearFinished);
  const [filter, setFilter] = useState('all');
  const items = useMemo(
    () =>
      Object.values(tracked)
        .sort((a, b) => b.addedAt - a.addedAt)
        .map((x) => ({ x, job: jobs[x.id] }))
        .filter((r) => r.job),
    [tracked, jobs],
  );
  const count = (pred) => items.filter((r) => pred(r.job.status)).length;
  const nActive = count((s) => ACTIVE.includes(s));
  const nReady = count((s) => s === 'ready');
  const nAttention = count((s) => s === 'failed');
  const anySettled = items.some((r) => !ACTIVE.includes(r.job.status));
  const shown = items.filter((r) => filter === 'all' || (filter === 'active' ? ACTIVE.includes(r.job.status) : r.job.status === 'ready'));
  const summary = [
    nActive && t('downloads.summary.active', { count: nActive }),
    nReady && t('downloads.summary.ready', { count: nReady }),
    nAttention && t('downloads.summary.attention', { count: nAttention }),
    queue.length && t('downloads.summary.waiting', { count: queue.length }),
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-8 sm:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.15rem] sm:text-[2.75rem]">{t('downloads.title')}</h1>
          {summary.length > 0 && <p className="mt-2 text-[15px] text-ink-2">{summary.join(', ')}</p>}
        </div>
        {anySettled && (
          <Button variant="line" size="sm" onClick={clearFinished}>
            {t('downloads.clearFinished')}
          </Button>
        )}
      </div>
      {needsExternalDownload() && <p className="mt-4 rounded-xl bg-perm-soft px-3.5 py-2.5 text-sm text-perm">{t('downloads.iosHint')}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {items.length > 0 && (
            <div className="mb-4 flex gap-1.5" role="group" aria-label={t('downloads.title')}>
              {['all', 'active', 'ready'].map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={cx('inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors', filter === f ? 'bg-primary text-primary-ink' : 'bg-field text-ink-2 hover:text-ink')}
                >
                  {t(`downloads.filters.${f}`)}
                  <span className={cx('font-bold tabular-nums', filter !== f && 'text-ink')}>{f === 'all' ? items.length : f === 'active' ? nActive : nReady}</span>
                </button>
              ))}
            </div>
          )}

          {queue.length > 0 && (
            <ul className="mb-4 grid gap-2">
              {queue.map((q, i) => (
                <li key={`${q.body.probeId}-${q.body.entryId ?? ''}-${i}`} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
                  <Hourglass className="size-4 shrink-0 text-ink-2" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{q.meta?.title}</span>
                  <span className="text-ink-2">{t('batch.status.pending')}</span>
                </li>
              ))}
            </ul>
          )}

          {items.length === 0 && queue.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t('downloads.empty.title')}
              body={t('downloads.empty.body')}
              action={
                <Link to="/" className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-5 font-bold text-primary-ink hover:bg-primary-hover">
                  {t('downloads.empty.action')}
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-3.5">
              {shown.map(({ x, job }) => (
                <Ticket key={x.id} job={job} token={x.token} />
              ))}
            </ul>
          )}
        </div>
        <Aside />
      </div>
    </div>
  );
}
