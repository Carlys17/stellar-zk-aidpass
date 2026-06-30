import { existsSync, readFileSync } from 'node:fs';

const required = [
  'README.md',
  'circuits/aidpass.circom',
  'circuits/build/aidpass_js/aidpass.wasm',
  'circuits/keys/aidpass_final.zkey',
  'circuits/keys/verification_key.json',
  'contracts/aidpass/Cargo.toml',
  'contracts/aidpass/src/lib.rs',
  'contracts/aidpass/src/test.rs',
  'scripts/generate-aidpass-proof.js',
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`${file} missing`);
  const txt = readFileSync(file);
  if (txt.length < 100) throw new Error(`${file} looks incomplete`);
}

const readme = readFileSync('README.md', 'utf8');
for (const phrase of ['Groth16', 'BLS12-381', 'Soroban', 'nullifier']) {
  if (!readme.includes(phrase)) throw new Error(`README missing ${phrase}`);
}

console.log('Build check OK: ZK circuit, proof artifacts, Soroban contract, tests, and README are present.');
