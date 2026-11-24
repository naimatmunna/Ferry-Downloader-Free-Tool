/**
 * State of the Download screen: the pasted input, the current analysis (or
 * batch of analyses), and the user's selection.
 */
import { create } from 'zustand';
import { AUDIO_FORMATS } from '@ferry/shared/formats';
import { extractUrls } from '@ferry/shared/url';
import { api } from '../lib/api.js';
import { parseTimecode } from '../lib/format.js';
import { useSettings } from './settings.js';

export const PRESETS = [
  { id: 'best', mode: 'av', video: { container: 'mp4', quality: 'best' } },
  { id: 'mp4_1080', mode: 'av', video: { container: 'mp4', quality: 1080 } },
  { id: 'mp4_720', mode: 'av', video: { container: 'mp4', quality: 720 } },
  { id: 'mp3', mode: 'audio', audio: { format: 'mp3', bitrate: 192 } },
  { id: 'm4a', mode: 'audio', audio: { format: 'm4a', bitrate: 'source' } },
  { id: 'silent', mode: 'video', video: { container: 'mp4', quality: 'best' } },
];

/** Highest available quality at or below `wanted` (or the lowest if all are above). */
export function fitQuality(qualities, wanted) {
  const list = qualities.map((q) => q.res).sort((a, b) => b - a);
  if (!list.length) return 'best';
  if (wanted === 'best') return list[0];
  return list.find((r) => r <= wanted) ?? list[list.length - 1];
}

export function initialSelection(media) {
  const { defaults, filenameTemplate } = useSettings.getState();
  const modes = media?.capabilities?.modes ?? ['av', 'video', 'audio'];
  const mode = modes.includes(defaults.mode) ? defaults.mode : modes[0];
  return {
    mode,
    video: { container: defaults.videoContainer, quality: fitQuality(media?.video?.qualities ?? [], defaults.quality), compress: false },
    audio: { format: defaults.audioFormat, bitrate: defaults.audioBitrate, language: null },
    extras: { subtitles: [], embedSubtitles: false, thumbnail: false, metadata: defaults.metadata, trim: { start: '', end: '' } },
    filename: filenameTemplate,
  };
}

/** Parse the trim inputs; returns { ok, trim } where trim is null when empty. */
export function parseTrim(trim, durationSec) {
  const start = parseTimecode(trim.start);
  const end = parseTimecode(trim.end);
  if (start == null && end == null) return { ok: true, trim: null };
  if (Number.isNaN(start) || Number.isNaN(end)) return { ok: false };
  const s = start ?? 0;
  if (end != null && end <= s) return { ok: false };
  if (durationSec != null && (s >= durationSec || (end != null && end > durationSec + 0.5))) return { ok: false };
  return { ok: true, trim: { start: s, ...(end != null ? { end } : {}) } };
}

/** Build the POST /jobs body from a selection. */
export function jobBody({ probeId, entryId = null, selection, media, attest }) {
  const { mode, video, audio, extras } = selection;
  const body = { probeId, mode, attest: Boolean(attest) };
  if (entryId) body.entryId = entryId;
  if (mode !== 'audio') {
    // Known qualities: snap to what exists. Unknown (generic pages, playlist entries): send the cap as-is.
    const qualities = media?.video?.qualities ?? [];
    const quality = video.quality === 'best' ? 'best' : qualities.length ? fitQuality(qualities, video.quality) : video.quality;
    body.video = { container: video.container, quality, compress: Boolean(video.compress) };
  }
  if (mode === 'audio') body.audio = { format: audio.format, bitrate: AUDIO_FORMATS[audio.format].lossless ? 'source' : audio.bitrate, language: audio.language || null };
  else if (audio.language) body.audio = { format: 'm4a', bitrate: 'source', language: audio.language };
  const trim = parseTrim(extras.trim, media?.durationSec ?? null);
  body.extras = {
    subtitles: extras.subtitles,
    embedSubtitles: mode !== 'audio' && extras.embedSubtitles,
    thumbnail: extras.thumbnail,
    metadata: extras.metadata,
    trim: trim.ok ? trim.trim : null,
  };
  body.filename = { template: selection.filename || '{title}' };
  body.privacy = { deleteAfterDownload: useSettings.getState().privacy.deleteAfterSave };
  return body;
}

/** POST /jobs body for an image gallery: the chosen image indexes, nothing else to pick. */
export function galleryJobBody({ probeId, items, attest, filename }) {
  return {
    probeId,
    mode: 'gallery',
    gallery: { items: [...items].sort((a, b) => a - b) },
    attest: Boolean(attest),
    filename: { template: filename || '{title}' },
    privacy: { deleteAfterDownload: useSettings.getState().privacy.deleteAfterSave },
  };
}

/** Images to pre-select: all of them, or what a "Download again" request had chosen. */
function initialGalleryPicks(media, pending) {
  const all = media.gallery.items.map((i) => i.index);
  if (pending?.mode !== 'gallery') return all;
  const again = all.filter((i) => pending.gallery?.items?.includes(i));
  return again.length ? again : all;
}

let controller = null;

export const useAnalysis = create((set, get) => ({
  input: '',
  status: 'idle', // idle | probing | ready | error
  result: null,
  error: null,
  selection: null,
  attest: false,
  startedAt: null,
  playlistPicks: [],
  galleryPicks: [],
  batch: null, // [{ url, status, result?, error? }]

  setInput: (input) => set({ input }),

  reset() {
    controller?.abort();
    set({ status: 'idle', result: null, error: null, selection: null, attest: false, batch: null, playlistPicks: [], galleryPicks: [], startedAt: null });
  },

  async analyze(text, { playlist = false } = {}) {
    const links = extractUrls(text, { max: 100 });
    const single = links[0] ?? text.trim();
    if (links.length > 1) return get().analyzeBatch(links);
    controller?.abort();
    controller = new AbortController();
    set({ status: 'probing', error: null, result: null, selection: null, batch: null, startedAt: Date.now(), attest: false, playlistPicks: [], galleryPicks: [] });
    try {
      const result = await api.probe(single, { playlist, signal: controller.signal });
      const generic = ['generic', 'direct'].includes(result.source.platform.id);
      const pending = get().pendingRequest;
      set({
        status: 'ready',
        result,
        pendingRequest: null,
        selection: pending ? fromRequest(pending, result.media) : initialSelection(result.media),
        attest: generic && useSettings.getState().acknowledgedGenericTerms,
        playlistPicks: result.media.kind === 'playlist' ? result.media.entries.map((e) => e.id) : [],
        galleryPicks: result.media.kind === 'gallery' ? initialGalleryPicks(result.media, pending) : [],
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      set({ status: 'error', error });
    }
  },

  async analyzeBatch(links) {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const max = 20;
    const batch = links.slice(0, max).map((url) => ({ url, status: 'pending', result: null, error: null }));
    set({ status: 'ready', batch, result: null, error: null, selection: initialSelection(null), attest: false });
    const update = (i, patch) => set((s) => ({ batch: s.batch?.map((b, j) => (j === i ? { ...b, ...patch } : b)) ?? null }));
    let next = 0;
    const worker = async () => {
      while (next < batch.length && !signal.aborted) {
        const i = next++;
        update(i, { status: 'probing' });
        try {
          update(i, { status: 'ready', result: await api.probe(batch[i].url, { signal }) });
        } catch (error) {
          if (error?.name === 'AbortError') return;
          update(i, { status: 'error', error });
        }
      }
    };
    await Promise.all([worker(), worker()]);
  },

  removeFromBatch(url) {
    set((s) => ({ batch: s.batch?.filter((b) => b.url !== url) ?? null }));
  },

  setSelection(patch) {
    set((s) => ({
      selection: {
        ...s.selection,
        ...patch,
        video: { ...s.selection.video, ...(patch.video ?? {}) },
        audio: { ...s.selection.audio, ...(patch.audio ?? {}) },
        extras: { ...s.selection.extras, ...(patch.extras ?? {}) },
      },
    }));
  },

  applyPreset(preset) {
    const media = get().result?.media;
    const s = get().selection ?? initialSelection(media);
    const modes = media?.capabilities?.modes ?? ['av', 'video', 'audio'];
    if (!modes.includes(preset.mode)) return false;
    get().setSelection({
      mode: preset.mode,
      video: preset.video ? { container: preset.video.container, quality: media ? fitQuality(media.video.qualities, preset.video.quality) : preset.video.quality } : s.video,
      audio: preset.audio ? { ...s.audio, ...preset.audio } : s.audio,
    });
    return true;
  },

  setAttest: (attest) => set({ attest }),
  setPlaylistPicks: (playlistPicks) => set({ playlistPicks }),
  setGalleryPicks: (galleryPicks) => set({ galleryPicks }),

  /** "Download again" from history: analyse the source again and restore the previous choices. */
  again(url, request) {
    set({ input: url, pendingRequest: request ?? null });
    return get().analyze(url);
  },
  pendingRequest: null,
}));

/** Rebuild a selection from a stored job request, adapted to what the media offers now. */
export function fromRequest(req, media) {
  const base = initialSelection(media);
  const modes = media?.capabilities?.modes ?? [];
  return {
    ...base,
    mode: modes.includes(req.mode) ? req.mode : base.mode,
    video: req.video ? { ...base.video, container: req.video.container, quality: fitQuality(media?.video?.qualities ?? [], req.video.quality), compress: Boolean(req.video.compress) } : base.video,
    audio: req.audio ? { ...base.audio, format: req.audio.format, bitrate: req.audio.bitrate, language: null } : base.audio,
    extras: { ...base.extras, metadata: req.extras?.metadata ?? base.extras.metadata, thumbnail: Boolean(req.extras?.thumbnail) },
    filename: req.filename?.template ?? base.filename,
  };
}
