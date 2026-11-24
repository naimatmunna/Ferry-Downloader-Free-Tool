/**
 * Map engine stderr (yt-dlp, ffmpeg) to Ferry error codes. Order matters:
 * the most specific, most security-relevant patterns are checked first.
 * Raw stderr is never sent to clients.
 */
import { BLOCK_REASON_PHRASE, LIMIT_REASON_PHRASE } from '../security/egressProxy.js';

/** @type {[RegExp, string][]} */
const RULES = [
  [new RegExp(BLOCK_REASON_PHRASE, 'i'), 'BLOCKED_DESTINATION'],
  [new RegExp(LIMIT_REASON_PHRASE, 'i'), 'FILE_TOO_LARGE'],
  [/larger than max-filesize|File is larger than/i, 'FILE_TOO_LARGE'],
  [/DRM[ -]protected|has_drm|This video is DRM|Widevine|PlayReady|FairPlay/i, 'DRM_PROTECTED'],
  [/private video|this video is private|video is private|is a private|account is private|private (post|account|profile)/i, 'PRIVATE_CONTENT'],
  [/Sign in to confirm (you|you're|you’re) not a bot|confirm you.re not a robot|captcha/i, 'SOURCE_RATE_LIMITED'],
  [/confirm your age|age[- ]restricted|age[- ]gate|inappropriate for some users/i, 'AUTH_REQUIRED'],
  [/members[- ]only|join this channel|requires a subscription|paid content|premium (members|subscribers)|purchase|rental/i, 'AUTH_REQUIRED'],
  [/login required|log ?in to|sign ?in to (view|watch|access|see)|requires (an )?(login|account|authentication)|authentication required|rate-limit reached or login required/i, 'AUTH_REQUIRED'],
  [/available in your (country|region)|geo[- ]?restrict|blocked in your (country|region)|not available from your location|not available in this (country|region)/i, 'GEO_RESTRICTED'],
  [/live event will begin|Premieres in|is a live stream|currently live|is_live|this live (stream|event)|live broadcast/i, 'LIVE_NOT_SUPPORTED'],
  [/HTTP Error 429|Too Many Requests|rate[- ]?limit/i, 'SOURCE_RATE_LIMITED'],
  [/Requested format is not available|requested formats? (is|are) not available/i, 'FORMAT_UNAVAILABLE'],
  [/HTTP Error 404|404: Not Found|HTTP Error 410|Video unavailable|video is unavailable|has been removed|no longer available|does not exist|was deleted|not found/i, 'CONTENT_UNAVAILABLE'],
  [/Unsupported URL/i, 'UNSUPPORTED_PLATFORM'],
  [/No video formats found|no suitable formats|There'?s no video|no media found|No playable/i, 'NO_MEDIA_FOUND'],
  [/timed out|Read timed out|Connection (reset|refused|aborted)|Temporary failure in name resolution|getaddrinfo|Network is unreachable|Unable to connect|RemoteDisconnected|IncompleteRead|Tunnel connection failed: 50[23]|SSL: |EOF occurred|Remote end closed/i, 'NETWORK_ERROR'],
  [/Postprocessing|Conversion failed|ffmpeg (exited|error)|Error opening output|Invalid data found when processing input|moov atom not found|Could not find codec parameters/i, 'CONVERSION_FAILED'],
  [/HTTP Error 403|Forbidden/i, 'EXTRACTION_FAILED'],
  [/Unable to (extract|download (webpage|JSON|API))|Unexpected response|ExtractorError|Traceback|KeyError|regex|Cannot parse data/i, 'EXTRACTION_FAILED'],
];

/**
 * @param {string} stderr
 * @param {string} [fallback]
 */
export function classifyEngineError(stderr, fallback = 'EXTRACTION_FAILED') {
  const text = String(stderr ?? '');
  // Prefer the last ERROR: line from yt-dlp when present.
  const errorLines = text.split(/\r?\n/).filter((l) => /^ERROR:/.test(l));
  const focus = errorLines.length ? errorLines.join('\n') : text;
  for (const [re, code] of RULES) if (re.test(focus)) return code;
  if (focus !== text) for (const [re, code] of RULES) if (re.test(text)) return code;
  return fallback;
}

/** A short, log-safe summary of an engine failure (no URLs or tokens). */
export function summarizeStderr(stderr, max = 400) {
  const lines = String(stderr ?? '').split(/\r?\n/).filter((l) => /^(ERROR|WARNING):/.test(l) || /error/i.test(l));
  return lines
    .slice(-3)
    .join(' | ')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[A-Za-z0-9_-]{32,}/g, '<redacted>')
    .slice(0, max);
}
