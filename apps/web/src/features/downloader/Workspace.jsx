/** A single analysed item: the media card on one side, "Your file" on the other. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AudioLines, Captions, Clock, Download, ExternalLink, ImageOff } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { bytes, duration } from '../../lib/format.js';
import { siteStatus } from '../../lib/siteStatus.js';
import { jobBody, parseTrim, useAnalysis } from '../../state/analysis.js';
import { useDownloads } from '../../state/downloads.js';
import { usePlatforms } from '../../lib/registry.js';
import { useSettings } from '../../state/settings.js';
import { toast } from '../../state/toasts.js';
import { SiteIcon, brandAccent } from '../../components/SiteIcon.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { VideoSoundIcon } from '../../components/icons.jsx';
import { Button, cx } from '../../components/ui.jsx';
import { RouteList } from './Panels.jsx';
import { AdvancedOptions, CODEC_NAMES, FormatPicker, estimateSize, outputLabel } from './Picker.jsx';

/** Thumbnail shown whole (portrait videos too) over a blurred copy of itself. */
export function Thumb({ src, durationSec, className, fallback }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(Boolean(src));
  const len = duration(durationSec);
  return (
    <div className={cx('relative grid place-items-center overflow-hidden bg-[#111]', className)}>
      {ok ? (
        <>
          <img src={src} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-80 blur-2xl" decoding="async" />
          <img src={src} alt="" className="relative size-full object-contain" decoding="async" onError={() => setOk(false)} />
        </>
      ) : (
        fallback ?? (
          <span className="flex flex-col items-center gap-2 text-sm text-white/70">
            <ImageOff className="size-7" aria-hidden="true" />
            {t('preview.noThumbnail')}
          </span>
        )
      )}
      {len && (
        <span className="absolute bottom-3 end-3 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-0.5 text-[13px] font-semibold text-white tabular-nums">
          <Clock className="size-3.5" aria-hidden="true" />
          {len}
        </span>
      )}
    </div>
  );
}

export function MediaPreview({ result }) {
  const { t } = useI18n();
  const { media, source } = result;
  const best = media.video?.qualities?.[0];
  const track = media.audio?.best;
  const facts = [
    best && [VideoSoundIcon, t('preview.video'), [best.tag ? `${best.label} ${best.tag}` : best.label, best.fps ? `${Math.round(best.fps)} fps` : null].filter(Boolean).join(', ')],
    track?.codec && [AudioLines, t('preview.sound'), [CODEC_NAMES[track.codec] ?? track.codec, track.abrKbps ? `${track.abrKbps} kbps` : null].filter(Boolean).join(', ')],
    media.subtitles && [Captions, t('preview.subtitles'), media.subtitles.length ? t('preview.subtitleCount', { count: media.subtitles.length }) : t('preview.none')],
    media.durationSec != null && [Clock, t('preview.length'), duration(media.durationSec)],
  ].filter(Boolean);
  return (
    <section aria-labelledby="media-title" className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-card">
      <Thumb src={media.thumbnailUrl} durationSec={media.durationSec} className="h-[260px] sm:h-[360px] lg:h-[430px]" />
      <div className="p-5">
        <h2 id="media-title" className="text-balance text-[19px] font-bold leading-snug">
          {media.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <SiteIcon id={source.platform.id} name={source.platform.name} size={22} />
            {source.platform.name}
          </span>
          {media.uploader && <span>{t('preview.by', { name: media.uploader })}</span>}
          <StatusPill status={siteStatus({ id: source.platform.id, policy: source.policy.status, available: true })} mini />
        </div>
        {facts.length > 0 && (
          <ul className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
            {facts.map(([Icon, label, value]) => (
              <li key={label} className="flex items-center gap-2.5 text-ink-2">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  <b className="font-semibold text-ink">{label}</b> {value}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(media.license || media.uploadDate) && (
          <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-ink-2">
            {media.license && <span>{t('preview.license', { license: media.license })}</span>}
            {media.uploadDate && <time dateTime={media.uploadDate}>{media.uploadDate}</time>}
          </p>
        )}
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
          {t('preview.openOriginal')}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/** "It's my content, or I have permission", with the site's own rules and official routes. */
export function AttestBox({ source, checked, onChange }) {
  const { t } = useI18n();
  const generic = ['generic', 'direct'].includes(source.platform.id);
  return (
    <div className="rounded-2xl bg-perm-soft p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 grid size-[22px] shrink-0 appearance-none place-items-center rounded-[7px] bg-paper shadow-[inset_0_0_0_2px_var(--perm)] checked:bg-perm checked:shadow-none checked:after:block checked:after:h-[5px] checked:after:w-2.5 checked:after:-translate-y-px checked:after:-rotate-45 checked:after:border-b-[2.5px] checked:after:border-s-[2.5px] checked:after:border-paper checked:after:content-['']"
        />
        <span className="min-w-0">
          <span className="block text-[14.5px] font-bold text-ink">{generic ? t('attest.generic') : t('attest.confirm')}</span>
          {source.policy.attestation && <span className="mt-0.5 block text-[13px] text-ink-2">{source.policy.attestation}</span>}
        </span>
      </label>
      {source.policy.routes?.length > 0 && (
        <details className="group mt-3">
          <summary className="text-[13px] font-semibold text-perm underline decoration-[1.5px] underline-offset-[3px]">{t('attest.routes')}</summary>
          <div className="mt-2">
            <RouteList routes={source.policy.routes} />
          </div>
        </details>
      )}
    </div>
  );
}

/** Progress of downloads started from this analysis. */
export function Following({ probeId }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  // Select raw state and derive in render: a selector returning a new array re-renders forever.
  const tracked = useDownloads((s) => s.tracked);
  const jobs = useDownloads((s) => s.jobs);
  const items = useMemo(() => Object.values(tracked).filter((x) => x.meta?.probeId === probeId).sort((a, b) => b.addedAt - a.addedAt), [tracked, probeId]);
  const saveResult = useDownloads((s) => s.saveResult);
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-4 border-t border-line pt-5">
      {items.slice(0, 3).map((it) => {
        const job = jobs[it.id];
        if (!job) return null;
        return (
          <li key={it.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold">{it.meta.label}</span>
              <span className="text-ink-2">{t(`downloads.status.${job.status}`)}</span>
            </div>
            <ProgressBar job={job} accent={brandAccent(job.source?.platformId)} />
            <div className="flex gap-2">
              {job.status === 'ready' && (
                <Button size="sm" variant="primary" icon={Download} onClick={() => saveResult(job.id)}>
                  {job.request?.mode === 'gallery' && job.output.files.length > 1 ? t('downloads.saveAll') : t('downloads.save')}
                  {job.request?.mode !== 'gallery' && job.output.files[0]?.sizeBytes ? <span className="font-medium opacity-80 tabular-nums">{bytes(job.output.files[0].sizeBytes, { locale })}</span> : null}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => navigate('/downloads')}>
                {t('picker.view')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The main action: what you get on the first line, the size on the second. */
export function DownloadButton({ label, size, disabled, busy, onClick, className }) {
  const { t, locale } = useI18n();
  const sub = size?.bytes != null ? t('picker.sizeAbout', { size: bytes(size.bytes, { locale }) }) : t('picker.sizeLater');
  return (
    <Button variant="primary" size="lg" onClick={onClick} disabled={disabled || busy} className={cx('h-auto! min-h-[62px] w-full gap-3 rounded-[18px] py-2.5', className)}>
      <Download aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[17px]">{busy ? t('picker.adding') : t('picker.download', { what: label })}</span>{' '}
        <small className="text-[13px] font-medium opacity-80">{sub}</small>
      </span>
    </Button>
  );
}

export function Workspace() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const result = useAnalysis((s) => s.result);
  const selection = useAnalysis((s) => s.selection);
  const setSelection = useAnalysis((s) => s.setSelection);
  const attest = useAnalysis((s) => s.attest);
  const setAttest = useAnalysis((s) => s.setAttest);
  const enqueue = useDownloads((s) => s.enqueue);
  const updateSettings = useSettings((s) => s.update);
  const ttl = usePlatforms((s) => s.config?.limits?.jobTtlMinutes);
  const [busy, setBusy] = useState(false);
  if (!result || !selection) return null;

  const { media, source, probe, limits } = result;
  const needsAttest = source.policy.confirm === true; // the server says whether to ask (ASK_PERMISSION)
  const trimOk = parseTrim(selection.extras.trim, media.durationSec).ok;
  const size = estimateSize(media, selection);
  const tooLarge = size.bytes != null && size.bytes > limits.maxFileSizeBytes;
  const label = outputLabel(media, selection);
  const blocked = (needsAttest && !attest) || !trimOk || tooLarge;

  async function start() {
    setBusy(true);
    try {
      if (needsAttest && ['generic', 'direct'].includes(source.platform.id)) updateSettings({ acknowledgedGenericTerms: true });
      enqueue([
        {
          body: jobBody({ probeId: probe.id, selection, media, attest }),
          meta: { probeId: probe.id, sourceUrl: source.url, title: media.title, platformName: source.platform.name, label },
        },
      ]);
      toast({ title: t('picker.added'), action: { label: t('picker.view'), onClick: () => navigate('/downloads') } });
    } catch (err) {
      toast({ title: errorText(t, err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const action = <DownloadButton label={label} size={size} disabled={blocked} busy={busy} onClick={start} />;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[372px_minmax(0,1fr)] lg:gap-6">
      <MediaPreview result={result} />
      <section aria-labelledby="picker-title" className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-paper p-4 shadow-card max-md:-mx-4 max-md:rounded-b-none max-md:rounded-t-[28px] max-md:pt-3 sm:p-6">
        <span aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-line-2 md:hidden" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="picker-title" className="heading text-[22px]">
            {t('picker.title')}
          </h2>
          <span className="text-[13px] text-ink-2">{t('picker.hint')}</span>
        </div>
        <FormatPicker media={media} selection={selection} onChange={setSelection} limits={limits} />
        <AdvancedOptions media={media} selection={selection} onChange={setSelection} platformName={source.platform.name} hasThumbnail={Boolean(media.thumbnailUrl)} />
        {needsAttest && <AttestBox source={source} checked={attest} onChange={setAttest} />}
        <div className="hidden flex-col gap-2.5 md:flex">
          {action}
          {ttl && <p className="text-center text-[12.5px] text-ink-2">{t('picker.leaves', { minutes: ttl })}</p>}
        </div>
        <Following probeId={probe.id} />
      </section>
      {/* Phone: the primary action stays under the thumb, above the tab bar. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div data-mobile-bar className="fixed inset-x-0 bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:hidden">{action}</div>
    </div>
  );
}
