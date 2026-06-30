import { groth16 } from 'snarkjs';
import fs from 'node:fs';

const input = {
  // Private witness: claimant secret + Merkle authentication path.
  secret: '123456789',
  pathElements: ['111', '222', '333'],
  pathIndices: ['0', '1', '0'],

  // Public context bound into the proof.
  claimScopeHash: '20260629001',
  credentialTagHash: '17001',
};

fs.mkdirSync('circuits/build', { recursive: true });
fs.writeFileSync('circuits/build/input.json', JSON.stringify(input, null, 2));

const { proof, publicSignals } = await groth16.fullProve(
  input,
  'circuits/build/aidpass_js/aidpass.wasm',
  'circuits/keys/aidpass_final.zkey',
);

fs.writeFileSync('circuits/build/proof.json', JSON.stringify(proof, null, 2));
fs.writeFileSync('circuits/build/public.json', JSON.stringify(publicSignals, null, 2));

const vk = JSON.parse(fs.readFileSync('circuits/keys/verification_key.json', 'utf8'));
const ok = await groth16.verify(vk, publicSignals, proof);

console.log(JSON.stringify({
  ok,
  protocol: proof.protocol,
  curve: proof.curve,
  publicSignalOrder: ['root', 'nullifier', 'claimScopeHash', 'credentialTagHash'],
  publicSignals,
  artifacts: {
    proof: 'circuits/build/proof.json',
    public: 'circuits/build/public.json',
    verificationKey: 'circuits/keys/verification_key.json',
  },
  stellarRule: 'The Soroban AidPassClaim contract stores the verification key at init and verifies this Groth16 proof before marking the nullifier spent.',
}, null, 2));

process.exit(ok ? 0 : 1);
