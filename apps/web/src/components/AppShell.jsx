import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Clock, Download, LayoutGrid, Link2, Moon, SlidersHorizontal, Sun, WifiOff, X } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { useDownloads } from '../state/downloads.js';
import { useSettings } from '../state/settings.js';
import { useToasts } from '../state/toasts.js';
import { Wordmark } from './Logo.jsx';
import { cx } from './ui.jsx';

const NAV = [
  { to: '/', key: 'download', icon: Link2, end: true },
  { to: '/downloads', key: 'downloads', icon: Download },
  { to: '/history', key: 'history', icon: Clock },
  { to: '/sites', key: 'sites', icon: LayoutGrid },
];

function useActiveCount() {
  return useDownloads((s) => Object.values(s.jobs).filter((j) => ['queued', 'downloading', 'processing'].includes(j.status)).length + s.queue.length);
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

/** Light/dark switch: flips whatever is showing now (the device setting included). */
function ThemeButton() {
  const { t } = useI18n();
  const update = useSettings((s) => s.update);
  const theme = useSettings((s) => s.theme);
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const Icon = dark ? Sun : Moon;
  const label = dark ? t('nav.toLight') : t('nav.toDark');
  return (
    <button type="button" aria-label={label} title={label} onClick={() => update({ theme: dark ? 'light' : 'dark' })} className="grid size-10 place-items-center rounded-xl bg-hero-chip text-hero-ink transition-colors hover:bg-hero-chip-hover">
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}

function Toaster() {
  const { t } = useI18n();
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:end-6 md:bottom-6 md:w-[26rem] md:items-end md:px-0" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'animate-rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-card',
            toast.tone === 'error' ? 'bg-bad text-white dark:text-[#1b0b0b]' : 'bg-ink text-canvas',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{toast.title}</p>
            {toast.body && <p className="text-sm opacity-85">{toast.body}</p>}
          </div>
          {toast.action && (
            <button
              type="button"
              className="shrink-0 rounded-[11px] bg-sun px-3 py-1.5 text-sm font-bold text-sun-ink hover:brightness-105"
              onClick={() => {
                toast.action.onClick();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" aria-label={t('actions.dismiss')} className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100" onClick={() => dismiss(toast.id)}>
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

  // Tab title shows work in progress, even when the tab is in the background.
  useEffect(() => {
    document.title = active ? `(${active}) Ferry` : 'Ferry';
  }, [active]);

  // Each screen starts at the top.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-xl bg-sun px-4 py-2 font-bold text-sun-ink focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        {t('app.skip')}
      </a>
      <header className="bg-hero text-hero-ink">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-7 px-4 sm:h-[68px] sm:px-8">
          <NavLink to="/" className="rounded-lg" aria-label="Ferry">
            <Wordmark />
          </NavLink>
          <nav aria-label={t('nav.main')} className="hidden md:block">
            <ul className="flex items-center gap-0.5">
              {NAV.map(({ to, key, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => cx('flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors', isActive ? 'bg-primary text-primary-ink' : 'text-hero-ink hover:bg-hero-chip')}
                  >
                    {({ isActive }) => (
                      <>
                        {t(`nav.${key}`)}
                        {key === 'downloads' && active > 0 && (
                          <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums', isActive ? 'bg-primary-ink text-primary' : 'bg-hero-ink text-hero')}>{active}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <ThemeButton />
            <NavLink
              to="/settings"
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
              className={({ isActive }) => cx('grid size-10 place-items-center rounded-xl transition-colors', isActive ? 'bg-primary text-primary-ink' : 'bg-hero-chip text-hero-ink hover:bg-hero-chip-hover')}
            >
              <SlidersHorizontal aria-hidden="true" className="size-5" />
            </NavLink>
          </div>
        </div>
      </header>

      {!online && (
        <div role="status" className="bg-off-soft text-off">
          <p className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-2 text-sm font-semibold sm:px-8">
            <WifiOff className="size-4" aria-hidden="true" />
            {t('app.offline')}
          </p>
        </div>
      )}

      <main id="main" tabIndex={-1} className="flex-1 pb-28 outline-none md:pb-14">
        <Outlet />
      </main>

      {/* Phone navigation: thumb-reachable, four destinations. */}
      <nav aria-label={t('nav.main')} className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => cx('flex h-[66px] flex-col items-center justify-center gap-1 text-[11.5px] font-semibold', isActive ? 'text-ink' : 'text-ink-3')}>
                {({ isActive }) => (
                  <>
                    <span className={cx('relative grid h-[30px] w-14 place-items-center rounded-full transition-colors', isActive && 'bg-sun text-sun-ink')}>
                      <Icon className="size-[22px]" aria-hidden="true" />
                      {key === 'downloads' && active > 0 && (
                        <span className="absolute -top-1 start-[34px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-paper tabular-nums">{active}</span>
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
