/**
 * Honest per-choice labels for the format picker: will a choice copy the
 * source streams as they are (no quality loss) or convert them?
 */
import { AUDIO_FORMATS, containerAcceptsAudio, containerAcceptsVideo, describeAudioConversion } from '@ferry/shared/formats';

/**
 * @param {object|null} media normalized media (null for batches and playlists: it varies per item)
 * @param {{ mode: 'av'|'video'|'audio', video: { quality: number|'best', compress: boolean } }} selection
 * @param {string} containerId
 * @returns {'copy'|'convert'|'unknown'}
 */
export function videoFormatNote(media, selection, containerId) {
  const qualities = media?.video?.qualities ?? [];
  const quality = qualities.find((q) => q.res === selection.video.quality) ?? qualities[0];
  const vcodecs = quality?.codecs ?? [];
  if (!vcodecs.length) return 'unknown';
  if (selection.video.compress) return 'convert';
  if (!vcodecs.some((c) => containerAcceptsVideo(containerId, c))) return 'convert';
  if (selection.mode === 'av') {
    const acodecs = (media.audio?.tracks ?? []).map((t) => t.codec).filter(Boolean);
    if (acodecs.length && !acodecs.some((c) => containerAcceptsAudio(containerId, c))) return 'convert';
  }
  return 'copy';
}

/**
 * @param {{ codec: string|null, abrKbps?: number|null }|null} track the source audio track
 * @param {string} formatId
 * @param {'source'|number} bitrate
 * @returns {'copy'|'convert'|'lossless'|'unknown'}
 */
export function audioFormatNote(track, formatId, bitrate) {
  const format = AUDIO_FORMATS[formatId];
  if (!format) return 'unknown';
  if (format.lossless) return 'lossless';
  if (!track?.codec) return 'unknown';
  const conversion = describeAudioConversion({ codec: track.codec, abrKbps: track.abrKbps ?? null }, { format: formatId, bitrate });
  return conversion.action === 'copy' ? 'copy' : 'convert';
}
