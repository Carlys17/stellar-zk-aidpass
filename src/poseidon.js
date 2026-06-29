import { buildPoseidon } from 'circomlibjs';

let poseidonInstance;
export async function poseidonHash(inputs) {
  if (!poseidonInstance) poseidonInstance = await buildPoseidon();
  const F = poseidonInstance.F;
  const out = poseidonInstance(inputs.map((x) => BigInt(x)));
  return F.toObject(out);
}

export function hexToBigInt(hex) {
  const clean = String(hex).replace(/^0x/, '');
  return BigInt('0x' + (clean || '0'));
}

export function bigIntToHex(n, width = 64) {
  return '0x' + BigInt(n).toString(16).padStart(width, '0');
}
