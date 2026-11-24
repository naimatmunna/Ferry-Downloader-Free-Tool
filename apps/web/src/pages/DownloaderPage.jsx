import { lazy, Suspense, useEffect } from 'react';
import { useI18n } from '../lib/i18n/index.jsx';
import { useAnalysis } from '../state/analysis.js';
import { UrlGate } from '../features/downloader/UrlGate.jsx';
import { ErrorPanel, HomeIntro, ProbeSkeleton } from '../features/downloader/Panels.jsx';

// The analysis workspace is only needed after a probe returns; it is fetched
// as soon as the user types (see prefetch below), so it is ready in time.
const loadWorkspace = () => import('../features/downloader/Workspace.jsx');
const loadCollections = () => import('../features/downloader/Collections.jsx');
const loadGallery = () => import('../features/downloader/Gallery.jsx');
const Workspace = lazy(() => loadWorkspace().then((m) => ({ default: m.Workspace })));
const PlaylistPanel = lazy(() => loadCollections().then((m) => ({ default: m.PlaylistPanel })));
const BatchPanel = lazy(() => loadCollections().then((m) => ({ default: m.BatchPanel })));
const GalleryPanel = lazy(() => loadGallery().then((m) => ({ default: m.GalleryPanel })));

export default function DownloaderPage() {
  const { t } = useI18n();
  const status = useAnalysis((s) => s.status);
  const result = useAnalysis((s) => s.result);
  const batch = useAnalysis((s) => s.batch);
  const error = useAnalysis((s) => s.error);
  const input = useAnalysis((s) => s.input);
  const analyze = useAnalysis((s) => s.analyze);

  useEffect(() => {
    if (input || status !== 'idle') {
      loadWorkspace();
      loadCollections();
      loadGallery();
    }
  }, [input, status]);

  return (
    <>
      {/* The terminal sign: the one loud element on the page. */}
      <section className="on-hull bg-hull pb-10 text-hull-ink sm:pb-14">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-12">
          <h1 className="sign-headline max-w-[14ch]">
            <span className="block">{t('gate.line1')}</span>
            <span className="block text-signal">{t('gate.line2')}</span>
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg text-hull-ink-2">{t('gate.lede')}</p>
          <div className="mt-8 max-w-4xl">
            <UrlGate />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        {status === 'idle' && <HomeIntro />}
        {status === 'probing' && <ProbeSkeleton />}
        {status === 'error' && <ErrorPanel error={error} onRetry={() => analyze(input)} onEdit={() => document.getElementById('gate-input')?.focus()} />}
        <Suspense fallback={status === 'ready' ? <ProbeSkeleton /> : null}>
          {status === 'ready' && batch && <BatchPanel />}
          {status === 'ready' && !batch && result?.media?.kind === 'playlist' && <PlaylistPanel />}
          {status === 'ready' && !batch && result?.media?.kind === 'gallery' && <GalleryPanel />}
          {status === 'ready' && !batch && result && !['playlist', 'gallery'].includes(result.media.kind) && <Workspace />}
        </Suspense>
      </div>
    </>
  );
}
