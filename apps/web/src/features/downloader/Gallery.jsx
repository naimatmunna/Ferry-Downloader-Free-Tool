/** Image galleries and carousels: a contact sheet to choose images, downloaded as one job. */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, ExternalLink, ImageOff, ListChecks } from 'lucide-react';
import { useI18n } from '../../lib/i18n/index.jsx';
import { galleryJobBody, useAnalysis } from '../../state/analysis.js';
import { useDownloads } from '../../state/downloads.js';
import { toast } from '../../state/toasts.js';
import { Button, PolicyBadge, cx } from '../../components/ui.jsx';
import { AttestBox, Following } from './Workspace.jsx';

/** One image: a native checkbox whose label is the picture (selected = "on" ring, unselected = dimmed). */
function Tile({ item, checked, onChange, number, label }) {
  const [previewOk, setPreviewOk] = useState(Boolean(item.previewUrl));
  return (
    <li>
      <label
        className={cx(
          'relative block cursor-pointer overflow-hidden rounded-[var(--radius-control)] bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
          checked ? 'ring-3 ring-[var(--switch-on)]' : 'ring-1 ring-line',
        )}
      >
        <input type="checkbox" className="absolute end-2 top-2 z-10 size-5 accent-[var(--switch-on)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="sr-only">{label}</span>
        <span className="block aspect-square">
          {previewOk ? (
            <img
              src={item.previewUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cx('size-full object-cover transition-opacity duration-150 motion-reduce:transition-none', !checked && 'opacity-40')}
              onError={() => setPreviewOk(false)}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-ink-2">
              <ImageOff className="size-6" aria-hidden="true" />
            </span>
          )}
        </span>
        <span aria-hidden="true" className="absolute start-2 top-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-xs font-bold tabular-nums text-canvas">
          {number}
        </span>
        {item.width && item.height && (
          <span aria-hidden="true" className="absolute bottom-2 start-2 rounded-md bg-ink/70 px-1.5 py-0.5 text-xs tabular-nums text-canvas">
            {item.width} × {item.height}
          </span>
        )}
      </label>
    </li>
  );
}

export function GalleryPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const result = useAnalysis((s) => s.result);
  const picks = useAnalysis((s) => s.galleryPicks);
  const setPicks = useAnalysis((s) => s.setGalleryPicks);
  const attest = useAnalysis((s) => s.attest);
  const setAttest = useAnalysis((s) => s.setAttest);
  const selection = useAnalysis((s) => s.selection);
  const enqueue = useDownloads((s) => s.enqueue);
  const { media, source, probe } = result;
  const { items, skipped, truncated } = media.gallery;
  // Tile numbers match the numbers in the saved file names ("… - 03.jpg").
  const digits = Math.max(2, String(Math.max(...items.map((i) => i.index))).length);
  const needsAttest = source.policy.status === 'attestation';
  const count = picks.length;

  function toggle(index, on) {
    setPicks(on ? [...new Set([...picks, index])] : picks.filter((x) => x !== index));
  }

  function start() {
    enqueue([
      {
        body: galleryJobBody({ probeId: probe.id, items: picks, attest, filename: selection?.filename }),
        meta: { probeId: probe.id, sourceUrl: source.url, title: media.title, platformName: source.platform.name, label: t('gallery.title', { count }) },
      },
    ]);
    toast({ title: t('picker.added'), action: { label: t('picker.view'), onClick: () => navigate('/downloads') } });
  }

  const action = (
    <Button variant="primary" size="lg" icon={Download} className="w-full" disabled={!count || (needsAttest && !attest)} onClick={start}>
      {t('gallery.download', { count })}
    </Button>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-12">
      <section aria-labelledby="gallery-title">
        <h2 id="gallery-title" className="text-balance text-2xl font-bold leading-tight">
          {media.title}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
          <span>{t('gallery.title', { count: items.length })}</span>
          {media.uploader && <span>{t('preview.by', { name: media.uploader })}</span>}
          <span className="font-semibold text-ink">{source.platform.name}</span>
          <PolicyBadge policy={source.policy.status} label={t(`policy.${source.policy.status}`)} />
          {media.uploadDate && <time dateTime={media.uploadDate}>{media.uploadDate}</time>}
        </p>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-hull underline-offset-4 hover:underline dark:text-signal">
          {t('preview.openOriginal')}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" icon={ListChecks} onClick={() => setPicks(items.map((i) => i.index))}>
            {t('gallery.selectAll')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicks([])}>
            {t('gallery.selectNone')}
          </Button>
          <span className="ms-auto text-sm text-ink-2 tabular-nums" aria-live="polite">
            {t('gallery.selected', { selected: count, count: items.length })}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Tile
              key={item.index}
              item={item}
              checked={picks.includes(item.index)}
              onChange={(on) => toggle(item.index, on)}
              number={String(item.index).padStart(digits, '0')}
              label={item.width && item.height ? t('gallery.imageSize', { n: item.index, width: item.width, height: item.height }) : t('gallery.image', { n: item.index })}
            />
          ))}
        </ul>
        {(skipped.videos > 0 || skipped.links > 0 || truncated) && (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-ink-2">
            {skipped.videos > 0 && <li>{t('gallery.skippedVideos', { count: skipped.videos })}</li>}
            {skipped.links > 0 && <li>{t('gallery.skippedLinks', { count: skipped.links })}</li>}
            {truncated && <li>{t('gallery.more', { count: items.length })}</li>}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <p className="text-sm text-ink-2">{t('gallery.note')}</p>
        {needsAttest && <AttestBox source={source} checked={attest} onChange={setAttest} />}
        {!count && (
          <p role="status" className="text-sm font-semibold text-amber">
            {t('gallery.none')}
          </p>
        )}
        <div className="hidden md:block">{action}</div>
        <Following probeId={probe.id} />
      </section>
      {/* Phone: the primary action stays under the thumb, above the tab bar. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">{action}</div>
    </div>
  );
}
