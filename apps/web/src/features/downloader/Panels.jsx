/** Light states of the Download screen (loaded eagerly): loading, refusals and errors, home intro. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowUpRight, Ban, Loader2, Lock, RotateCcw } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { relativeTime } from '../../lib/format.js';
import { useAnalysis } from '../../state/analysis.js';
import { useHistory } from '../../state/history.js';
import { SiteIcon } from '../../components/SiteIcon.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
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
    <div className="grid gap-6 lg:grid-cols-[372px_minmax(0,1fr)]" aria-busy="true">
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-card">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-paper p-6 shadow-card">
        <p role="status" className="flex items-center gap-2 font-bold">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {slow ? t('states.probingSlow') : t('states.probing')}
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-13 rounded-2xl" />
          <Skeleton className="h-13 rounded-2xl" />
        </div>
        <Skeleton className="h-15 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** The site's own ways to download, as a list of outbound links. */
export function RouteList({ routes }) {
  if (!routes?.length) return null;
  return (
    <ul className="grid gap-2">
      {routes.map((r) => {
        const body = (
          <>
            <span className="min-w-0 font-semibold">{r.label}</span>
            {r.url && <ArrowUpRight aria-hidden="true" className="ms-auto size-4 shrink-0 text-ink-2" />}
          </>
        );
        return (
          <li key={r.label}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[var(--radius-control)] bg-field px-4 py-3 text-[14.5px] text-ink transition-colors hover:bg-line">
                {body}
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-[var(--radius-control)] bg-field px-4 py-3 text-[14.5px] text-ink">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const REFUSAL = {
  EXPORT_ONLY: { status: 'off', icon: ArrowUpRight },
  PLATFORM_BLOCKED: { status: 'lock', icon: Lock },
  DRM_PROTECTED: { status: 'lock', icon: Lock },
  PLATFORM_DISABLED: { status: 'off-server', icon: Ban },
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
  const refusal = REFUSAL[error.code];
  const routes = error.details?.routes ?? [];
  const platform = error.details?.platform;
  const name = platform?.name;

  if (refusal) {
    const title = error.code === 'EXPORT_ONLY' ? (name ? t('route.title', { name }) : t('route.titleGeneric')) : error.code === 'PLATFORM_DISABLED' ? t('route.offTitle') : t('route.lockTitle');
    const reason = error.code === 'PLATFORM_DISABLED' ? error.details?.reason : null;
    return (
      <section role="alert" className="max-w-2xl rounded-[var(--radius-card)] bg-paper p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3.5">
          {platform?.id ? <SiteIcon id={platform.id} name={name} size={48} /> : <refusal.icon aria-hidden="true" className="size-7 text-ink-2" />}
          <div className="min-w-0">
            {name && <p className="text-sm font-semibold text-ink-2">{name}</p>}
            <StatusPill status={refusal.status} />
          </div>
        </div>
        <h2 className="heading mt-4 text-[22px] leading-tight sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-[60ch] text-ink-2">{errorText(t, error)}</p>
        {reason && <p className="mt-1 font-semibold">{reason}</p>}
        {routes.length > 0 && (
          <div className="mt-5">
            <RouteList routes={routes} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="line" onClick={onEdit}>
            {t('route.another')}
          </Button>
          <Link to={platform?.id ? `/sites?site=${platform.id}` : '/sites'} className="inline-flex h-12 items-center px-2 font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
            {t('route.sites')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section role="alert" className="max-w-2xl rounded-[var(--radius-card)] bg-paper p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bad-soft text-bad">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          {name && <p className="mb-1 text-sm font-semibold text-ink-2">{name}</p>}
          <p className="text-lg font-bold text-ink">{errorText(t, error)}</p>
          {routes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-bold">{t('attest.routes')}</p>
              <RouteList routes={routes} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.retryable && (
              <Button variant="primary" icon={RotateCcw} onClick={onRetry} disabled={wait > 0}>
                {wait > 0 ? t('errors.RATE_LIMITED', { seconds: wait }) : t('actions.retry')}
              </Button>
            )}
            <Button variant="line" onClick={onEdit}>
              {t('actions.edit')}
            </Button>
            {error.code === 'UNSUPPORTED_PLATFORM' && (
              <Link to="/sites" className="inline-flex h-12 items-center px-2 font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
                {t('actions.platforms')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeIntro() {
  const { t, locale } = useI18n();
  const entries = useHistory((s) => s.entries);
  const recent = useMemo(() => entries.slice(0, 4), [entries]);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="how">
        <h2 id="how" className="sr-only">
          {t('home.how')}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-3.5 rounded-[20px] bg-paper p-4 sm:p-5">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sun font-[820] text-sun-ink tabular-nums">
                {n}
              </span>
              <div>
                <h3 className="font-bold">{t(`home.steps.${n}.title`)}</h3>
                <p className="mt-0.5 text-sm text-ink-2">{t(`home.steps.${n}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="recent" className="heading text-lg">
              {t('home.recent')}
            </h2>
            <Link to="/history" className="text-sm font-semibold underline decoration-[1.5px] underline-offset-[3px]">
              {t('home.seeAll')}
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
                <SiteIcon id={e.platformId} name={e.platformName} size={36} />
                <span className="min-w-0 flex-1 truncate font-semibold">{e.title}</span>
                <span className="shrink-0 text-sm text-ink-2">{relativeTime(e.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={cx('flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2')}>
        <span>{t('home.foot.private')}</span>
        <span>{t('home.foot.files')}</span>
        <span>{t('home.foot.logos')}</span>
      </p>
    </div>
  );
}
