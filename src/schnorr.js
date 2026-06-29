import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const n = secp256k1.Point.Fn.ORDER;
const G = secp256k1.Point.BASE;

function mod(a, m = n) { const r = a % m; return r >= 0n ? r : r + m; }
function bytesToNumberBE(bytes) { return BigInt('0x' + bytesToHex(bytes)); }
function numberToBytesBE(num, len = 32) {
  const hex = num.toString(16).padStart(len * 2, '0');
  return hexToBytes(hex);
}
function hashToScalar(parts) {
  const joined = [];
  for (const p of parts) {
    if (typeof p === 'string') joined.push(...hexToBytes(p.replace(/^0x/, '')));
    else joined.push(...p);
  }
  return mod(bytesToNumberBE(sha256(new Uint8Array(joined))));
}
export function derivePublic(secret) {
  const x = mod(BigInt(secret));
  if (x === 0n) throw new Error('secret must be non-zero');
  return G.multiply(x).toHex(false);
}
export function proveKnowledge(secret, contextHex = '00') {
  const x = mod(BigInt(secret));
  const publicKey = derivePublic(x);
  const kSeed = sha256(new Uint8Array([...numberToBytesBE(x), ...hexToBytes(contextHex.replace(/^0x/, '').padStart(2, '0'))]));
  const k = mod(bytesToNumberBE(kSeed)) || 1n;
  const R = G.multiply(k).toHex(false);
  const e = hashToScalar([publicKey, R, contextHex]);
  const s = mod(k + e * x);
  return { publicKey, R, s: '0x' + s.toString(16) };
}
export function verifyKnowledge(proof, contextHex = '00') {
  const P = secp256k1.Point.fromHex(proof.publicKey);
  const R = secp256k1.Point.fromHex(proof.R);
  const s = mod(BigInt(proof.s));
  const e = hashToScalar([proof.publicKey, proof.R, contextHex]);
  return G.multiply(s).equals(R.add(P.multiply(e)));
}
