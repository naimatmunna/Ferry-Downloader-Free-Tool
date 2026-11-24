/**
 * Format selection. Every option shown is derived from what the source
 * actually offers; sizes appear only when the source reports them (or are
 * computed from a chosen bitrate and a known duration, marked as estimates).
 */
import { useMemo } from 'react';
import { AudioLines, ChevronDown, Film, Info, VideoOff } from 'lucide-react';
import {
  AUDIO_BITRATES,
  AUDIO_FORMATS,
  QUALITY_LADDER,
  VIDEO_CONTAINERS,
  containerAcceptsAudio,
  containerAcceptsVideo,
  describeAudioConversion,
  estimateBytes,
  estimateWavBytes,
  qualityLabel,
} from '@ferry/shared/formats';
import { TEMPLATE_TOKENS, buildDownloadName, validateTemplate } from '@ferry/shared/filename';
import { useI18n } from '../../lib/i18n/index.jsx';
import { bytes } from '../../lib/format.js';
import { parseTrim } from '../../state/analysis.js';
import { ChoiceChips, Checkbox, Segmented, Select, Switch, TextField, cx } from '../../components/ui.jsx';

const CODEC_NAMES = { aac: 'AAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis', flac: 'FLAC', alac: 'ALAC', pcm: 'PCM', ac3: 'AC-3', eac3: 'E-AC-3' };

export function selectedTrack(media, selection) {
  const tracks = media?.audio?.tracks ?? [];
  return tracks.find((x) => x.language && x.language === selection.audio.language) ?? media?.audio?.best ?? null;
}

export function selectedQuality(media, selection) {
  const list = media?.video?.qualities ?? [];
  return list.find((q) => q.res === selection.video.quality) ?? list[0] ?? null;
}

/** Size estimate for the current selection: { bytes, approx } or { bytes: null }. */
export function estimateSize(media, selection) {
  if (!media) return { bytes: null };
  const dur = media.durationSec;
  const trim = parseTrim(selection.extras.trim, dur);
  const span = trim.ok && trim.trim && dur ? (trim.trim.end ?? dur) - trim.trim.start : dur;
  const fraction = dur && span ? span / dur : 1;
  if (selection.mode !== 'audio') {
    if (selection.video.compress) return { bytes: null };
    const q = selectedQuality(media, selection);
    const b = q ? (selection.mode === 'video' ? q.sizeBytes.video : q.sizeBytes.av) : null;
    return b ? { bytes: Math.round(b * fraction), approx: q.approx || fraction !== 1 } : { bytes: null };
  }
  const track = selectedTrack(media, selection);
  const fmt = AUDIO_FORMATS[selection.audio.format];
  const conv = describeAudioConversion({ codec: track?.codec ?? null, abrKbps: track?.abrKbps ?? null }, { format: fmt.id, bitrate: fmt.lossless ? 'source' : selection.audio.bitrate });
  if (conv.action === 'copy') return track?.sizeBytes ? { bytes: Math.round(track.sizeBytes * fraction), approx: track.approx || fraction !== 1 } : { bytes: null };
  if (fmt.id === 'wav') return span ? { bytes: estimateWavBytes(span), approx: true } : { bytes: null };
  if (fmt.id === 'flac') return { bytes: null };
  const b = estimateBytes(conv.effectiveKbps, span);
  return b ? { bytes: b, approx: true } : { bytes: null };
}

/** Short output label: "1080p MP4", "MP4", "MP3". */
export function outputLabel(media, selection) {
  if (selection.mode === 'audio') return AUDIO_FORMATS[selection.audio.format].label;
  const fmt = VIDEO_CONTAINERS[selection.video.container].label;
  const q = selection.video.quality;
  if (media && !media.video.qualities.length) return fmt;
  return q === 'best' ? fmt : `${qualityLabel(q).short} ${fmt}`;
}

export function FormatPicker({ media, selection, onChange, limits }) {
  const { t, locale } = useI18n();
  const caps = media?.capabilities ?? { modes: ['av', 'video', 'audio'] };
  const mode = selection.mode;

  const modeOptions = [
    { value: 'av', label: t('picker.mode.av'), icon: Film, disabled: !caps.modes.includes('av') },
    { value: 'video', label: t('picker.mode.video'), icon: VideoOff, disabled: !caps.modes.includes('video') },
    { value: 'audio', label: t('picker.mode.audio'), icon: AudioLines, disabled: !caps.modes.includes('audio') },
  ];

  const qualityOptions = useMemo(() => {
    if (!media) {
      // Batch/playlist: a cap applied per item.
      return [{ value: 'best', label: t('picker.quality.original') }, ...[2160, 1440, 1080, 720, 480, 360].map((r) => ({ value: r, label: qualityLabel(r).short }))];
    }
    if (!media.video.qualities.length) return [{ value: 'best', label: t('picker.quality.original') }];
    return media.video.qualities.map((q) => {
      const size = mode === 'video' ? q.sizeBytes.video : q.sizeBytes.av;
      const extras = [q.fps && q.fps >= 48 ? `${Math.round(q.fps)} fps` : null, q.hdr ? t('picker.quality.hdr') : null, size ? bytes(size, { approx: q.approx, locale }) : null].filter(Boolean);
      return { value: q.res, label: q.tag ? `${q.label} ${q.tag}` : q.label, sub: extras.join('  ') || null };
    });
  }, [media, mode, t, locale]);

  const quality = selectedQuality(media, selection);
  const container = selection.video.container;
  const notes = [];
  if (mode !== 'audio' && media && quality?.codecs?.length) {
    const vCopy = !selection.video.compress && quality.codecs.some((c) => containerAcceptsVideo(container, c));
    if (!vCopy) notes.push(t('picker.reencode.video', { format: VIDEO_CONTAINERS[container].label }));
    const aCodecs = media.audio.tracks.map((x) => x.codec).filter(Boolean);
    if (mode === 'av' && aCodecs.length && !aCodecs.some((c) => containerAcceptsAudio(container, c))) notes.push(t('picker.reencode.audio', { format: VIDEO_CONTAINERS[container].label }));
    if (!notes.length) notes.push(t('picker.reencode.none'));
  }

  const track = selectedTrack(media, selection);
  const fmt = AUDIO_FORMATS[selection.audio.format];
  const conv = describeAudioConversion({ codec: track?.codec ?? null, abrKbps: track?.abrKbps ?? null }, { format: fmt.id, bitrate: fmt.lossless ? 'source' : selection.audio.bitrate });
  const audioNotes = [];
  if (mode === 'audio' && media) {
    if (track?.codec) audioNotes.push(track.abrKbps ? t('picker.audio.source_is', { codec: CODEC_NAMES[track.codec] ?? track.codec, kbps: track.abrKbps }) : t('picker.audio.source_is_norate', { codec: CODEC_NAMES[track.codec] ?? track.codec }));
    else audioNotes.push(t('picker.audio.source_unknown'));
    if (conv.action === 'copy') audioNotes.push(t('picker.audio.copy'));
    else if (conv.action === 'decode') {
      if (conv.losslessFromLossy) audioNotes.push(t('picker.audio.lossless_from_lossy', { format: fmt.label }));
    } else if (conv.effectiveKbps) audioNotes.push(t('picker.audio.transcode', { format: fmt.label, kbps: conv.effectiveKbps }));
  }

  const size = estimateSize(media, selection);
  const tooLarge = size.bytes != null && limits?.maxFileSizeBytes && size.bytes > limits.maxFileSizeBytes;

  return (
    <div className="flex flex-col gap-6">
      <Segmented legend={t('picker.mode.label')} name="mode" value={mode} onChange={(v) => onChange({ mode: v })} options={modeOptions} />

      {mode !== 'audio' && (
        <>
          <ChoiceChips
            legend={t('picker.quality.label')}
            name="quality"
            value={media?.video?.qualities?.length ? selection.video.quality : selection.video.quality}
            onChange={(v) => onChange({ video: { quality: v } })}
            options={qualityOptions}
            hint={media && !media.video.qualities.length ? t('picker.quality.unknownNote') : null}
          />
          <ChoiceChips
            legend={t('picker.container.label')}
            name="container"
            value={container}
            onChange={(v) => onChange({ video: { container: v } })}
            options={Object.values(VIDEO_CONTAINERS).map((c) => ({ value: c.id, label: c.label, sub: t(`picker.container.${c.id}`) }))}
          />
          {notes.length > 0 && <Note>{notes.join(' ')}</Note>}
        </>
      )}

      {mode === 'audio' && (
        <>
          <ChoiceChips
            legend={t('picker.audio.label')}
            name="audio-format"
            value={selection.audio.format}
            onChange={(v) => onChange({ audio: { format: v } })}
            options={Object.values(AUDIO_FORMATS).map((a) => ({ value: a.id, label: a.label, sub: t(`picker.audio.formats.${a.id}`) }))}
          />
          {!fmt.lossless && (
            <Select
              label={t('picker.audio.bitrate')}
              value={selection.audio.bitrate}
              onChange={(v) => onChange({ audio: { bitrate: v === 'source' ? 'source' : Number(v) } })}
              options={[{ value: 'source', label: t('picker.audio.source') }, ...AUDIO_BITRATES.map((n) => ({ value: n, label: t('picker.audio.kbps', { n }) }))]}
              className="max-w-xs"
            />
          )}
          {audioNotes.length > 0 && <Note>{audioNotes.join(' ')}</Note>}
          {conv.aboveSource && <Note tone="warn">{t('picker.audio.above_source', { kbps: conv.effectiveKbps })}</Note>}
        </>
      )}

      {media && (
        <p className={cx('text-sm', tooLarge ? 'font-semibold text-buoy' : 'text-ink-2')} aria-live="polite">
          {tooLarge
            ? t('picker.size.too_large', { max: bytes(limits.maxFileSizeBytes, { locale }) })
            : size.bytes != null
              ? t('picker.size.about', { size: bytes(size.bytes, { locale }) })
              : t('picker.size.unknown')}
        </p>
      )}
    </div>
  );
}

export function Note({ children, tone = 'info' }) {
  return (
    <p className={cx('flex items-start gap-2 rounded-[var(--radius-control)] px-3 py-2.5 text-sm', tone === 'warn' ? 'bg-amber-soft text-amber' : 'bg-surface-2 text-ink-2')}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function AdvancedOptions({ media, selection, onChange, platformName, hasThumbnail }) {
  const { t } = useI18n();
  const mode = selection.mode;
  const subs = media?.subtitles ?? [];
  const tracks = media?.audio?.tracks ?? [];
  const languages = tracks.filter((x) => x.language);
  const canEmbed = mode !== 'audio' && Boolean(VIDEO_CONTAINERS[selection.video.container].subtitleCodec);
  const trim = parseTrim(selection.extras.trim, media?.durationSec ?? null);
  const tpl = validateTemplate(selection.filename || '{title}');
  const preview = buildDownloadName({
    template: tpl.ok ? selection.filename : '{title}',
    vars: { title: media?.title, uploader: media?.uploader, platform: platformName, id: media?.id, quality: mode !== 'audio' && selection.video.quality !== 'best' ? `${selection.video.quality}p` : null, date: media?.uploadDate },
    ext: mode === 'audio' ? AUDIO_FORMATS[selection.audio.format].ext : VIDEO_CONTAINERS[selection.video.container].ext,
  });

  return (
    <details className="group rounded-[var(--radius-panel)] border border-line">
      <summary className="flex min-h-12 items-center justify-between px-4 font-semibold">
        {t('picker.more')}
        <ChevronDown aria-hidden="true" className="size-5 text-ink-2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-5 border-t border-line px-4 py-4">
        {media && (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-ink-2">{t('picker.subtitles.label')}</legend>
            {subs.length === 0 && <p className="text-sm text-ink-2">{t('picker.subtitles.none')}</p>}
            <div className="grid gap-x-6 sm:grid-cols-2">
              {subs.map((s) => (
                <Checkbox
                  key={s.lang}
                  checked={selection.extras.subtitles.includes(s.lang)}
                  onChange={(on) => onChange({ extras: { subtitles: on ? [...selection.extras.subtitles, s.lang] : selection.extras.subtitles.filter((l) => l !== s.lang) } })}
                >
                  {s.name || s.lang} {s.auto && <span className="text-ink-2">({t('picker.subtitles.auto')})</span>}
                </Checkbox>
              ))}
            </div>
            {canEmbed && selection.extras.subtitles.length > 0 && (
              <Switch checked={selection.extras.embedSubtitles} onChange={(v) => onChange({ extras: { embedSubtitles: v } })} label={t('picker.subtitles.embed')} />
            )}
          </fieldset>
        )}

        {languages.length > 1 && (
          <Select
            label={t('picker.audio.language')}
            value={selection.audio.language ?? ''}
            onChange={(v) => onChange({ audio: { language: v || null } })}
            options={[{ value: '', label: t('picker.audio.language_default') }, ...languages.map((x) => ({ value: x.language, label: x.language }))]}
            className="max-w-xs"
          />
        )}

        <div className="divide-y divide-line">
          {hasThumbnail && <Switch checked={selection.extras.thumbnail} onChange={(v) => onChange({ extras: { thumbnail: v } })} label={t('picker.thumbnail')} />}
          <Switch checked={selection.extras.metadata} onChange={(v) => onChange({ extras: { metadata: v } })} label={t('picker.metadata')} />
          {mode !== 'audio' && <Switch checked={selection.video.compress} onChange={(v) => onChange({ video: { compress: v } })} label={t('picker.compress')} />}
        </div>

        {media?.capabilities?.trim && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-2">{t('picker.trim.label')}</legend>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <TextField label={t('picker.trim.start')} inputMode="decimal" placeholder="0:00" value={selection.extras.trim.start} onChange={(e) => onChange({ extras: { trim: { ...selection.extras.trim, start: e.target.value } } })} />
              <TextField label={t('picker.trim.end')} inputMode="decimal" placeholder="—" value={selection.extras.trim.end} onChange={(e) => onChange({ extras: { trim: { ...selection.extras.trim, end: e.target.value } } })} />
            </div>
            <p className={cx('mt-2 text-sm', trim.ok ? 'text-ink-2' : 'font-semibold text-buoy')} aria-live="polite">
              {trim.ok ? `${t('picker.trim.hint')} ${trim.trim ? t('picker.trim.keyframe') : ''}` : t('picker.trim.invalid')}
            </p>
          </fieldset>
        )}

        <TextField
          label={t('picker.filename.label')}
          value={selection.filename}
          maxLength={120}
          onChange={(e) => onChange({ filename: e.target.value })}
          hint={`${t('picker.filename.preview', { name: preview })}  ${t('picker.filename.tokens', { tokens: TEMPLATE_TOKENS.map((x) => `{${x}}`).join(' ') })}`}
          error={tpl.ok ? null : t('picker.filename.tokens', { tokens: TEMPLATE_TOKENS.map((x) => `{${x}}`).join(' ') })}
        />
      </div>
    </details>
  );
}

export const QUALITY_CAPS = QUALITY_LADDER;
