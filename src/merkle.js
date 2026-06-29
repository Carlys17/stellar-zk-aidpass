import { poseidonHash } from './poseidon.js';

export class PoseidonMerkleTree {
  constructor(levels, zero, layers) {
    this.levels = levels;
    this.zero = zero;
    this.layers = layers;
    this.root = layers[layers.length - 1][0];
  }

  static async build(leaves, levels = 3) {
    const capacity = 2 ** levels;
    if (leaves.length > capacity) throw new Error(`too many leaves: ${leaves.length}/${capacity}`);
    let zero = await poseidonHash([0n, 0n]);
    let layer = [...leaves.map(BigInt)];
    while (layer.length < capacity) layer.push(zero);
    const layers = [layer];
    for (let level = 0; level < levels; level++) {
      const prev = layers[level];
      const next = [];
      for (let i = 0; i < prev.length; i += 2) {
        next.push(await poseidonHash([prev[i], prev[i + 1]]));
      }
      layers.push(next);
    }
    return new PoseidonMerkleTree(levels, zero, layers);
  }

  getProof(index) {
    const siblings = [];
    const pathIndices = [];
    let idx = index;
    for (let level = 0; level < this.levels; level++) {
      const isRight = idx % 2;
      pathIndices.push(isRight);
      siblings.push(this.layers[level][isRight ? idx - 1 : idx + 1]);
      idx = Math.floor(idx / 2);
    }
    return { siblings, pathIndices };
  }

  static async verify(leaf, proof, root) {
    let cur = BigInt(leaf);
    for (let i = 0; i < proof.siblings.length; i++) {
      const sib = BigInt(proof.siblings[i]);
      cur = proof.pathIndices[i] ? await poseidonHash([sib, cur]) : await poseidonHash([cur, sib]);
    }
    return cur === BigInt(root);
  }
}
