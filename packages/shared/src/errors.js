/**
 * Error catalog shared by the server (HTTP status, retryability) and the web
 * client (localized copy keyed by code). Messages are plain, actionable
 * English fallbacks; the client translates by `code`.
 */

/** @typedef {{ status: number, retryable: boolean, message: string }} ErrorSpec */

/** @type {Readonly<Record<string, ErrorSpec>>} */
export const ERRORS = Object.freeze({
  INVALID_URL: {
    status: 400,
    retryable: false,
    message: "That doesn't look like a link. Links start with http:// or https://.",
  },
  VALIDATION_FAILED: { status: 400, retryable: false, message: 'Some of the options are not valid.' },
  UNSUPPORTED_PLATFORM: {
    status: 422,
    retryable: false,
    message: "We can't read media from this site yet.",
  },
  PLATFORM_BLOCKED: {
    status: 403,
    retryable: false,
    message: "This service protects its media, so Ferry can't download it. Use the service's own offline option.",
  },
  EXPORT_ONLY: {
    status: 403,
    retryable: false,
    message: "Ferry can't download from here, but you can export your own content from the platform.",
  },
  PLATFORM_DISABLED: {
    status: 403,
    retryable: false,
    message: 'Downloads from this platform are turned off on this server right now.',
  },
  ATTESTATION_REQUIRED: {
    status: 403,
    retryable: false,
    message: 'Please confirm you own this content or have permission to download it.',
  },
  BLOCKED_DESTINATION: {
    status: 403,
    retryable: false,
    message: 'This link points to a private or local network address, which Ferry never accesses.',
  },
  PRIVATE_CONTENT: { status: 422, retryable: false, message: 'This media is private.' },
  AUTH_REQUIRED: {
    status: 422,
    retryable: false,
    message: "This media requires signing in to the platform. Ferry never asks for your password, so it can't access it.",
  },
  DRM_PROTECTED: {
    status: 422,
    retryable: false,
    message: 'This media is protected with DRM. Ferry does not remove copy protection.',
  },
  GEO_RESTRICTED: {
    status: 422,
    retryable: false,
    message: "This media isn't available in the region where this server runs.",
  },
  LIVE_NOT_SUPPORTED: {
    status: 422,
    retryable: false,
    message: 'This is a live stream. Try again after it ends.',
  },
  DURATION_LIMIT: {
    status: 422,
    retryable: false,
    message: "This media is longer than this server's {duration} limit.",
  },
  FILE_TOO_LARGE: {
    status: 413,
    retryable: false,
    message: "This file is bigger than this server's {size} limit. Try a lower quality or trim it.",
  },
  FORMAT_UNAVAILABLE: {
    status: 422,
    retryable: false,
    message: "That quality or format isn't available for this media.",
  },
  CONTENT_UNAVAILABLE: {
    status: 404,
    retryable: false,
    message: 'This media is no longer available. It may have been removed or made private.',
  },
  NO_MEDIA_FOUND: {
    status: 422,
    retryable: false,
    message: "We couldn't find any downloadable media on this page.",
  },
  EXTRACTION_FAILED: {
    status: 502,
    retryable: true,
    message: "We couldn't read this page. The site may have changed - try again later.",
  },
  SOURCE_RATE_LIMITED: {
    status: 503,
    retryable: true,
    message: 'The source is limiting requests from this server. Try again in a few minutes.',
  },
  NETWORK_ERROR: { status: 502, retryable: true, message: "We couldn't reach the source." },
  DOWNLOAD_INTERRUPTED: {
    status: 502,
    retryable: true,
    message: 'The transfer stopped before it finished. You can retry.',
  },
  CONVERSION_FAILED: {
    status: 500,
    retryable: true,
    message: "We downloaded the media but couldn't convert it. Try again or choose another format.",
  },
  TIMEOUT: { status: 504, retryable: true, message: 'This took too long and was stopped.' },
  INSUFFICIENT_STORAGE: {
    status: 507,
    retryable: true,
    message: 'The server is out of space right now. Try again in a few minutes.',
  },
  QUEUE_FULL: { status: 503, retryable: true, message: 'Lots of downloads right now. Try again in a minute.' },
  BUSY: { status: 503, retryable: true, message: 'The server is busy analyzing other links. Try again in a moment.' },
  RATE_LIMITED: { status: 429, retryable: true, message: "You're going a bit fast. Try again in {seconds} s." },
  TOO_MANY_ACTIVE_JOBS: {
    status: 429,
    retryable: true,
    message: 'You already have {max} downloads in progress. Wait for one to finish.',
  },
  PROBE_EXPIRED: { status: 410, retryable: false, message: 'This analysis expired. Paste the link again.' },
  JOB_NOT_FOUND: { status: 404, retryable: false, message: "We couldn't find that download." },
  JOB_EXPIRED: {
    status: 410,
    retryable: false,
    message: 'This file was deleted from the server after the retention period. Download it again.',
  },
  FORBIDDEN: { status: 403, retryable: false, message: "You don't have access to this download." },
  INVALID_STATE: { status: 409, retryable: false, message: "That action isn't possible right now." },
  CANCELLED: { status: 409, retryable: false, message: 'This download was cancelled.' },
  NOT_FOUND: { status: 404, retryable: false, message: 'Not found.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, retryable: false, message: 'Requests must be sent as JSON.' },
  PAYLOAD_TOO_LARGE: { status: 413, retryable: false, message: 'The request is too large.' },
  ENGINE_UNAVAILABLE: {
    status: 503,
    retryable: true,
    message: "This server is missing a tool it needs to prepare files (FFmpeg). Its operator needs to install it.",
  },
  INTERNAL_ERROR: { status: 500, retryable: true, message: 'Something went wrong on our side.' },
});

export const ERROR_CODES = Object.freeze(Object.fromEntries(Object.keys(ERRORS).map((k) => [k, k])));

/** @param {string} code */
export function errorSpec(code) {
  return ERRORS[code] ?? ERRORS.INTERNAL_ERROR;
}

/** @param {string} code */
export function isRetryable(code) {
  return errorSpec(code).retryable;
}

/**
 * Fill `{placeholders}` in a message template. Unknown placeholders are removed.
 * @param {string} template
 * @param {Record<string, string|number>} [params]
 */
export function fillTemplate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] ?? params[key] === 0 ? String(params[key]) : ''));
}

/**
 * Application error carrying a catalog code. `internal` is for logs only and
 * must never be sent to clients.
 */
export class FerryError extends Error {
  /**
   * @param {string} code
   * @param {{ message?: string, params?: Record<string, string|number>, details?: object, internal?: string, cause?: unknown, retryAfter?: number }} [opts]
   */
  constructor(code, opts = {}) {
    const spec = errorSpec(code);
    super(opts.message ?? fillTemplate(spec.message, opts.params), opts.cause ? { cause: opts.cause } : undefined);
    this.name = 'FerryError';
    this.code = ERRORS[code] ? code : 'INTERNAL_ERROR';
    this.status = spec.status;
    this.retryable = spec.retryable;
    this.details = opts.details;
    this.internal = opts.internal;
    this.retryAfter = opts.retryAfter;
  }

  /** Public, client-safe representation. */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/** @param {unknown} err */
export function isFerryError(err) {
  return err instanceof FerryError || (typeof err === 'object' && err !== null && err.name === 'FerryError' && 'code' in err);
}
