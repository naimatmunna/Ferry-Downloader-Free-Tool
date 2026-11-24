/**
 * The download's route: Queued → Downloading → Converting → Ready.
 * The active segment fills with *real* progress only; when the percentage is
 * unknown the segment shows a moving band instead of an invented number.
 */
import { Check, Pause, X } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { cx } from './ui.jsx';

const STOPS = ['queued', 'downloading', 'processing', 'ready'];

function stopIndex(status) {
  if (status === 'paused') return 1;
  if (status === 'failed' || status === 'cancelled' || status === 'expired') return -1;
  return Math.max(0, STOPS.indexOf(status));
}

export function RouteLine({ job, compact = false }) {
  const { t } = useI18n();
  const status = job.status;
  const failed = status === 'failed' || status === 'cancelled';
  // For failures, freeze the line where it stopped.
  const reached = failed ? Math.max(0, STOPS.indexOf(job.progress?.phase === 'processing' ? 'processing' : job.progress?.phase === 'downloading' ? 'downloading' : 'queued')) : stopIndex(status);
  const percent = job.progress?.percent;
  const known = typeof percent === 'number' && Number.isFinite(percent);
  const activeSegment = status === 'downloading' || status === 'processing' || status === 'paused';

  const valueText = `${t(`downloads.status.${status}`)}${known && activeSegment ? `, ${Math.round(percent)}%` : ''}`;

  return (
    <div
      role="progressbar"
      aria-label={job.source?.title ?? t('downloads.title')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known && activeSegment ? Math.round(percent) : status === 'ready' ? 100 : undefined}
      aria-valuetext={valueText}
      className="w-full"
    >
      <ol className="flex items-center">
        {STOPS.map((stop, i) => {
          const done = status === 'ready' ? true : i < reached;
          const current = !failed && i === reached && status !== 'ready';
          const isFail = failed && i === reached;
          const last = i === STOPS.length - 1;
          return (
            <li key={stop} className={cx('flex items-center', !last && 'flex-1')}>
              <span
                className={cx(
                  'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-hull bg-hull text-hull-ink',
                  current && 'border-hull bg-surface text-hull',
                  isFail && 'border-buoy bg-buoy text-white',
                  !done && !current && !isFail && 'border-line-strong bg-surface',
                )}
                aria-hidden="true"
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
                {current && status === 'paused' && <Pause className="size-3" strokeWidth={3} />}
                {current && status !== 'paused' && <span className="size-2 rounded-full bg-signal ring-2 ring-hull" />}
                {isFail && <X className="size-3.5" strokeWidth={3} />}
              </span>
              {!last && (
                <span className="relative mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  {i < reached && !failed && <span className="absolute inset-0 bg-hull" />}
                  {i < reached && failed && <span className="absolute inset-0 bg-hull/50" />}
                  {i === reached && !failed && activeSegment && known && (
                    <span className="absolute inset-y-0 start-0 bg-signal transition-[width] duration-700 ease-out" style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
                  )}
                  {i === reached && !failed && activeSegment && !known && status !== 'paused' && <span className="skeleton absolute inset-0 opacity-90" />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!compact && (
        <ol className="mt-1.5 hidden grid-cols-4 text-xs text-ink-2 sm:grid" aria-hidden="true">
          {STOPS.map((stop, i) => (
            <li key={stop} className={cx(i === 0 && 'text-start', i === 1 && 'ps-[8%]', i === 2 && 'ps-[30%]', i === 3 && 'text-end', !failed && i === reached && 'font-semibold text-ink')}>
              {t(`downloads.steps.${stop}`)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
