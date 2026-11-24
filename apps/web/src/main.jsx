import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './styles/index.css';
import { I18nProvider, errorText, preloadDictionary, useI18n } from './lib/i18n/index.jsx';
import { usePlatforms } from './lib/registry.js';
import { applyTheme, useSettings } from './state/settings.js';
import { downloadEvents, startDownloadSync, useDownloads } from './state/downloads.js';
import { toast } from './state/toasts.js';
import { AppShell } from './components/AppShell.jsx';
import DownloaderPage from './pages/DownloaderPage.jsx';
import { NotFoundPage, SharePage } from './pages/MiscPages.jsx';

// Secondary screens load on demand to keep the first paint small.
const DownloadsPage = lazy(() => import('./pages/DownloadsPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const PlatformsPage = lazy(() => import('./pages/PlatformsPage.jsx'));

const page = (C) => (
  <Suspense fallback={null}>
    <C />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DownloaderPage /> },
      { path: 'downloads', element: page(DownloadsPage) },
      { path: 'history', element: page(HistoryPage) },
      { path: 'settings', element: page(SettingsPage) },
      { path: 'platforms', element: page(PlatformsPage) },
      { path: 'share', element: <SharePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

/** App-wide effects: theme, registry, download sync and announcements. */
function Effects() {
  const { t } = useI18n();
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(useSettings.getState().theme);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [theme]);

  useEffect(() => {
    usePlatforms.getState().load();
    startDownloadSync();
  }, []);

  useEffect(() => {
    downloadEvents.onReady = (job) => {
      if (useSettings.getState().autoSave) return; // the save toast follows instead
      toast({
        title: t('downloads.toast.ready', { title: job.source.title }),
        action: { label: t('downloads.save'), onClick: () => useDownloads.getState().save(job.id, job.output.files[0].id) },
      });
    };
    downloadEvents.onSaved = (job, file, auto) => {
      if (auto) toast({ title: t('downloads.toast.saving', { name: file.name }) });
    };
    downloadEvents.onFailed = (job) => {
      toast({
        tone: 'error',
        title: t('downloads.toast.failed', { title: job.source.title }),
        body: errorText(t, job.error),
        timeout: 9000,
        ...(job.actions?.retry ? { action: { label: t('downloads.retry'), onClick: () => useDownloads.getState().act(job.id, 'retry') } } : {}),
      });
    };
    downloadEvents.onError = (err) => toast({ tone: 'error', title: errorText(t, err), timeout: 9000 });
  }, [t]);

  return null;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// Load the saved language before the first paint (no flash of English).
await preloadDictionary(useSettings.getState().language);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <Effects />
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
);
