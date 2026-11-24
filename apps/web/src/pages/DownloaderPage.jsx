import { lazy, Suspense, useEffect, useMemo } from 'react';
import { AudioLines, Images } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { usePlatforms } from '../lib/registry.js';
import { shelfOf, siteStatus } from '../lib/siteStatus.js';
import { useAnalysis } from '../state/analysis.js';
import { UrlGate, useDetection } from '../features/downloader/UrlGate.jsx';
import { WherePanel } from '../features/downloader/WherePanel.jsx';
import { ErrorPanel, HomeIntro, ProbeSkeleton } from '../features/downloader/Panels.jsx';
import { VideoMuteIcon, VideoSoundIcon } from '../components/icons.jsx';
import { cx } from '../components/ui.jsx';

// The analysis workspace is only needed after a probe returns; it is fetched
// as soon as the user types (see prefetch below), so it is ready in time.
const loadWorkspace = () => import('../features/downloader/Workspace.jsx');
const loadCollections = () => import('../features/downloader/Collections.jsx');
const loadGallery = () => import('../features/downloader/Gallery.jsx');
const Workspace = lazy(() => loadWorkspace().then((m) => ({ default: m.Workspace })));
const PlaylistPanel = lazy(() => loadCollections().then((m) => ({ default: m.PlaylistPanel })));
const BatchPanel = lazy(() => loadCollections().then((m) => ({ default: m.BatchPanel })));
const GalleryPanel = lazy(() => loadGallery().then((m) => ({ default: m.GalleryPanel })));

function Caps() {
  const { t } = useI18n();
  const items = [
    [VideoSoundIcon, t('caps.av')],
    [VideoMuteIcon, t('caps.video')],
    [AudioLines, t('caps.audio')],
    [Images, t('caps.images')],
  ];
  return (
    <ul aria-label={t('caps.label')} className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[14.5px] font-semibold">
      {items.map(([Icon, label]) => (
        <li key={label} className="inline-flex items-center gap-2">
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export default function DownloaderPage() {
  const { t } = useI18n();
  const status = useAnalysis((s) => s.status);
  const result = useAnalysis((s) => s.result);
  const batch = useAnalysis((s) => s.batch);
  const error = useAnalysis((s) => s.error);
  const input = useAnalysis((s) => s.input);
  const analyze = useAnalysis((s) => s.analyze);
  const { detection } = useDetection();
  const platforms = usePlatforms((s) => s.platforms);
  const direct = useMemo(() => platforms.filter((p) => shelfOf(siteStatus(p)) === 'direct').length, [platforms]);
  const idle = status === 'idle';

  useEffect(() => {
    if (input || status !== 'idle') {
      loadWorkspace();
      loadCollections();
      loadGallery();
    }
  }, [input, status]);

  return (
    <>
      {/* The yellow top: the one loud area of the page. */}
      <section className="bg-hero text-hero-ink">
        <div className={cx('mx-auto max-w-[1280px] px-4 sm:px-8', idle ? 'grid gap-8 pb-8 pt-3 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_590px] lg:gap-12 lg:pb-12' : 'pb-5 pt-1 sm:pb-7')}>
          <div className={cx(idle && 'lg:pt-10')}>
            {idle ? (
              <>
                <h1 className="display text-[2.45rem] text-hero-head sm:text-[3.6rem] lg:text-[4.25rem]">
                  <span className="block">{t('gate.line1')}</span>
                  <span className="block">{t('gate.line2')}</span>
                </h1>
                <p className="mt-4 max-w-[36ch] text-[15.5px] leading-relaxed text-hero-ink-2 sm:text-lg">{direct ? t('gate.ledeCount', { count: direct }) : t('gate.lede')}</p>
              </>
            ) : (
              <h1 className="sr-only">{t('gate.title')}</h1>
            )}
            <div className={cx(idle ? 'mt-7' : 'max-w-[900px]')}>
              <UrlGate />
            </div>
            {idle && <Caps />}
          </div>
          {idle && <WherePanel matchId={detection?.ok ? detection.platform.id : null} />}
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-8 sm:pt-9">
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
