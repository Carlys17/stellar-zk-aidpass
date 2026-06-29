import { randomBytes, createHash } from 'node:crypto';
import { poseidonHash, bigIntToHex, hexToBigInt } from './poseidon.js';
import { PoseidonMerkleTree } from './merkle.js';
import { derivePublic, proveKnowledge, verifyKnowledge } from './schnorr.js';

const FIELD_MASK = (1n << 248n) - 1n;
export function randomSecret() { return hexToBigInt('0x' + randomBytes(31).toString('hex')) & FIELD_MASK; }
export function hashTextToField(text) { return hexToBigInt(createHash('sha256').update(text).digest('hex')) & FIELD_MASK; }
export async function leafFor(publicKey, credentialTag) {
  const pkHash = hashTextToField(publicKey);
  const tagHash = hashTextToField(credentialTag);
  return poseidonHash([pkHash, tagHash]);
}
export async function nullifierFor(secret, scope = 'stellar-zk-aidpass-v1') {
  return poseidonHash([BigInt(secret), hashTextToField(scope)]);
}

export async function buildAidRegistry(recipients, levels = 3) {
  const enriched = [];
  for (const r of recipients) {
    const publicKey = derivePublic(r.secret);
    const leaf = await leafFor(publicKey, r.credentialTag);
    enriched.push({ ...r, publicKey, leaf });
  }
  const tree = await PoseidonMerkleTree.build(enriched.map((r) => r.leaf), levels);
  return { tree, recipients: enriched, root: tree.root };
}

export async function createAidPassProof(registry, index, claimScope = 'aid-round-001') {
  const recipient = registry.recipients[index];
  const merkleProof = registry.tree.getProof(index);
  const nullifier = await nullifierFor(recipient.secret, claimScope);
  const context = bigIntToHex(await poseidonHash([registry.root, nullifier, hashTextToField(claimScope)]));
  const schnorr = proveKnowledge(recipient.secret, context);
  return {
    app: 'Stellar ZK AidPass',
    version: 1,
    claimScope,
    root: bigIntToHex(registry.root),
    leaf: bigIntToHex(recipient.leaf),
    nullifier: bigIntToHex(nullifier),
    publicKey: recipient.publicKey,
    merkleProof: {
      siblings: merkleProof.siblings.map((x) => bigIntToHex(x)),
      pathIndices: merkleProof.pathIndices,
    },
    schnorr,
  };
}

export async function verifyAidPassProof(proof) {
  const root = BigInt(proof.root);
  const leaf = BigInt(proof.leaf);
  const okMerkle = await PoseidonMerkleTree.verify(
    leaf,
    { siblings: proof.merkleProof.siblings.map(BigInt), pathIndices: proof.merkleProof.pathIndices },
    root,
  );
  const recomputedLeaf = await leafFor(proof.publicKey, 'eligible-aid-recipient-v1');
  const okLeaf = recomputedLeaf === leaf;
  const context = bigIntToHex(await poseidonHash([root, BigInt(proof.nullifier), hashTextToField(proof.claimScope)]));
  const okZk = verifyKnowledge(proof.schnorr, context) && proof.schnorr.publicKey === proof.publicKey;
  return { ok: okMerkle && okLeaf && okZk, okMerkle, okLeaf, okZk };
}
