import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAidRegistry, createAidPassProof, randomSecret, verifyAidPassProof } from '../src/aidpass.js';

test('eligible recipient can generate and verify privacy-preserving AidPass proof', async () => {
  const registry = await buildAidRegistry([
    { id: 'r1', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
    { id: 'r2', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
    { id: 'r3', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
  ], 2);
  const proof = await createAidPassProof(registry, 1, 'round-a');
  const verdict = await verifyAidPassProof(proof);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.okMerkle, true);
  assert.equal(verdict.okZk, true);
});

test('tampered nullifier/context breaks NIZK proof verification', async () => {
  const registry = await buildAidRegistry([
    { id: 'r1', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
    { id: 'r2', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
  ], 2);
  const proof = await createAidPassProof(registry, 0, 'round-a');
  proof.nullifier = '0x' + '11'.repeat(32);
  const verdict = await verifyAidPassProof(proof);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.okZk, false);
});
