/**
 * Real progress only: the bar fills when the percentage is known and shows a
 * moving band when it isn't, instead of an invented number. Converting shows
 * stripes, paused fades. The fill takes the site's brand colour when it reads
 * well on both themes (ink otherwise).
 */
import { useI18n } from '../lib/i18n/index.jsx';
import { cx } from './ui.jsx';

export function ProgressBar({ job, accent = null, className }) {
  const { t } = useI18n();
  const status = job.status;
  const percent = job.progress?.percent;
  const known = typeof percent === 'number' && Number.isFinite(percent);
  const value = status === 'ready' ? 100 : known ? Math.max(0, Math.min(100, percent)) : null;
  const failed = status === 'failed' || status === 'cancelled';
  const color = failed ? 'var(--bad)' : (accent ?? 'var(--ink)');
  const valueText = `${t(`downloads.status.${status}`)}${value != null && status !== 'ready' ? `, ${Math.round(value)}%` : ''}`;
  return (
    <div
      role="progressbar"
      aria-label={job.source?.title ?? t('downloads.title')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={valueText}
      className={cx('relative h-2 w-full overflow-hidden rounded-full bg-field', className)}
    >
      {value != null ? (
        <span
          className={cx('block h-full rounded-full transition-[width] duration-700 ease-out', status === 'processing' && 'bar-work', (status === 'paused' || failed) && 'opacity-40')}
          style={{ width: `${Math.max(2, value)}%`, backgroundColor: color }}
        />
      ) : (
        ['downloading', 'processing'].includes(status) && <span className="absolute inset-y-0 w-1/3 animate-[indeterminate_1.3s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: color }} />
      )}
    </div>
  );
}
