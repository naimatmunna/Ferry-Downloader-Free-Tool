import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  audioFormatAccepts,
  containerAcceptsAudio,
  containerAcceptsVideo,
  describeAudioConversion,
  estimateBytes,
  formatBytes,
  formatDuration,
  mimeForExt,
  nearestBitrateAtOrAbove,
  normalizeAudioCodec,
  normalizeVideoCodec,
  qualityClass,
  qualityLabel,
} from '../src/formats.js';

test('qualityClass labels landscape, portrait, 4:3 and cinema frames sensibly', () => {
  assert.equal(qualityClass(1920, 1080), 1080);
  assert.equal(qualityClass(1080, 1920), 1080); // vertical video
  assert.equal(qualityClass(1440, 1080), 1080); // 4:3
  assert.equal(qualityClass(1920, 800), 1080); // letterboxed cinema
  assert.equal(qualityClass(1280, 544), 720);
  assert.equal(qualityClass(1280, 720), 720);
  assert.equal(qualityClass(640, 480), 480);
  assert.equal(qualityClass(3840, 2160), 2160);
  assert.equal(qualityClass(2560, 1440), 1440);
  assert.equal(qualityClass(7680, 4320), 4320);
  assert.equal(qualityClass(256, 144), 144);
  assert.equal(qualityClass(null, 720), 720); // height only
  assert.equal(qualityClass(null, null), null);
});

test('qualityLabel adds marketing tags only where standard', () => {
  assert.equal(qualityLabel(1080).full, '1080p Full HD');
  assert.equal(qualityLabel(2160).full, '2160p 4K');
  assert.equal(qualityLabel(480).full, '480p');
  assert.equal(qualityLabel('best').short, 'Best');
});

test('codec normalization handles yt-dlp, ffprobe and RFC 6381 names', () => {
  assert.equal(normalizeVideoCodec('avc1.640028'), 'h264');
  assert.equal(normalizeVideoCodec('h264'), 'h264');
  assert.equal(normalizeVideoCodec('hvc1.1.6.L120.90'), 'hevc');
  assert.equal(normalizeVideoCodec('vp09.00.40.08'), 'vp9');
  assert.equal(normalizeVideoCodec('vp9'), 'vp9');
  assert.equal(normalizeVideoCodec('av01.0.08M.08'), 'av1');
  assert.equal(normalizeVideoCodec('mp4v.20.3'), 'mpeg4');
  assert.equal(normalizeVideoCodec('none'), null);
  assert.equal(normalizeVideoCodec(undefined), null);
  assert.equal(normalizeAudioCodec('mp4a.40.2'), 'aac');
  assert.equal(normalizeAudioCodec('mp4a.40.5'), 'aac');
  assert.equal(normalizeAudioCodec('mp4a.6b'), 'mp3');
  assert.equal(normalizeAudioCodec('opus'), 'opus');
  assert.equal(normalizeAudioCodec('ec-3'), 'eac3');
  assert.equal(normalizeAudioCodec('ac-3'), 'ac3');
  assert.equal(normalizeAudioCodec('pcm_s16le'), 'pcm');
  assert.equal(normalizeAudioCodec('none'), null);
});

test('container compatibility table', () => {
  assert.equal(containerAcceptsVideo('mp4', 'h264'), true);
  assert.equal(containerAcceptsVideo('mp4', 'vp9'), true);
  assert.equal(containerAcceptsVideo('webm', 'h264'), false);
  assert.equal(containerAcceptsVideo('mkv', 'theora'), true);
  assert.equal(containerAcceptsVideo('mov', 'vp9'), false);
  assert.equal(containerAcceptsVideo('avi', 'h264'), false);
  assert.equal(containerAcceptsAudio('webm', 'aac'), false);
  assert.equal(containerAcceptsAudio('webm', 'opus'), true);
  assert.equal(containerAcceptsAudio('mov', 'opus'), false);
  assert.equal(containerAcceptsAudio('mkv', 'anything'), true);
  assert.equal(containerAcceptsVideo('nope', 'h264'), false);
});

test('audio copy rules never claim WAV is a copy', () => {
  assert.equal(audioFormatAccepts('m4a', 'aac'), true);
  assert.equal(audioFormatAccepts('aac', 'aac'), true);
  assert.equal(audioFormatAccepts('opus', 'opus'), true);
  assert.equal(audioFormatAccepts('ogg', 'vorbis'), true);
  assert.equal(audioFormatAccepts('mp3', 'aac'), false);
  assert.equal(audioFormatAccepts('wav', 'pcm'), false);
});

test('describeAudioConversion is honest about quality', () => {
  // Same codec + "source" bitrate → lossless copy.
  assert.deepEqual(describeAudioConversion({ codec: 'aac', abrKbps: 128 }, { format: 'm4a', bitrate: 'source' }), {
    action: 'copy',
    aboveSource: false,
    losslessFromLossy: false,
    effectiveKbps: 128,
  });
  // Upsampling the bitrate does not improve quality.
  const up = describeAudioConversion({ codec: 'opus', abrKbps: 130 }, { format: 'mp3', bitrate: 320 });
  assert.equal(up.action, 'transcode');
  assert.equal(up.aboveSource, true);
  // A sensible bitrate is not flagged.
  assert.equal(describeAudioConversion({ codec: 'opus', abrKbps: 130 }, { format: 'mp3', bitrate: 128 }).aboveSource, false);
  // Lossless container from lossy source is labelled.
  assert.equal(describeAudioConversion({ codec: 'opus', abrKbps: 130 }, { format: 'flac', bitrate: 'source' }).losslessFromLossy, true);
  assert.equal(describeAudioConversion({ codec: 'flac', abrKbps: null }, { format: 'wav', bitrate: 'source' }).losslessFromLossy, false);
  // Codec change with "source" picks the nearest standard bitrate at or above the source.
  assert.equal(describeAudioConversion({ codec: 'opus', abrKbps: 130 }, { format: 'mp3', bitrate: 'source' }).effectiveKbps, 192);
});

test('nearestBitrateAtOrAbove and estimateBytes never invent values', () => {
  assert.equal(nearestBitrateAtOrAbove(128), 128);
  assert.equal(nearestBitrateAtOrAbove(160), 192);
  assert.equal(nearestBitrateAtOrAbove(500), 320);
  assert.equal(nearestBitrateAtOrAbove(null), 192);
  assert.equal(estimateBytes(128, 60), 960000);
  assert.equal(estimateBytes(null, 60), null);
  assert.equal(estimateBytes(128, undefined), null);
});

test('formatting helpers', () => {
  assert.equal(formatBytes(0, { locale: 'en' }), '0 B');
  assert.equal(formatBytes(1536000, { locale: 'en' }), '1.54 MB');
  assert.equal(formatBytes(2_500_000_000, { approx: true, locale: 'en' }), '≈ 2.5 GB');
  assert.equal(formatBytes(null), null);
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(null), null);
  assert.equal(mimeForExt('MP4'), 'video/mp4');
  assert.equal(mimeForExt('opus'), 'audio/ogg');
  assert.equal(mimeForExt('exe'), 'application/octet-stream');
});
