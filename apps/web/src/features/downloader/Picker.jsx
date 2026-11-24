/**
 * Format selection. Every option shown is derived from what the source
 * actually offers; sizes appear only when the source reports them (or are
 * computed from a chosen bitrate and a known duration, marked as estimates).
 * Each format says whether it copies the streams or converts them.
 */
import { useId, useMemo } from 'react';
import { AudioLines, Check, ChevronDown, Info } from 'lucide-react';
import {
  AUDIO_BITRATES,
  AUDIO_FORMATS,
  QUALITY_LADDER,
  VIDEO_CONTAINERS,
  describeAudioConversion,
  estimateBytes,
  estimateWavBytes,
  qualityLabel,
} from '@ferry/shared/formats';
import { TEMPLATE_TOKENS, buildDownloadName, validateTemplate } from '@ferry/shared/filename';
import { useI18n } from '../../lib/i18n/index.jsx';
import { bytes } from '../../lib/format.js';
import { audioFormatNote, videoFormatNote } from '../../lib/formatNotes.js';
import { parseTrim } from '../../state/analysis.js';
import { VideoMuteIcon, VideoSoundIcon } from '../../components/icons.jsx';
import { Checkbox, Select, Switch, TextField, cx } from '../../components/ui.jsx';

export const CODEC_NAMES = { aac: 'AAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis', flac: 'FLAC', alac: 'ALAC', pcm: 'PCM', ac3: 'AC-3', eac3: 'E-AC-3' };

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

/**
 * A named choice group: the visible heading names the fieldset (aria-labelledby),
 * so screen readers announce "Quality", "Format"… when focus enters the group.
 */
function Group({ label, hint, children }) {
  const id = useId();
  return (
    <fieldset aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span id={`${id}-label`} className="text-[15px] font-bold">
          {label}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="text-[13px] text-ink-2">
            {hint}
          </span>
        )}
      </div>
      {children}
    </fieldset>
  );
}

const MODE_ICON = { av: VideoSoundIcon, video: VideoMuteIcon, audio: ({ className }) => <AudioLines className={className} aria-hidden="true" /> };

function ModeTiles({ value, onChange, caps }) {
  const { t } = useI18n();
  return (
    <Group label={t('picker.mode.label')}>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {['av', 'video', 'audio'].map((mode) => {
          const Icon = MODE_ICON[mode];
          const checked = value === mode;
          const disabled = !caps.modes.includes(mode);
          return (
            <label
              key={mode}
              className={cx(
                'relative flex min-h-[86px] flex-col gap-1 rounded-2xl border-2 p-2.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)] sm:min-h-[96px] sm:rounded-[18px] sm:p-3.5',
                checked ? 'border-[var(--edge-sel)] bg-sun text-sun-ink shadow-[0_3px_0_var(--edge-shadow)]' : 'border-transparent bg-field hover:bg-line',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <input type="radio" className="sr-only" name="mode" value={mode} checked={checked} disabled={disabled} onChange={() => onChange(mode)} />
              <Icon className="size-[22px] sm:size-6" />
              <span className="mt-auto text-[13px] font-bold leading-tight sm:text-[15.5px]">{t(`picker.mode.${mode}`)}</span>
              <span className={cx('hidden text-[12.5px] leading-snug sm:block', checked ? 'text-sun-ink/75' : 'text-ink-2')}>{t(`picker.mode.sub.${mode}`)}</span>
              {checked && (
                <span aria-hidden="true" className="absolute end-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-sun-ink text-sun sm:end-3 sm:top-3 sm:size-[22px]">
                  <Check className="size-3" strokeWidth={3.2} />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </Group>
  );
}

/** Radio rows: label, tag, size. */
function RadioRows({ legend, name, value, onChange, options, hint }) {
  return (
    <Group label={legend} hint={hint}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={cx(
                'flex min-h-[52px] items-center gap-2.5 rounded-[var(--radius-control)] bg-paper px-3.5 transition-shadow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'shadow-[inset_0_0_0_2px_var(--ink)]' : 'shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--line-2)]',
              )}
            >
              <input
                type="radio"
                name={name}
                value={String(o.value)}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="size-5 shrink-0 appearance-none rounded-full shadow-[inset_0_0_0_2px_var(--line-2)] checked:shadow-[inset_0_0_0_6px_var(--ink)] focus:outline-none"
              />
              <span className="font-bold">{o.label}</span>
              {o.tag && <span className="rounded-md bg-field px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2">{o.tag}</span>}
              {o.sub && <span className="ms-auto text-sm text-ink-2 tabular-nums">{o.sub}</span>}
            </label>
          );
        })}
      </div>
    </Group>
  );
}

/** Format chips: name plus what happens to the streams. */
function FormatChips({ legend, name, value, onChange, options, hint }) {
  return (
    <Group label={legend} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'flex min-w-[88px] flex-col rounded-[var(--radius-control)] px-3.5 pb-2 pt-2.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'bg-primary text-primary-ink' : 'bg-paper shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--line-2)]',
              )}
            >
              <input type="radio" className="sr-only" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} />
              <span className="text-[15px] font-[760]">{o.label}</span>
              <span className={cx('whitespace-nowrap text-xs', checked ? 'opacity-80' : 'text-ink-2')}>{o.sub}</span>
            </label>
          );
        })}
      </div>
    </Group>
  );
}

export function FormatPicker({ media, selection, onChange, limits }) {
  const { t, locale } = useI18n();
  const caps = media?.capabilities ?? { modes: ['av', 'video', 'audio'] };
  const mode = selection.mode;

  const qualityOptions = useMemo(() => {
    if (!media) {
      // Batch/playlist: a cap applied per item.
      return [{ value: 'best', label: t('picker.quality.original') }, ...[2160, 1440, 1080, 720, 480, 360].map((r) => ({ value: r, label: qualityLabel(r).short, tag: qualityLabel(r).tag }))];
    }
    if (!media.video.qualities.length) return [{ value: 'best', label: t('picker.quality.original') }];
    return media.video.qualities.map((q) => {
      const size = mode === 'video' ? q.sizeBytes.video : q.sizeBytes.av;
      const extras = [q.fps && q.fps >= 48 ? `${Math.round(q.fps)} fps` : null, q.hdr ? t('picker.quality.hdr') : null, size ? bytes(size, { approx: q.approx, locale }) : null].filter(Boolean);
      return { value: q.res, label: q.label, tag: q.tag, sub: extras.join('  ') || null };
    });
  }, [media, mode, t, locale]);

  const top = media?.video?.qualities?.[0];
  const qualityHint = media ? (media.video.qualities.length ? t('picker.quality.upTo', { quality: top.tag ? `${top.label} ${top.tag}` : top.label }) : t('picker.quality.unknownNote')) : t('playlist.note');

  const containerOptions = Object.values(VIDEO_CONTAINERS).map((c) => {
    const note = videoFormatNote(media, selection, c.id);
    return { value: c.id, label: c.label, sub: note === 'unknown' ? t(`picker.container.${c.id}`) : t(`picker.note.video.${note}`) };
  });

  const track = selectedTrack(media, selection);
  const fmt = AUDIO_FORMATS[selection.audio.format];
  const conv = describeAudioConversion({ codec: track?.codec ?? null, abrKbps: track?.abrKbps ?? null }, { format: fmt.id, bitrate: fmt.lossless ? 'source' : selection.audio.bitrate });
  const audioOptions = Object.values(AUDIO_FORMATS).map((a) => {
    const note = media ? audioFormatNote(track, a.id, a.lossless ? 'source' : selection.audio.bitrate) : 'unknown';
    return { value: a.id, label: a.label, sub: note === 'unknown' ? t(`picker.audio.formats.${a.id}`) : t(`picker.note.audio.${note}`) };
  });
  const bitrateOptions = [{ value: 'source', label: t('picker.audio.source') }, ...[...AUDIO_BITRATES].reverse().map((n) => ({ value: n, label: t('picker.audio.kbps', { n }) }))];

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
    <div className="flex flex-col gap-5">
      <ModeTiles value={mode} onChange={(v) => onChange({ mode: v })} caps={caps} />

      {mode !== 'audio' && (
        <>
          <RadioRows legend={t('picker.quality.label')} name="quality" value={selection.video.quality} onChange={(v) => onChange({ video: { quality: v } })} options={qualityOptions} hint={qualityHint} />
          <FormatChips legend={t('picker.container.label')} name="container" value={selection.video.container} onChange={(v) => onChange({ video: { container: v } })} options={containerOptions} />
        </>
      )}

      {mode === 'audio' && (
        <>
          <FormatChips legend={t('picker.audio.label')} name="audio-format" value={selection.audio.format} onChange={(v) => onChange({ audio: { format: v } })} options={audioOptions} />
          {!fmt.lossless && (
            <Group label={t('picker.audio.bitrate')}>
              <div className="flex flex-wrap gap-2">
                {bitrateOptions.map((o) => {
                  const checked = selection.audio.bitrate === o.value;
                  return (
                    <label
                      key={String(o.value)}
                      className={cx(
                        'flex h-10 items-center rounded-full px-3.5 text-sm font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
                        checked ? 'bg-primary text-primary-ink' : 'bg-paper shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--line-2)]',
                      )}
                    >
                      <input type="radio" className="sr-only" name="bitrate" value={String(o.value)} checked={checked} onChange={() => onChange({ audio: { bitrate: o.value } })} />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </Group>
          )}
          {audioNotes.length > 0 && <Note>{audioNotes.join(' ')}</Note>}
          {conv.aboveSource && <Note tone="warn">{t('picker.audio.above_source', { kbps: conv.effectiveKbps })}</Note>}
        </>
      )}

      {tooLarge && (
        <p className="text-sm font-bold text-bad" aria-live="polite">
          {t('picker.size.too_large', { max: bytes(limits.maxFileSizeBytes, { locale }) })}
        </p>
      )}
    </div>
  );
}

export function Note({ children, tone = 'info' }) {
  return (
    <p className={cx('flex items-start gap-2 rounded-[var(--radius-control)] px-3.5 py-2.5 text-sm', tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-field text-ink-2')}>
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
    <details className="group rounded-[var(--radius-control)] bg-field">
      <summary className="flex min-h-12 items-center justify-between rounded-[var(--radius-control)] px-4 font-bold">
        {t('picker.more')}
        <span className="flex items-center gap-2 text-sm font-medium text-ink-2">
          <span className="hidden sm:inline">{t('picker.moreHint')}</span>
          <ChevronDown aria-hidden="true" className="size-5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="flex flex-col gap-5 border-t border-line px-4 py-4">
        {media && (
          <fieldset>
            <legend className="mb-1 text-sm font-bold">{t('picker.subtitles.label')}</legend>
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
            <legend className="mb-2 text-sm font-bold">{t('picker.trim.label')}</legend>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <TextField label={t('picker.trim.start')} inputMode="decimal" placeholder="0:00" value={selection.extras.trim.start} onChange={(e) => onChange({ extras: { trim: { ...selection.extras.trim, start: e.target.value } } })} />
              <TextField label={t('picker.trim.end')} inputMode="decimal" placeholder="—" value={selection.extras.trim.end} onChange={(e) => onChange({ extras: { trim: { ...selection.extras.trim, end: e.target.value } } })} />
            </div>
            <p className={cx('mt-2 text-sm', trim.ok ? 'text-ink-2' : 'font-bold text-bad')} aria-live="polite">
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
