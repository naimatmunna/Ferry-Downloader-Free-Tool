/**
 * Start a download, analyzing the link again if the server forgot the first
 * analysis. The server keeps analyses in memory for PROBE_TTL_MINUTES (15 by
 * default) and loses them when it restarts (a code change under `npm run dev`,
 * a new deploy) or when another copy answers (Vercel). The user's choices
 * (mode, quality, pictures, playlist entry) are sent again unchanged; if they
 * no longer fit the fresh analysis, the server says so.
 */

/**
 * @param {{ body: any, meta?: { sourceUrl?: string|null } }} item
 * @param {{ createJob: (body: any) => Promise<any>, probe: (url: string, opts: { playlist: boolean }) => Promise<any> }} api
 * @returns {Promise<any>} the createJob result, plus `probeId` when the analysis was redone
 */
export async function createJobFresh(item, api) {
  try {
    return await api.createJob(item.body);
  } catch (err) {
    const url = item.meta?.sourceUrl;
    if (err?.code !== 'PROBE_EXPIRED' || !url) throw err;
    const fresh = await api.probe(url, { playlist: Boolean(item.body.entryId) });
    const result = await api.createJob({ ...item.body, probeId: fresh.probe.id });
    return { ...result, probeId: fresh.probe.id };
  }
}
