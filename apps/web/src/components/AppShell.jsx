import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Download, History, Inbox, Layers, Settings, WifiOff, X } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { useDownloads } from '../state/downloads.js';
import { useToasts } from '../state/toasts.js';
import { Wordmark } from './Logo.jsx';
import { cx } from './ui.jsx';

const NAV = [
  { to: '/', key: 'download', icon: Download, end: true },
  { to: '/downloads', key: 'downloads', icon: Inbox },
  { to: '/history', key: 'history', icon: History },
  { to: '/platforms', key: 'platforms', icon: Layers, desktopOnly: true },
  { to: '/settings', key: 'settings', icon: Settings },
];

function useActiveCount() {
  return useDownloads((s) => Object.values(s.jobs).filter((j) => ['queued', 'downloading', 'processing'].includes(j.status)).length + s.queue.length);
}

function Badge({ n }) {
  if (!n) return null;
  return <span className="min-w-5 rounded-full bg-signal px-1.5 text-center text-xs font-bold leading-5 text-signal-ink tabular-nums">{n}</span>;
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function Toaster() {
  const { t } = useI18n();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:end-6 md:bottom-6 md:w-[26rem] md:items-end md:px-0" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'animate-rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[var(--radius-panel)] px-4 py-3 shadow-lift',
            toast.tone === 'error' ? 'bg-buoy text-white' : 'bg-ink text-canvas',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{toast.title}</p>
            {toast.body && <p className="text-sm opacity-85">{toast.body}</p>}
          </div>
          {toast.action && (
            <button
              type="button"
              className="shrink-0 rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-bold text-signal hover:bg-white/10"
              onClick={() => {
                toast.action.onClick();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" aria-label={t('actions.dismiss')} className="shrink-0 rounded p-1 opacity-70 hover:opacity-100" onClick={() => dismiss(toast.id)}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppShell() {
  const { t } = useI18n();
  const active = useActiveCount();
  const online = useOnline();
  const location = useLocation();
  const home = location.pathname === '/';

  // Tab title shows work in progress, even when the tab is in the background.
  useEffect(() => {
    document.title = active ? `(${active}) Ferry` : 'Ferry';
  }, [active]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded bg-signal px-4 py-2 font-bold text-signal-ink focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        {t('app.skip')}
      </a>
      <header className="on-hull bg-hull text-hull-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" className="rounded-md" aria-label="Ferry">
            <Wordmark />
          </NavLink>
          <nav aria-label={t('nav.main')} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ to, key, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cx('flex h-10 items-center gap-2 rounded-[var(--radius-control)] px-3 font-semibold transition-colors', isActive ? 'bg-white/14 text-hull-ink' : 'text-hull-ink-2 hover:text-hull-ink')
                    }
                  >
                    {t(`nav.${key}`)}
                    {key === 'downloads' && <Badge n={active} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {!online && (
        <div role="status" className="bg-amber-soft text-amber">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-semibold sm:px-6">
            <WifiOff className="size-4" aria-hidden="true" />
            {t('app.offline')}
          </p>
        </div>
      )}

      <main id="main" tabIndex={-1} className={cx('flex-1 pb-24 outline-none md:pb-12', !home && 'pt-6 sm:pt-10')}>
        <Outlet />
      </main>

      {/* Phone navigation: thumb-reachable, four destinations. */}
      <nav aria-label={t('nav.main')} className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.filter((n) => !n.desktopOnly).map(({ to, key, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => cx('relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', isActive ? 'text-hull dark:text-signal' : 'text-ink-2')}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('absolute top-0 h-1 w-10 rounded-b-full', isActive ? 'bg-signal' : 'bg-transparent')} aria-hidden="true" />
                    <span className="relative">
                      <Icon className="size-6" aria-hidden="true" />
                      {key === 'downloads' && active > 0 && (
                        <span className="absolute -end-2.5 -top-1.5">
                          <Badge n={active} />
                        </span>
                      )}
                    </span>
                    {t(`nav.${key}`)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Toaster />
    </div>
  );
}
