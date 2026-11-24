/**
 * PeerTube via its official REST API (category 1). Honours the per-video
 * `downloadEnabled` flag set by the uploader.
 * https://docs.joinpeertube.org/api-rest-reference.html
 */
import path from 'node:path';
import { FerryError } from '@ferry/shared/errors';
import { downloadToFile } from './http.js';
import { pickFile } from './pick.js';
import { sanitizeFormats } from '../media/normalize.js';

/** Thrown when a URL merely looked like PeerTube; the caller falls back to generic handling. */
export class NotThisPlatform extends Error {}

/** @param {URL} u */
export function peertubeVideoId(u) {
  const m = /^\/(?:w|videos\/watch)\/([0-9A-Za-z-]{8,64})\/?$/.exec(u.pathname);
  return m ? m[1] : null;
}

/** @param {import('./index.js').AdapterDeps} deps */
export function createPeerTubeAdapter(deps) {
  async function fetchVideo(url, signal) {
    const u = new URL(url);
    const id = peertubeVideoId(u);
    if (!id) throw new NotThisPlatform('not a PeerTube video URL');
    const res = await deps.fetch(`${u.origin}/api/v1/videos/${encodeURIComponent(id)}`, { signal, timeoutMs: 15_000, headers: { accept: 'application/json' } });
    if (res.status === 404) {
      res.discard();
      throw new FerryError('CONTENT_UNAVAILABLE');
    }
    if (res.status === 401 || res.status === 403) {
      res.discard();
      throw new FerryError('PRIVATE_CONTENT');
    }
    const type = String(res.headers['content-type'] ?? '');
    if (res.status !== 200 || !type.includes('json')) {
      res.discard();
      throw new NotThisPlatform(`no PeerTube API at ${u.host}`);
    }
    const v = await res.json(4 * 1024 * 1024);
    if (!v || typeof v !== 'object' || typeof v.uuid !== 'string' || !('files' in v || 'streamingPlaylists' in v)) {
      throw new NotThisPlatform('response is not a PeerTube video');
    }
    return { v, origin: u.origin };
  }

  function toInfo({ v, origin }) {
    if (v.isLive) throw new FerryError('LIVE_NOT_SUPPORTED');
    if (v.downloadEnabled === false) {
      throw new FerryError('PLATFORM_BLOCKED', { message: 'The uploader turned off downloads for this video.' });
    }
    const files = [...(v.files ?? []), ...(v.streamingPlaylists ?? []).flatMap((p) => p.files ?? [])].filter((f) => typeof f.fileDownloadUrl === 'string');
    const formats = files.map((f, i) => {
      const res = Number(f.resolution?.id) || 0;
      const audioOnly = res === 0 || f.hasVideo === false;
      return {
        format_id: `${res || 'audio'}-${i}`,
        url: f.fileDownloadUrl,
        ext: 'mp4',
        protocol: f.fileDownloadUrl.startsWith('https:') ? 'https' : 'http',
        vcodec: audioOnly ? 'none' : 'h264',
        acodec: f.hasAudio === false ? 'none' : 'aac',
        height: audioOnly ? null : res,
        width: null,
        fps: Number(f.fps) || null,
        filesize: Number(f.size) || null,
      };
    });
    const published = typeof v.publishedAt === 'string' ? v.publishedAt.slice(0, 10).replaceAll('-', '') : null;
    return {
      id: v.uuid,
      title: v.name,
      uploader: v.account?.displayName ?? v.channel?.displayName ?? null,
      duration: Number(v.duration) || null,
      upload_date: published,
      license: v.licence?.label ?? null,
      extractor: 'peertube',
      webpage_url: typeof v.url === 'string' ? v.url : `${origin}/w/${v.shortUUID ?? v.uuid}`,
      thumbnail: v.previewPath ? `${origin}${v.previewPath}` : v.thumbnailPath ? `${origin}${v.thumbnailPath}` : null,
      formats,
    };
  }

  return {
    id: 'peertube',

    supports(platform) {
      return platform.id === 'peertube';
    },

    async probe({ url, signal }) {
      return toInfo(await fetchVideo(url, signal));
    },

    /** @param {import('./index.js').DownloadContext} ctx */
    async download({ url, selection, media, jobDir, signal, onProgress, maxBytes }) {
      const formats = media?.raw?.formats?.length ? media.raw.formats : sanitizeFormats(toInfo(await fetchVideo(url, signal)).formats).kept;
      const chosen = pickFile(formats, selection);
      if (!chosen?.url) throw new FerryError('FORMAT_UNAVAILABLE');
      const file = path.join(jobDir, 'src.mp4');
      await downloadToFile({
        fetch: deps.fetch,
        url: chosen.url,
        file,
        maxBytes,
        signal,
        stallTimeoutMs: deps.config.limits.stallTimeoutMs,
        onProgress: (p) => onProgress({
          phase: 'downloading',
          percent: p.totalBytes ? Math.min(99.5, (p.downloadedBytes / p.totalBytes) * 100) : null,
          downloadedBytes: p.downloadedBytes,
          totalBytes: p.totalBytes,
          totalIsEstimate: false,
          speedBps: p.speedBps,
          etaSec: p.etaSec,
        }),
      });
      return { srcFile: file, subtitles: [] };
    },
  };
}
