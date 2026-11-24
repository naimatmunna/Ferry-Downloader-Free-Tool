import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioFormatNote, videoFormatNote } from '../src/lib/formatNotes.js';

const media = (vcodec, acodec) => ({
  video: { qualities: [{ res: 1080, codecs: [vcodec] }, { res: 720, codecs: [vcodec] }] },
  audio: { tracks: acodec ? [{ codec: acodec, abrKbps: 128 }] : [] },
});
const sel = (mode = 'av', extra = {}) => ({ mode, video: { quality: 1080, compress: false, ...extra } });

test('H.264 with AAC copies into MP4, MKV and MOV but converts for WebM and AVI', () => {
  const m = media('h264', 'aac');
  assert.equal(videoFormatNote(m, sel(), 'mp4'), 'copy');
  assert.equal(videoFormatNote(m, sel(), 'mkv'), 'copy');
  assert.equal(videoFormatNote(m, sel(), 'mov'), 'copy');
  assert.equal(videoFormatNote(m, sel(), 'webm'), 'convert');
  assert.equal(videoFormatNote(m, sel(), 'avi'), 'convert');
});

test('sound that does not fit the container makes it a conversion', () => {
  const m = media('vp9', 'opus');
  assert.equal(videoFormatNote(m, sel('av'), 'webm'), 'copy');
  assert.equal(videoFormatNote(m, sel('av'), 'mov'), 'convert');
});

test('video only ignores the sound track', () => {
  const m = media('h264', 'opus');
  assert.equal(videoFormatNote(m, sel('av'), 'mov'), 'convert');
  assert.equal(videoFormatNote(m, sel('video'), 'mov'), 'copy');
});

test('making the file smaller always converts', () => {
  assert.equal(videoFormatNote(media('h264', 'aac'), sel('av', { compress: true }), 'mp4'), 'convert');
});

test('unknown codecs or several items stay unknown instead of guessing', () => {
  assert.equal(videoFormatNote(null, sel(), 'mp4'), 'unknown');
  assert.equal(videoFormatNote({ video: { qualities: [] }, audio: { tracks: [] } }, sel(), 'mp4'), 'unknown');
});

test('audio: only a format with the same codec copies, and only at the source bitrate', () => {
  const opus = { codec: 'opus', abrKbps: 128 };
  assert.equal(audioFormatNote(opus, 'opus', 'source'), 'copy');
  assert.equal(audioFormatNote(opus, 'ogg', 'source'), 'convert');
  assert.equal(audioFormatNote(opus, 'mp3', 'source'), 'convert');
  const aac = { codec: 'aac', abrKbps: 128 };
  assert.equal(audioFormatNote(aac, 'm4a', 'source'), 'copy');
  assert.equal(audioFormatNote(aac, 'aac', 'source'), 'copy');
  assert.equal(audioFormatNote(aac, 'm4a', 128), 'convert');
});

test('audio: WAV and FLAC are lossless, and an unknown source stays unknown', () => {
  assert.equal(audioFormatNote({ codec: 'aac', abrKbps: 128 }, 'wav', 'source'), 'lossless');
  assert.equal(audioFormatNote({ codec: 'aac', abrKbps: 128 }, 'flac', 'source'), 'lossless');
  assert.equal(audioFormatNote(null, 'mp3', 'source'), 'unknown');
});
