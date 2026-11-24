/**
 * Adapter registry. Adding a platform with an official API = one module that
 * implements { id, supports, probe, download } and one line below. The queue,
 * planner, finalizer and UI do not change.
 */
import { createDirectAdapter } from './direct.js';
import { createGalleryDlAdapter } from './galleryDl.js';
import { createInternetArchiveAdapter } from './internetArchive.js';
import { createPeerTubeAdapter } from './peertube.js';
import { createYtDlpAdapter } from './ytdlp.js';

/**
 * @typedef {object} AdapterDeps
 * @property {import('../config.js').Config} config
 * @property {import('pino').Logger} logger
 * @property {{ issue: Function }} egress
 * @property {Function} fetch                 guarded fetch
 * @property {{ ytdlp: string, ffmpeg: string, ffprobe: string, galleryDl?: string }} engines
 * @property {() => string[]} excludedExtractors
 * @property {(url: string) => string|null} [platformOf]  registry platform id of a URL found by an engine
 *
 * @typedef {object} DownloadContext
 * @property {object} job
 * @property {string} url
 * @property {object} selection
 * @property {object|null} media           probe result (with raw formats) or null for playlist entries
 * @property {string} jobDir
 * @property {string} tmpDir
 * @property {AbortSignal} signal
 * @property {(p: object) => void} onProgress
 * @property {number} maxBytes
 */

/** @param {AdapterDeps} deps */
export function createAdapters(deps) {
  // Order matters: gallery-dl platforms keep their page and image links, while
  // direct video/audio files on any host still go to the direct adapter.
  const list = [createInternetArchiveAdapter(deps), createPeerTubeAdapter(deps), createGalleryDlAdapter(deps), createDirectAdapter(deps), createYtDlpAdapter(deps)];
  return {
    list,
    /**
     * @param {{ id: string, engine: string }} platform
     * @param {{ url: URL, directExt: string|null }} detection
     */
    forPlatform(platform, detection) {
      return list.find((a) => a.supports(platform, detection)) ?? null;
    },
    byId: (id) => list.find((a) => a.id === id) ?? null,
  };
}
