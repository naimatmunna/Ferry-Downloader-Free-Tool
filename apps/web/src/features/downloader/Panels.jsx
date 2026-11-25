/** Light states of the Download screen (loaded eagerly): loading, refusals and errors, home intro. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowUpRight, Ban, Check, Clock, Globe, Loader2, Lock, RotateCcw } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { relativeTime } from '../../lib/format.js';
import { describeLinkError } from '../../lib/linkError.js';
import { detect, usePlatforms } from '../../lib/registry.js';
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

  return <LinkErrorCard error={error} routes={routes} wait={wait} onRetry={onRetry} onEdit={onEdit} />;
}

const PILL = {
  soon: { icon: Clock, tone: 'bg-soon-soft text-soon' },
  signin: { icon: Lock, tone: 'bg-lock-soft text-lock' },
  gone: { icon: Ban, tone: 'bg-lock-soft text-lock' },
  wait: { icon: RotateCcw, tone: 'bg-off-soft text-off' },
  bad: { icon: AlertTriangle, tone: 'bg-bad-soft text-bad' },
};
const linkCls = 'inline-flex h-12 items-center px-2 font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]';

/** The site of the pasted link, as the client registry sees it (no extra request). */
function pastedSite(input) {
  const d = detect(input);
  if (d?.ok) return { platform: d.platform, host: d.url.hostname };
  try {
    return { platform: null, host: new URL(input).hostname };
  } catch {
    return { platform: null, host: null };
  }
}

/** A link that didn't work: what happened, what works on that site, and what to do (design/link-errors-mockup.html). */
function LinkErrorCard({ error, routes, wait, onRetry, onEdit }) {
  const { t } = useI18n();
  const input = useAnalysis((s) => s.input);
  const platforms = usePlatforms((s) => s.platforms);
  const { platform, host } = useMemo(() => pastedSite(input), [input]);
  // The server may name another site than the link showed (a short link, an embed): use that site's entry.
  const named = error.details?.platform?.id;
  const site = named ? (platforms.find((p) => p.id === named) ?? error.details.platform) : platform;
  const d = describeLinkError(error, { platform: site, host });
  const pill = PILL[d.pill];
  const byName = (key) => (d.name ? t(`${key}.title`, { name: d.name }) : t(`${key}.titleGeneric`));
  const title =
    d.kind === 'pictures-soon' ? t('linkError.picturesSoon.title', { name: d.name })
    : d.kind === 'website-soon' ? t('linkError.websiteSoon.title')
    : d.kind === 'signin' ? byName('linkError.signin')
    : d.kind === 'gone' ? t('linkError.gone.title')
    : d.kind === 'wait' ? byName('linkError.wait')
    : errorText(t, error);
  const body =
    d.kind === 'pictures-soon' ? t(`linkError.picturesSoon.body.${d.works[0]?.what === 'audio' ? 'audio' : 'video'}`, { name: d.name })
    : d.kind === 'website-soon' ? t('linkError.websiteSoon.body')
    : d.kind === 'signin' ? t('linkError.signin.body')
    : d.kind === 'gone' ? t('linkError.gone.body')
    : d.kind === 'wait' ? t('linkError.wait.body')
    : null;
  const retry = (
    <Button variant={d.primary === 'retry' ? 'primary' : 'line'} icon={RotateCcw} onClick={onRetry} disabled={wait > 0}>
      {wait > 0 ? t('errors.RATE_LIMITED', { seconds: wait }) : t('actions.retry')}
    </Button>
  );
  const paste = (
    <Button variant={d.primary === 'paste' ? 'primary' : 'line'} onClick={onEdit}>
      {t('linkError.paste')}
    </Button>
  );

  return (
    <section role="alert" aria-labelledby="link-error-title" className="max-w-2xl rounded-[var(--radius-card)] bg-paper p-5 shadow-card sm:p-7">
      <div className="flex items-center gap-3.5">
        {d.siteLink ? (
          <SiteIcon id={d.siteLink} name={d.name} size={48} />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-field text-ink-2">
            <Globe aria-hidden="true" className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          {d.name && <p className="truncate text-sm font-semibold text-ink-2">{d.name}</p>}
          <span className={cx('mt-0.5 inline-flex h-7 items-center gap-1.5 rounded-full ps-2 pe-2.5 text-[13px] font-[650]', pill.tone)}>
            <pill.icon aria-hidden="true" className="size-[15px]" strokeWidth={2.6} />
            {t(`linkError.pill.${d.pill}`)}
          </span>
        </div>
      </div>
      <h2 id="link-error-title" className="heading mt-4 text-[22px] leading-tight sm:text-2xl">
        {title}
      </h2>
      {body && <p className="mt-2 max-w-[60ch] text-ink-2">{body}</p>}
      {d.works.length > 0 && (
        <ul className="mt-4 grid gap-1.5 rounded-[14px] bg-field px-4 py-3 text-[14.5px]">
          <li className="text-[13px] font-bold text-ink-3">{t('linkError.works.title', { name: d.name })}</li>
          {d.works.map((w) => (
            <li key={w.what} className="flex items-center gap-2">
              {w.ok ? <Check aria-hidden="true" className="size-[18px] text-ok" strokeWidth={2.6} /> : <Clock aria-hidden="true" className="size-[18px] text-soon" strokeWidth={2.4} />}
              {t(`linkError.works.${w.what}`)}
            </li>
          ))}
        </ul>
      )}
      {routes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">{t('attest.routes')}</p>
          <RouteList routes={routes} />
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2 max-sm:[&>button]:w-full">
        {d.primary === 'retry' ? (
          <>
            {retry}
            {paste}
          </>
        ) : (
          paste
        )}
        {d.siteLink ? (
          <Link to={`/sites?site=${d.siteLink}`} className={linkCls}>
            {t('linkError.siteLink', { name: d.name })}
          </Link>
        ) : (
          d.kind === 'website-soon' && (
            <Link to="/sites" className={linkCls}>
              {t('linkError.sites')}
            </Link>
          )
        )}
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
