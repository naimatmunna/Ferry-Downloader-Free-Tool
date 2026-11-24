import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_PROTOCOL_RE, baseArgs, downloadArgs, formatSpec, parseProgressLine, probeArgs } from '../../src/engines/ytdlp.js';
import { classifyEngineError, summarizeStderr } from '../../src/engines/classify.js';

const base = baseArgs({ proxyUrl: 'http://u:p@127.0.0.1:9', cacheDir: '/tmp/c', excludedExtractors: ['youtube(:.*)?', 'netflix'] });

test('hardened base profile', () => {
  for (const flag of ['--ignore-config', '--no-plugin-dirs', '--no-js-runtimes', '--no-remote-components', '--no-cookies']) assert.ok(base.includes(flag), flag);
  assert.equal(base[base.indexOf('--xff') + 1], 'never');
  assert.equal(base[base.indexOf('--proxy') + 1], 'http://u:p@127.0.0.1:9');
  assert.equal(base[base.indexOf('--use-extractors') + 1], 'default,-youtube(:.*)?,-netflix');
  for (const forbidden of ['--exec', '--cookies-from-browser', '--impersonate', '--username', '--password', '--netrc', '--load-info-json', '--config-locations', '--plugin-dirs', '--no-check-certificates', '--allow-unplayable-formats']) {
    assert.ok(!base.includes(forbidden), forbidden);
  }
  assert.ok(!baseArgs({ proxyUrl: 'x', cacheDir: 'y', jsRuntime: 'none' }).includes('--js-runtimes'));
});

test('the URL is always the last argument, after "--"', () => {
  const p = probeArgs({ base, url: 'https://example.com/v?a=1' });
  assert.deepEqual(p.slice(-2), ['--', 'https://example.com/v?a=1']);
  const d = downloadArgs({ base, url: 'https://example.com/v', jobDir: '/j', tmpDir: '/j/tmp', ffmpegPath: '/usr/bin/ffmpeg', spec: formatSpec({ mode: 'audio', audio: { format: 'mp3', bitrate: 192 } }), maxBytes: 1000 });
  assert.deepEqual(d.slice(-2), ['--', 'https://example.com/v']);
});

test('option-looking or non-http input can never become an argument', () => {
  assert.throws(() => probeArgs({ base, url: '--exec=calc.exe' }));
  assert.throws(() => probeArgs({ base, url: 'file:///etc/passwd' }));
  const tricky = probeArgs({ base, url: 'https://example.com/--exec' });
  assert.equal(tricky.at(-1), 'https://example.com/--exec');
  assert.equal(tricky.filter((a) => a === '--exec').length, 0);
});

test('format selectors keep to HTTP-based protocols and honour the mode', () => {
  const av = formatSpec({ mode: 'av', video: { container: 'mp4', quality: 1080 } });
  assert.ok(av.format.startsWith('bv*'));
  assert.ok(av.format.includes(`[protocol~='${ALLOWED_PROTOCOL_RE}']`));
  assert.equal(av.sort, 'res:1080,vcodec:h264,acodec:aac');
  assert.equal(av.merge, 'mp4/mkv');
  assert.ok(new RegExp(ALLOWED_PROTOCOL_RE).test('m3u8_native'));
  assert.ok(!new RegExp(ALLOWED_PROTOCOL_RE).test('rtmp'));
  assert.ok(!new RegExp(ALLOWED_PROTOCOL_RE).test('ftp'));
  const video = formatSpec({ mode: 'video', video: { container: 'webm', quality: 'best' } });
  assert.ok(video.format.startsWith('bv['));
  assert.equal(video.sort, 'vcodec:vp9');
  const audio = formatSpec({ mode: 'audio', audio: { format: 'm4a', bitrate: 'source', language: 'es' }, audioCodecHint: 'aac' });
  assert.ok(audio.format.startsWith('ba[language=es]'));
  assert.equal(audio.sort, 'acodec:aac');
  const evilLang = formatSpec({ mode: 'audio', audio: { format: 'mp3', bitrate: 128, language: "en]/b[protocol=rtmp" } });
  assert.ok(!evilLang.format.includes('rtmp'));
});

test('subtitle languages are filtered before reaching yt-dlp', () => {
  const d = downloadArgs({ base, url: 'https://e.com/v', jobDir: '/j', tmpDir: '/j/t', ffmpegPath: 'f', spec: formatSpec({ mode: 'av', video: { container: 'mkv', quality: 'best' } }), maxBytes: 1, subtitles: ['en', 'es-419', '--exec', 'a,b'] });
  assert.equal(d[d.indexOf('--sub-langs') + 1], 'en,es-419');
});

test('progress lines parse; anything else is ignored', () => {
  const p = parseProgressLine('FERRY_DL {"status": "downloading", "downloaded_bytes": 100, "total_bytes": 400, "speed": 50.5, "eta": 6, "filename": "/j/src.mp4"}');
  assert.deepEqual([p.type, p.downloadedBytes, p.totalBytes, p.speedBps, p.etaSec, p.file], ['download', 100, 400, 50.5, 6, 'src.mp4']);
  assert.equal(parseProgressLine('FERRY_DL {broken'), null);
  assert.equal(parseProgressLine('[download] 10%'), null);
  assert.equal(parseProgressLine('FERRY_PP {"status": "started", "postprocessor": "Merger"}').postprocessor, 'Merger');
});

test('engine errors map to specific, user-meaningful codes', () => {
  const cases = [
    ['ERROR: [generic] x: Unable to download webpage: Tunnel connection failed: 403 Ferry Blocked Destination', 'BLOCKED_DESTINATION'],
    ['ERROR: [youtube] x: Private video. Sign in if you\'ve been granted access', 'PRIVATE_CONTENT'],
    ['ERROR: [youtube] x: Sign in to confirm you’re not a bot', 'SOURCE_RATE_LIMITED'],
    ['ERROR: [x] Sign in to confirm your age', 'AUTH_REQUIRED'],
    ['ERROR: [x] This video is DRM protected', 'DRM_PROTECTED'],
    ['ERROR: [x] The uploader has not made this video available in your country', 'GEO_RESTRICTED'],
    ['ERROR: [x] HTTP Error 404: Not Found', 'CONTENT_UNAVAILABLE'],
    ['ERROR: [x] HTTP Error 429: Too Many Requests', 'SOURCE_RATE_LIMITED'],
    ['ERROR: Unsupported URL: https://example.com/', 'UNSUPPORTED_PLATFORM'],
    ['ERROR: [x] Requested format is not available', 'FORMAT_UNAVAILABLE'],
    ['ERROR: unable to download video data: <urlopen error [Errno 11001] getaddrinfo failed>', 'NETWORK_ERROR'],
    ['ERROR: [x] Unable to extract video data; please report this issue', 'EXTRACTION_FAILED'],
    ['ERROR: File is larger than max-filesize (2000 bytes > 1000 bytes). Aborting.', 'FILE_TOO_LARGE'],
    // Live wording (2026-11-24): sign-in walls Ferry will never pass, so "the site may have changed" would mislead.
    ['ERROR: [Reddit] 6rrwyj: Account authentication is required. Use --cookies-from-browser or --cookies for the authentication.', 'AUTH_REQUIRED'],
    ['ERROR: [vimeo] 33951933: The web client only works when logged-in. Use --cookies, --cookies-from-browser, --username and --password', 'AUTH_REQUIRED'],
    // Extractors that only work while posing as a browser: Ferry never impersonates, so retrying can't help.
    ['ERROR: [Bandcamp] youtube-dl-test-song: The extractor is attempting impersonation, but no impersonate target is available. See  https://github.com/yt-dlp/yt-dlp#impersonation  for information on installing the required dependencies', 'UNSUPPORTED_PLATFORM'],
  ];
  for (const [stderr, code] of cases) assert.equal(classifyEngineError(stderr), code, stderr);
  assert.equal(classifyEngineError('weird'), 'EXTRACTION_FAILED');
});

test('stderr summaries never carry URLs or long tokens', () => {
  const s = summarizeStderr('ERROR: failed https://cdn.example.com/v.mp4?sig=abcdefghijklmnopqrstuvwxyz0123456789ABCDEF token AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  assert.ok(!s.includes('https://'));
  assert.ok(!/A{32}/.test(s));
});
