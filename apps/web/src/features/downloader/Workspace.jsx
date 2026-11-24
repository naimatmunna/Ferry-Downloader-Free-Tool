/** A single analysed item: preview on one side, "your file" on the other. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Download, ExternalLink } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { duration } from '../../lib/format.js';
import { jobBody, parseTrim, useAnalysis } from '../../state/analysis.js';
import { useDownloads } from '../../state/downloads.js';
import { useSettings } from '../../state/settings.js';
import { toast } from '../../state/toasts.js';
import { Button, Checkbox, PolicyBadge, cx } from '../../components/ui.jsx';
import { RouteLine } from '../../components/RouteLine.jsx';
import { AdvancedOptions, FormatPicker, estimateSize, outputLabel } from './Picker.jsx';

export function MediaPreview({ result }) {
  const { t } = useI18n();
  const { media, source } = result;
  const [imgOk, setImgOk] = useState(true);
  const len = duration(media.durationSec);
  return (
    <section aria-labelledby="media-title" className="flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-panel)] bg-surface-2">
        {media.thumbnailUrl && imgOk ? (
          <img src={media.thumbnailUrl} alt="" className="size-full object-cover" decoding="async" onError={() => setImgOk(false)} />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-ink-2">{t('preview.noThumbnail')}</div>
        )}
        {len && (
          <span className="absolute bottom-2 end-2 flex items-center gap-1 rounded-md bg-ink/85 px-2 py-0.5 text-sm font-semibold text-canvas tabular-nums">
            <Clock className="size-3.5" aria-hidden="true" />
            {len}
          </span>
        )}
      </div>
      <div>
        <h2 id="media-title" className="text-balance text-2xl font-bold leading-tight">
          {media.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
          {media.uploader && <span>{t('preview.by', { name: media.uploader })}</span>}
          <span className="font-semibold text-ink">{source.platform.name}</span>
          <PolicyBadge policy={source.policy.status} label={t(`policy.${source.policy.status}`)} />
          {media.license && <span>{t('preview.license', { license: media.license })}</span>}
          {media.uploadDate && <time dateTime={media.uploadDate}>{media.uploadDate}</time>}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-hull underline-offset-4 hover:underline dark:text-signal">
          {t('preview.openOriginal')}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export function AttestBox({ source, checked, onChange }) {
  const { t } = useI18n();
  const generic = ['generic', 'direct'].includes(source.platform.id);
  return (
    <div className="rounded-[var(--radius-panel)] border border-amber/40 bg-amber-soft p-4 text-ink">
      {source.policy.attestation && <p className="mb-2 text-sm">{source.policy.attestation}</p>}
      <Checkbox checked={checked} onChange={onChange}>
        <span className="font-semibold">{generic ? t('attest.generic') : t('attest.confirm')}</span>
      </Checkbox>
      {source.policy.routes?.length > 0 && (
        <div className="mt-2 text-sm">
          <p className="font-semibold">{t('attest.routes')}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {source.policy.routes.map((r) => (
              <li key={r.label}>
                {r.url ? (
                  <a className="underline underline-offset-4" href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.label}
                  </a>
                ) : (
                  r.label
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Shows the route line of downloads started from this analysis. */
function Following({ probeId }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  // Select raw state and derive in render: a selector returning a new array re-renders forever.
  const tracked = useDownloads((s) => s.tracked);
  const jobs = useDownloads((s) => s.jobs);
  const items = useMemo(() => Object.values(tracked).filter((x) => x.meta?.probeId === probeId).sort((a, b) => b.addedAt - a.addedAt), [tracked, probeId]);
  const save = useDownloads((s) => s.save);
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-4 border-t border-line pt-5">
      {items.slice(0, 3).map((it) => {
        const job = jobs[it.id];
        if (!job) return null;
        return (
          <li key={it.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{it.meta.label}</span>
              <span className="text-ink-2">{t(`downloads.status.${job.status}`)}</span>
            </div>
            <RouteLine job={job} compact />
            <div className="flex gap-2">
              {job.status === 'ready' && (
                <Button size="sm" variant="primary" icon={Download} onClick={() => save(job.id, job.output.files[0].id)}>
                  {t('downloads.save')}
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
  const [busy, setBusy] = useState(false);
  if (!result || !selection) return null;

  const { media, source, probe, limits } = result;
  const needsAttest = source.policy.status === 'attestation';
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

  const action = (
    <Button variant="primary" size="lg" icon={Download} className="w-full" onClick={start} disabled={blocked || busy}>
      {busy ? t('picker.adding') : t('picker.download', { what: label })}
    </Button>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
      <MediaPreview result={result} />
      <section aria-labelledby="picker-title" className="flex flex-col gap-6">
        <h2 id="picker-title" className="sr-only">
          {t('picker.title')}
        </h2>
        <FormatPicker media={media} selection={selection} onChange={setSelection} limits={limits} />
        <AdvancedOptions media={media} selection={selection} onChange={setSelection} platformName={source.platform.name} hasThumbnail={Boolean(media.thumbnailUrl)} />
        {needsAttest && <AttestBox source={source} checked={attest} onChange={setAttest} />}
        <div className="hidden md:block">{action}</div>
        <Following probeId={probe.id} />
      </section>
      {/* Phone: the primary action stays under the thumb, above the tab bar. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div className={cx('fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden')}>{action}</div>
    </div>
  );
}
