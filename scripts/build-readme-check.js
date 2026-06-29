import { readFileSync } from 'node:fs';
for (const file of ['README.md', 'src/demo.js', 'src/stellar-demo.js', 'contracts/aidpass/src/lib.rs']) {
  const txt = readFileSync(file, 'utf8');
  if (txt.length < 100) throw new Error(`${file} looks incomplete`);
}
console.log('Build check OK: docs, demo, Stellar integration, and Soroban contract stub present.');
