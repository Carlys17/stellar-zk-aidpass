import { buildAidRegistry, createAidPassProof, randomSecret, verifyAidPassProof } from './aidpass.js';

const recipients = Array.from({ length: 5 }, (_, i) => ({
  id: `private-recipient-${i + 1}`,
  secret: randomSecret(),
  credentialTag: 'eligible-aid-recipient-v1',
}));
const registry = await buildAidRegistry(recipients, 3);
const proof = await createAidPassProof(registry, 2, 'indonesia-flood-aid-round-001');
const verdict = await verifyAidPassProof(proof);

console.log(JSON.stringify({
  product: 'Stellar ZK AidPass',
  note: 'Legacy JS demo. Hackathon compliance path uses Groth16 proof generation plus on-chain Soroban verification: npm run prove && npm run contract:test.',
  statement: 'I am an eligible aid recipient for this round, without revealing which private recipient record I am.',
  publicInputs: { root: proof.root, nullifier: proof.nullifier, claimScope: proof.claimScope },
  privacy: ['recipient id hidden', 'secret hidden', 'one-claim nullifier prevents double spend'],
  verifierVerdict: verdict,
  proofPreview: { publicKey: proof.publicKey.slice(0, 24) + '...', merklePathLength: proof.merkleProof.siblings.length, schnorrR: proof.schnorr.R.slice(0, 24) + '...' },
}, null, 2));
