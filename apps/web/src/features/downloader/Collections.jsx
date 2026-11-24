/** Playlist and batch panels — loaded on demand after an analysis returns. */
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Check, Download, ListChecks, Loader2, Trash2 } from 'lucide-react';
import { useI18n, errorText } from '../../lib/i18n/index.jsx';
import { duration } from '../../lib/format.js';
import { initialSelection, jobBody, useAnalysis } from '../../state/analysis.js';
import { useDownloads } from '../../state/downloads.js';
import { toast } from '../../state/toasts.js';
import { Button, Checkbox, PolicyBadge, cx } from '../../components/ui.jsx';
import { FormatPicker, outputLabel } from './Picker.jsx';
import { AttestBox } from './Workspace.jsx';

/** Playlists and multi-item pages: choose items, one format for all. */
export function PlaylistPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const result = useAnalysis((s) => s.result);
  const picks = useAnalysis((s) => s.playlistPicks);
  const setPicks = useAnalysis((s) => s.setPlaylistPicks);
  const selection = useAnalysis((s) => s.selection);
  const setSelection = useAnalysis((s) => s.setSelection);
  const attest = useAnalysis((s) => s.attest);
  const setAttest = useAnalysis((s) => s.setAttest);
  const enqueue = useDownloads((s) => s.enqueue);
  const { media, source, probe, limits } = result;
  const needsAttest = source.policy.status === 'attestation';

  function start() {
    const label = outputLabel(null, selection);
    enqueue(
      media.entries
        .filter((e) => picks.includes(e.id))
        .map((e) => ({
          body: jobBody({ probeId: probe.id, entryId: e.id, selection, media: null, attest }),
          meta: { probeId: probe.id, sourceUrl: source.url, title: e.title, platformName: source.platform.name, label },
        })),
    );
    toast({ title: t('picker.added'), action: { label: t('picker.view'), onClick: () => navigate('/downloads') } });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
      <section aria-labelledby="pl-title">
        <h2 id="pl-title" className="text-2xl font-bold">
          {media.title}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <span>{t('playlist.title', { count: media.entryCount ?? media.entries.length })}</span>
          <span className="font-semibold text-ink">{source.platform.name}</span>
          <PolicyBadge policy={source.policy.status} label={t(`policy.${source.policy.status}`)} />
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" icon={ListChecks} onClick={() => setPicks(media.entries.map((e) => e.id))}>
            {t('playlist.selectAll')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicks([])}>
            {t('playlist.selectNone')}
          </Button>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {media.entries.map((e) => (
            <li key={e.id}>
              <Checkbox checked={picks.includes(e.id)} onChange={(on) => setPicks(on ? [...picks, e.id] : picks.filter((x) => x !== e.id))} className="py-3">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 font-medium">{e.title}</span>
                  {e.durationSec != null && <span className="shrink-0 text-sm text-ink-2 tabular-nums">{duration(e.durationSec)}</span>}
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
        {media.entryCount > media.entries.length && <p className="mt-2 text-sm text-ink-2">{t('playlist.more', { count: media.entries.length })}</p>}
      </section>
      <section className="flex flex-col gap-6">
        <FormatPicker media={null} selection={selection} onChange={setSelection} limits={limits} />
        <p className="text-sm text-ink-2">{t('playlist.note')}</p>
        {needsAttest && <AttestBox source={source} checked={attest} onChange={setAttest} />}
        <Button variant="primary" size="lg" icon={Download} disabled={!picks.length || (needsAttest && !attest)} onClick={start}>
          {t('playlist.download', { count: picks.length })}
        </Button>
      </section>
    </div>
  );
}

/** Several pasted links analysed in parallel, downloaded with one set of choices. */
export function BatchPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const batch = useAnalysis((s) => s.batch);
  const remove = useAnalysis((s) => s.removeFromBatch);
  const selection = useAnalysis((s) => s.selection) ?? initialSelection(null);
  const setSelection = useAnalysis((s) => s.setSelection);
  const attest = useAnalysis((s) => s.attest);
  const setAttest = useAnalysis((s) => s.setAttest);
  const enqueue = useDownloads((s) => s.enqueue);

  // Playlists and galleries need their own picker, so a batch skips them.
  const ready = useMemo(() => batch.filter((b) => b.status === 'ready' && !['playlist', 'gallery'].includes(b.result?.media?.kind)), [batch]);
  const attestItem = ready.find((b) => b.result.source.policy.status === 'attestation');

  function start() {
    enqueue(
      ready
        .filter((b) => b.result.media.capabilities.modes.includes(selection.mode))
        .map((b) => ({
          body: jobBody({ probeId: b.result.probe.id, selection, media: b.result.media, attest }),
          meta: { probeId: b.result.probe.id, sourceUrl: b.url, title: b.result.media.title, platformName: b.result.source.platform.name, label: outputLabel(b.result.media, selection) },
        })),
    );
    toast({ title: t('picker.added'), action: { label: t('picker.view'), onClick: () => navigate('/downloads') } });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
      <section aria-labelledby="batch-title">
        <h2 id="batch-title" className="text-2xl font-bold">
          {t('batch.title')}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {batch.map((b) => (
            <li key={b.url} className="flex items-start gap-3 py-3">
              <span className="mt-1 shrink-0">
                {b.status === 'probing' || b.status === 'pending' ? (
                  <Loader2 className={cx('size-5 text-ink-2', b.status === 'probing' && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
                ) : b.status === 'ready' ? (
                  <Check className="size-5 text-kelp" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-5 text-buoy" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.result?.media?.title ?? b.url}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                  {b.status === 'error' ? (
                    <span className="text-buoy">{errorText(t, b.error)}</span>
                  ) : b.result ? (
                    <>
                      <span>{b.result.source.platform.name}</span>
                      <PolicyBadge policy={b.result.source.policy.status} label={t(`policy.${b.result.source.policy.status}`)} />
                      {b.result.media.durationSec != null && <span className="tabular-nums">{duration(b.result.media.durationSec)}</span>}
                    </>
                  ) : (
                    <span>{t(`batch.status.${b.status}`)}</span>
                  )}
                </p>
              </div>
              <button type="button" aria-label={t('batch.remove', { title: b.result?.media?.title ?? b.url })} className="rounded p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" onClick={() => remove(b.url)}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-6">
        <FormatPicker media={null} selection={selection} onChange={setSelection} limits={{ maxFileSizeBytes: Infinity }} />
        <p className="text-sm text-ink-2">{t('batch.note')}</p>
        {attestItem && <AttestBox source={attestItem.result.source} checked={attest} onChange={setAttest} />}
        <Button variant="primary" size="lg" icon={Download} disabled={!ready.length || (attestItem && !attest)} onClick={start}>
          {t('batch.download', { count: ready.length })}
        </Button>
      </section>
    </div>
  );
}
