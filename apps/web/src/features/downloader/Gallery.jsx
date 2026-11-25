/** Image galleries and carousels: a contact sheet to choose images, downloaded as one job. */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Download, ExternalLink, ImageOff, ListChecks, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../lib/i18n/index.jsx';
import { siteStatus } from '../../lib/siteStatus.js';
import { galleryJobBody, useAnalysis } from '../../state/analysis.js';
import { useDownloads } from '../../state/downloads.js';
import { toast } from '../../state/toasts.js';
import { SiteIcon } from '../../components/SiteIcon.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { Button, cx } from '../../components/ui.jsx';
import { AttestBox, Following } from './Workspace.jsx';

/** One image: a native checkbox whose label is the picture (selected = sun ring and tick, unselected = dimmed). */
function Tile({ item, checked, onChange, number, label }) {
  const [previewOk, setPreviewOk] = useState(Boolean(item.previewUrl));
  return (
    <li>
      <label
        className="relative block cursor-pointer overflow-hidden rounded-xl bg-field has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]"
      >
        <span className="sr-only">{label}</span>
        <span className="block aspect-square">
          {previewOk ? (
            <img
              src={item.previewUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cx('size-full object-cover transition-[opacity,filter] duration-150 motion-reduce:transition-none', !checked && 'opacity-55 saturate-50')}
              onError={() => setPreviewOk(false)}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-ink-2">
              <ImageOff className="size-6" aria-hidden="true" />
            </span>
          )}
        </span>
        <span aria-hidden="true" className={cx('pointer-events-none absolute inset-0 rounded-xl', checked ? 'shadow-[inset_0_0_0_3px_var(--sun)]' : 'shadow-[inset_0_0_0_1px_var(--line)]')} />
        {/* The round tick is the real checkbox; tapping anywhere on the picture toggles it too. */}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute end-2 top-2 z-10 m-0 size-6 cursor-pointer appearance-none rounded-full border-2 border-white bg-black/25 checked:border-sun checked:bg-sun focus:outline-none"
        />
        {checked && <Check aria-hidden="true" className="pointer-events-none absolute end-[13px] top-[13px] z-20 size-3.5 text-sun-ink" strokeWidth={3.2} />}
        <span aria-hidden="true" className="absolute start-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
          {number}
        </span>
        {item.width && item.height && (
          <span aria-hidden="true" className="absolute bottom-2 start-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs tabular-nums text-white">
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
  const needsAttest = source.policy.confirm === true; // the server says whether to ask (ASK_PERMISSION)
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
    <Button variant="primary" size="lg" icon={Download} className="h-[62px] w-full rounded-[18px] text-[17px]" disabled={!count || (needsAttest && !attest)} onClick={start}>
      {t('gallery.download', { count })}
    </Button>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-6">
      <section aria-labelledby="gallery-title" className="rounded-[var(--radius-card)] bg-paper p-4 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <SiteIcon id={source.platform.id} name={source.platform.name} size={44} />
          <div className="min-w-0 flex-1">
            <h2 id="gallery-title" className="heading text-balance text-[22px] leading-tight">
              {media.title}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-2">
              <span>{t('gallery.title', { count: items.length })}</span>
              <span>{source.platform.name}</span>
              {media.uploader && <span>{t('preview.by', { name: media.uploader })}</span>}
              <StatusPill status={siteStatus({ id: source.platform.id, policy: source.policy.status, available: true })} mini />
            </p>
          </div>
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-[1.5px] underline-offset-[3px]">
          {t('preview.openOriginal')}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" icon={ListChecks} onClick={() => setPicks(items.map((i) => i.index))}>
            {t('gallery.selectAll')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicks([])}>
            {t('gallery.selectNone')}
          </Button>
          <span className="ms-auto text-sm font-bold tabular-nums" aria-live="polite">
            {t('gallery.selected', { selected: count, count: items.length })}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2.5 xl:grid-cols-5">
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

      <section className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-paper p-5 shadow-card sm:p-6">
        <p className="flex items-start gap-2.5 text-sm text-ink-2">
          <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-ok" aria-hidden="true" />
          {t('gallery.note')}
        </p>
        {needsAttest && <AttestBox source={source} checked={attest} onChange={setAttest} />}
        {!count && (
          <p role="status" className="text-sm font-bold text-warn">
            {t('gallery.none')}
          </p>
        )}
        <div className="hidden md:block">{action}</div>
        <Following probeId={probe.id} />
      </section>
      {/* Phone: the primary action stays under the thumb, above the tab bar. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div data-mobile-bar className="fixed inset-x-0 bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:hidden">{action}</div>
    </div>
  );
}
