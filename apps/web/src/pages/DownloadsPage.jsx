import { useState } from 'react';
import { Link } from 'react-router';
import { Download, FileArchive, Film, Hourglass, Inbox, Music, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import { AUDIO_FORMATS, VIDEO_CONTAINERS, qualityLabel } from '@ferry/shared/formats';
import { useI18n, errorText } from '../lib/i18n/index.jsx';
import { bytes, eta, relativeTime, speed } from '../lib/format.js';
import { fileHref } from '../lib/api.js';
import { needsExternalDownload } from '../lib/env.js';
import { useDownloads } from '../state/downloads.js';
import { toast } from '../state/toasts.js';
import { RouteLine } from '../components/RouteLine.jsx';
import { Button, EmptyState, IconButton, Sheet, cx } from '../components/ui.jsx';

export function requestLabel(request) {
  if (!request?.mode) return '';
  if (request.mode === 'audio') return AUDIO_FORMATS[request.audio?.format]?.label ?? '';
  const c = VIDEO_CONTAINERS[request.video?.container]?.label ?? '';
  const q = request.video?.quality;
  return q && q !== 'best' ? `${qualityLabel(q).short} ${c}` : c;
}

function StatusLine({ job }) {
  const { t, locale } = useI18n();
  const p = job.progress ?? {};
  const parts = [];
  if (job.status === 'queued') parts.push(p.queuePosition ? t('downloads.linePosition', { n: p.queuePosition }) : t('downloads.status.queued'));
  if (job.status === 'downloading' || job.status === 'paused') {
    if (job.status === 'paused') parts.push(t('downloads.status.paused'));
    else if (p.stage === 'merging') parts.push(t('downloads.merging'));
    else if (p.stage === 'video' || p.stage === 'audio') parts.push(t(`downloads.${p.stage}`));
    else parts.push(t('downloads.status.downloading'));
    if (typeof p.percent === 'number') parts.push(`${Math.round(p.percent)}%`);
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
    parts.push(p.phase === 'finalizing' ? t('downloads.finalizing') : t('downloads.status.processing'));
    if (typeof p.percent === 'number' && p.phase !== 'finalizing') parts.push(`${Math.round(p.percent)}%`);
  }
  if (!parts.length) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2 tabular-nums">
      {parts.map((x, i) => (
        <span key={i} className={i === 0 ? 'font-semibold text-ink' : undefined}>
          {x}
        </span>
      ))}
    </p>
  );
}

function ReadyFiles({ job, token, onPlay }) {
  const { t, locale } = useI18n();
  const save = useDownloads((s) => s.save);
  const saveArchive = useDownloads((s) => s.saveArchive);
  const act = useDownloads((s) => s.act);
  const files = job.output?.files ?? [];
  const expiresAt = job.expiresAt ? Date.parse(job.expiresAt) : null;
  const soon = expiresAt && expiresAt - Date.now() < 20 * 60_000;
  const main = files[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {main && (
          <Button variant="primary" icon={Download} onClick={() => save(job.id, main.id)}>
            {t('downloads.save')}
            <span className="font-normal tabular-nums opacity-80">{bytes(main.sizeBytes, { locale })}</span>
          </Button>
        )}
        {main && /^(video|audio)\//.test(main.mime) && (
          <Button icon={Play} onClick={() => onPlay(main)}>
            {t('downloads.play')}
          </Button>
        )}
        {files.length > 1 && (
          <Button icon={FileArchive} onClick={() => saveArchive(job.id)}>
            {t('downloads.saveAll')}
          </Button>
        )}
      </div>
      {files.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {files.slice(1).map((f) => (
            <li key={f.id}>
              <button type="button" className="font-semibold text-hull underline-offset-4 hover:underline dark:text-signal" onClick={() => save(job.id, f.id)}>
                {f.kind === 'subtitle' ? t('downloads.files.subtitle', { lang: f.language ?? '' }) : t('downloads.files.thumbnail')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
        {main?.transcoded && <span>{main.transcoded.video || main.transcoded.audio ? t('downloads.converted') : t('downloads.copied')}</span>}
        {job.output?.notes?.includes('source-has-no-audio') && <span>{t('downloads.notes.noAudio')}</span>}
        {job.output?.notes?.includes('trim-keyframe') && <span>{t('downloads.notes.keyframe')}</span>}
        {expiresAt && <span className={cx(soon && 'font-semibold text-amber')}>{t('downloads.expires', { when: relativeTime(expiresAt, locale) })}</span>}
        {soon && job.actions?.extend && (
          <button type="button" className="font-semibold text-hull underline underline-offset-4 dark:text-signal" onClick={() => act(job.id, 'extend').catch(() => {})}>
            {t('downloads.keepLonger')}
          </button>
        )}
      </p>
    </div>
  );
}

function JobItem({ job, token }) {
  const { t } = useI18n();
  const act = useDownloads((s) => s.act);
  const remove = useDownloads((s) => s.remove);
  const [playing, setPlaying] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const Icon = job.request?.mode === 'audio' ? Music : Film;
  const run = (action) => act(job.id, action).catch((err) => toast({ title: errorText(t, err), tone: 'error' }));

  return (
    <li className="flex gap-4 py-5">
      <div className="hidden size-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-2 sm:block">
        {job.source?.thumbnailUrl && imgOk ? (
          <img src={job.source.thumbnailUrl} alt="" className="size-full object-cover" loading="lazy" onError={() => setImgOk(false)} />
        ) : (
          <div className="flex size-full items-center justify-center text-ink-2">
            <Icon className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{job.source?.title ?? '…'}</h2>
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-2">
              <span>{job.source?.platformName}</span>
              <span>{requestLabel(job.request)}</span>
              {job.attempt > 1 && <span>{t('downloads.attempt', { n: job.attempt, max: job.maxAttempts })}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            {job.actions?.pause && <IconButton label={t('downloads.pause')} icon={Pause} onClick={() => run('pause')} />}
            {job.actions?.resume && <IconButton label={t('downloads.resume')} icon={Play} onClick={() => run('resume')} />}
            {job.actions?.retry && <IconButton label={t('downloads.retry')} icon={RotateCcw} onClick={() => run('retry')} />}
            {job.actions?.cancel && <IconButton label={t('downloads.cancel')} icon={Square} onClick={() => run('cancel')} />}
            {!job.actions?.cancel && <IconButton label={t('downloads.remove')} icon={Trash2} onClick={() => remove(job.id)} />}
          </div>
        </div>
        {job.status !== 'expired' && <RouteLine job={job} />}
        <StatusLine job={job} />
        {job.status === 'ready' && <ReadyFiles job={job} token={token} onPlay={setPlaying} />}
        {job.status === 'failed' && job.error && <p className="text-sm font-semibold text-buoy">{errorText(t, job.error)}</p>}
        {(job.status === 'cancelled' || job.status === 'expired') && <p className="text-sm text-ink-2">{t(`downloads.status.${job.status}`)}</p>}
      </div>
      <Sheet open={Boolean(playing)} onClose={() => setPlaying(null)} title={job.source?.title ?? ''} closeLabel={t('actions.close')}>
        {playing && (playing.mime.startsWith('video/') ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video controls preload="metadata" className="w-full rounded-[var(--radius-control)] bg-black" src={fileHref(playing, token, { inline: true })} />
        ) : (
          <audio controls preload="metadata" className="w-full" src={fileHref(playing, token, { inline: true })} />
        ))}
      </Sheet>
    </li>
  );
}

export default function DownloadsPage() {
  const { t } = useI18n();
  const tracked = useDownloads((s) => s.tracked);
  const jobs = useDownloads((s) => s.jobs);
  const queue = useDownloads((s) => s.queue);
  const clearFinished = useDownloads((s) => s.clearFinished);
  const items = Object.values(tracked)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((x) => ({ x, job: jobs[x.id] }))
    .filter((r) => r.job);
  const anySettled = items.some((r) => !['queued', 'downloading', 'processing', 'paused'].includes(r.job.status));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('downloads.title')}</h1>
        {anySettled && (
          <Button variant="ghost" size="sm" onClick={clearFinished}>
            {t('downloads.clearFinished')}
          </Button>
        )}
      </div>
      {needsExternalDownload() && <p className="mt-3 rounded-[var(--radius-control)] bg-sea-soft px-3 py-2 text-sm text-sea">{t('downloads.iosHint')}</p>}

      {queue.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {queue.map((q, i) => (
            <li key={`${q.body.probeId}-${q.body.entryId ?? ''}-${i}`} className="flex items-center gap-3 py-3 text-sm">
              <Hourglass className="size-4 shrink-0 text-ink-2" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{q.meta?.title}</span>
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
            <Link to="/" className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-signal px-4 font-semibold text-signal-ink hover:bg-signal-hover">
              {t('downloads.empty.action')}
            </Link>
          }
        />
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map(({ x, job }) => (
            <JobItem key={x.id} job={job} token={x.token} />
          ))}
        </ul>
      )}
    </div>
  );
}
