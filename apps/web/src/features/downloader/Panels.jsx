/** Light states of the Download screen (loaded eagerly): loading, errors, home intro. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Check, Loader2, Lock, RotateCcw, ShieldAlert } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { relativeTime } from '../../lib/format.js';
import { PRESETS, useAnalysis } from '../../state/analysis.js';
import { useHistory } from '../../state/history.js';
import { useSettings } from '../../state/settings.js';
import { Button, Skeleton, cx } from '../../components/ui.jsx';

export function ProbeSkeleton() {
  const { t } = useI18n();
  const startedAt = useAnalysis((s) => s.startedAt);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(id);
  }, [startedAt]);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12" aria-busy="true">
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-video w-full rounded-[var(--radius-panel)]" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-5">
        <p role="status" className="flex items-center gap-2 font-semibold">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {slow ? t('states.probingSlow') : t('states.probing')}
        </p>
        <Skeleton className="h-14 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

const TONE = {
  PLATFORM_BLOCKED: { icon: Lock, tone: 'buoy' },
  DRM_PROTECTED: { icon: Lock, tone: 'buoy' },
  EXPORT_ONLY: { icon: ShieldAlert, tone: 'sea' },
  BLOCKED_DESTINATION: { icon: ShieldAlert, tone: 'buoy' },
};

export function ErrorPanel({ error, onRetry, onEdit }) {
  const { t } = useI18n();
  const [wait, setWait] = useState(error?.retryAfter ?? 0);
  useEffect(() => {
    setWait(error?.retryAfter ?? 0);
  }, [error]);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  if (!error) return null;
  const { icon: Icon, tone } = TONE[error.code] ?? { icon: AlertTriangle, tone: 'amber' };
  const routes = error.details?.routes ?? [];
  const platform = error.details?.platform;
  const reason = error.code === 'PLATFORM_DISABLED' ? error.details?.reason : null;
  return (
    <section role="alert" className="max-w-2xl">
      <div className={cx('flex items-start gap-4 rounded-[var(--radius-panel)] p-5', tone === 'buoy' ? 'bg-buoy-soft' : tone === 'sea' ? 'bg-sea-soft' : 'bg-amber-soft')}>
        <Icon aria-hidden="true" className={cx('mt-0.5 size-6 shrink-0', tone === 'buoy' ? 'text-buoy' : tone === 'sea' ? 'text-sea' : 'text-amber')} />
        <div className="min-w-0">
          {platform && <p className="mb-1 text-sm font-semibold text-ink-2">{platform.name}</p>}
          <p className="text-lg font-semibold text-ink">{errorText(t, error)}</p>
          {reason && <p className="mt-1 text-ink-2">{reason}</p>}
          {routes.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-ink">{t('attest.routes')}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {routes.map((r) => (
                  <li key={r.label}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-hull underline underline-offset-4 dark:text-signal">
                        {r.label}
                      </a>
                    ) : (
                      <span>{r.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.retryable && (
              <Button variant="primary" icon={RotateCcw} onClick={onRetry} disabled={wait > 0}>
                {wait > 0 ? t('errors.RATE_LIMITED', { seconds: wait }) : t('actions.retry')}
              </Button>
            )}
            <Button onClick={onEdit}>{t('actions.edit')}</Button>
            {['UNSUPPORTED_PLATFORM', 'PLATFORM_BLOCKED', 'EXPORT_ONLY'].includes(error.code) && (
              <Link to="/platforms" className="inline-flex h-11 items-center px-2 font-semibold text-hull underline-offset-4 hover:underline dark:text-signal">
                {t('actions.platforms')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function presetMatches(p, d) {
  if (p.mode !== d.mode) return false;
  if (p.video) return d.videoContainer === p.video.container && d.quality === p.video.quality;
  return d.audioFormat === p.audio.format && d.audioBitrate === p.audio.bitrate;
}

export function HomeIntro() {
  const { t, locale } = useI18n();
  const defaults = useSettings((s) => s.defaults);
  const setDefaults = useSettings((s) => s.setDefaults);
  const entries = useHistory((s) => s.entries);
  const recent = useMemo(() => entries.slice(0, 3), [entries]);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex flex-col gap-10">
        <section aria-labelledby="presets">
          <h2 id="presets" className="mb-3 text-lg font-bold">
            {t('presets.label')}
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="presets">
            {PRESETS.map((p) => {
              const on = presetMatches(p, defaults);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setDefaults({
                      mode: p.mode,
                      ...(p.video ? { videoContainer: p.video.container, quality: p.video.quality } : {}),
                      ...(p.audio ? { audioFormat: p.audio.format, audioBitrate: p.audio.bitrate } : {}),
                    })
                  }
                  className={cx('flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors', on ? 'border-hull bg-hull text-hull-ink' : 'border-line bg-surface hover:border-line-strong')}
                >
                  {on && <Check className="size-4" aria-hidden="true" />}
                  {t(`presets.${p.id}`)}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="mb-4 text-lg font-bold">
            {t('home.how')}
          </h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-3">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hull font-bold text-hull-ink tabular-nums">
                  {n}
                </span>
                <div>
                  <h3 className="font-semibold">{t(`home.steps.${n}.title`)}</h3>
                  <p className="mt-1 text-sm text-ink-2">{t(`home.steps.${n}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="flex flex-col gap-8">
        {recent.length > 0 && (
          <section aria-labelledby="recent">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="recent" className="text-lg font-bold">
                {t('home.recent')}
              </h2>
              <Link to="/history" className="text-sm font-semibold text-hull underline-offset-4 hover:underline dark:text-signal">
                {t('home.seeAll')}
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="min-w-0 truncate font-medium">{e.title}</span>
                  <span className="shrink-0 text-sm text-ink-2">{relativeTime(e.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="principles" className="flex flex-col gap-4 border-s-4 border-signal ps-4">
          <h2 id="principles" className="sr-only">
            {t('home.rules')}
          </h2>
          <div>
            <h3 className="font-semibold">{t('home.honest')}</h3>
            <p className="mt-1 text-sm text-ink-2">{t('home.honestBody')}</p>
          </div>
          <div>
            <h3 className="font-semibold">{t('home.privacy')}</h3>
            <p className="mt-1 text-sm text-ink-2">{t('home.privacyBody')}</p>
          </div>
          <div>
            <h3 className="font-semibold">{t('home.rules')}</h3>
            <p className="mt-1 text-sm text-ink-2">{t('home.rulesBody')}</p>
            <Link to="/platforms" className="mt-1 inline-block text-sm font-semibold text-hull underline underline-offset-4 dark:text-signal">
              {t('home.rulesLink')}
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
