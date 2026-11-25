import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createJobFresh } from '../src/lib/retryExpired.js';

const expired = Object.assign(new Error('This analysis expired. Paste the link again.'), { code: 'PROBE_EXPIRED' });
const item = (body = {}) => ({
  body: { probeId: 'p_old', mode: 'gallery', gallery: { items: [1, 3] }, attest: false, ...body },
  meta: { probeId: 'p_old', sourceUrl: 'https://www.instagram.com/p/POST1/' },
});

test('an analysis the server forgot is redone once, and the same choices are sent again', async () => {
  const sent = [];
  const probes = [];
  const result = await createJobFresh(item(), {
    createJob: async (body) => {
      sent.push(body);
      if (body.probeId === 'p_old') throw expired;
      return { job: { id: 'j1' }, token: 't' };
    },
    probe: async (url, opts) => {
      probes.push([url, opts]);
      return { probe: { id: 'p_new' } };
    },
  });
  assert.equal(result.job.id, 'j1');
  assert.deepEqual(probes, [['https://www.instagram.com/p/POST1/', { playlist: false }]]);
  assert.deepEqual(sent[1], { ...sent[0], probeId: 'p_new' }, 'same mode, pictures and options; only the analysis is new');
  assert.equal(result.probeId, 'p_new');
});

test('a playlist entry is looked up again in the playlist', async () => {
  const probes = [];
  await createJobFresh(item({ entryId: 'e2', mode: 'av', gallery: undefined }), {
    createJob: async (body) => {
      if (body.probeId === 'p_old') throw expired;
      return { job: { id: 'j1' }, token: 't' };
    },
    probe: async (url, opts) => {
      probes.push(opts);
      return { probe: { id: 'p_new' } };
    },
  });
  assert.deepEqual(probes, [{ playlist: true }]);
});

test('it retries only once and only for a forgotten analysis', async () => {
  let creates = 0;
  await assert.rejects(
    createJobFresh(item(), {
      createJob: async () => {
        creates += 1;
        throw expired;
      },
      probe: async () => ({ probe: { id: 'p_new' } }),
    }),
    { code: 'PROBE_EXPIRED' },
  );
  assert.equal(creates, 2);

  const other = Object.assign(new Error('nope'), { code: 'ATTESTATION_REQUIRED' });
  let probed = false;
  await assert.rejects(
    createJobFresh(item(), {
      createJob: async () => {
        throw other;
      },
      probe: async () => {
        probed = true;
        return { probe: { id: 'x' } };
      },
    }),
    { code: 'ATTESTATION_REQUIRED' },
  );
  assert.equal(probed, false);

  // Without the original link there is nothing to analyze again.
  await assert.rejects(createJobFresh({ body: { probeId: 'p_old' }, meta: {} }, { createJob: async () => { throw expired; }, probe: async () => ({ probe: { id: 'x' } }) }), { code: 'PROBE_EXPIRED' });
});
