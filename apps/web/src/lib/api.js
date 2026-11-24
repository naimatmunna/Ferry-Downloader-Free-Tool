/** Thin client for the Ferry API. Every failure becomes an ApiError with a code. */

export class ApiError extends Error {
  constructor({ status = 0, code = 'INTERNAL_ERROR', message = 'Something went wrong.', retryable = false, details = null, retryAfter = null, requestId = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    this.retryAfter = retryAfter;
    this.requestId = requestId;
  }
}

async function request(path, { method = 'GET', body, token, signal, headers = {} } = {}) {
  const h = { accept: 'application/json', ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, signal, credentials: 'same-origin', cache: 'no-store' });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({ code: 'OFFLINE', message: "Can't reach Ferry. Check your connection.", retryable: true });
  }
  if (res.status === 204 || res.status === 304) return { status: res.status, data: null, headers: res.headers };
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError({
      status: res.status,
      code: e.code ?? (res.status >= 500 ? 'INTERNAL_ERROR' : 'NOT_FOUND'),
      message: e.message ?? 'Something went wrong.',
      retryable: e.retryable ?? res.status >= 500,
      details: e.details ?? null,
      retryAfter: Number(res.headers.get('retry-after')) || null,
      requestId: e.requestId ?? null,
    });
  }
  return { status: res.status, data, headers: res.headers };
}

const data = async (p) => (await p).data;

export const api = {
  config: () => data(request('/api/v1/config')),
  /** Conditional fetch of the registry; returns null when unchanged. */
  async platforms(etag) {
    const r = await request('/api/v1/platforms', { headers: etag ? { 'if-none-match': etag } : {} });
    if (r.status === 304) return null;
    return { etag: r.headers.get('etag'), ...r.data };
  },
  status: () => data(request('/api/v1/status')),
  probe: (url, { playlist = false, signal } = {}) => data(request('/api/v1/probe', { method: 'POST', body: { url, playlist }, signal })),
  createJob: (body) => data(request('/api/v1/jobs', { method: 'POST', body })),
  jobStatus: (jobs) => data(request('/api/v1/jobs/status', { method: 'POST', body: { jobs } })),
  action: (id, token, action) => data(request(`/api/v1/jobs/${encodeURIComponent(id)}/${action}`, { method: 'POST', token, body: {} })),
  remove: (id, token) => data(request(`/api/v1/jobs/${encodeURIComponent(id)}`, { method: 'DELETE', token })),
};

/** URL for a produced file (token in the query: browser-native downloads can't send headers). */
export function fileHref(file, token, { inline = false } = {}) {
  return `${file.url}?token=${encodeURIComponent(token)}${inline ? '&disposition=inline' : ''}`;
}

export function archiveHref(job, token) {
  return job.output?.archiveUrl ? `${job.output.archiveUrl}?token=${encodeURIComponent(token)}` : null;
}
