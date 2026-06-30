# Stellar ZK AidPass

Privacy-preserving aid/remittance eligibility claims for **Stellar Hacks: Real-World ZK**.

## What it does

AidPass lets a recipient prove:

> “I am eligible for this aid round and I have not claimed before.”

without revealing which private recipient record they are.

This is aimed at disaster-relief payouts, NGO cash-transfer programs, remittance vouchers, and compliance-gated Stellar payments.

## ZK is load-bearing

The project uses a **Circom Groth16 proof over BLS12-381** and a **Soroban smart contract** that verifies the proof before accepting a claim.

The proof binds:

- private recipient secret
- private Merkle authentication path
- public Merkle root
- public nullifier
- public aid-round scope hash
- public credential tag hash

The Soroban contract accepts a claim only if:

1. the public root matches the root stored at initialization,
2. the nullifier has not already been spent,
3. the Groth16 proof verifies on-chain using Stellar BLS12-381 host functions.

Only after all checks pass does the contract mark the nullifier as spent.

## Architecture

```text
Private recipient witness
  ├─ secret
  └─ Merkle path
        ↓
Circom AidPass circuit, BLS12-381
  ├─ computes root
  ├─ computes nullifier
  └─ emits Groth16 proof
        ↓
Soroban AidPassClaim contract
  ├─ stores verification key at init
  ├─ verifies Groth16 proof on-chain
  ├─ checks stored root
  ├─ rejects reused nullifier
  └─ accepts valid claim
```

## Repository layout

```text
circuits/aidpass.circom              # ZK circuit
circuits/build/aidpass_js/aidpass.wasm
circuits/keys/aidpass_final.zkey     # proving key for demo
circuits/keys/verification_key.json  # verifying key
contracts/aidpass/src/lib.rs         # Soroban contract with Groth16 verifier
contracts/aidpass/src/test.rs        # contract tests using real proof fixture
scripts/generate-aidpass-proof.js    # proof generation + local verification
```

## Testnet evidence

Deployed on Stellar testnet:

```text
Contract ID: CCHH27TMU7QXA6PLSGXGZOXMRGSPHLT6LNOFASFFPEWNGU5XY6WK32TP
Admin / claimant testnet account: GD24D63CFA3DNLQG6Q5PT7XHE6FYG6KCNK2QG2EMBPRF746UUWWSE4KY
```

Transactions:

- WASM upload: https://stellar.expert/explorer/testnet/tx/526a694d124c7709ae28d9861eeef7b050fdaa6bc683b99a089941aeb7b7f8eb
- Contract deploy: https://stellar.expert/explorer/testnet/tx/9e6a8b9474dbf7fbb47a2d73eb0d763ae39e2b18dd77b55ef9911ffa51a9dfc9
- Contract init with stored root + verification key: https://stellar.expert/explorer/testnet/tx/883390f4de150cb31ef69c6b1ce10501127264b8a04ceb6ea7acf11772a5ea11
- Valid Groth16 claim accepted: https://stellar.expert/explorer/testnet/tx/cf803c350571539fb9eb8e423589d08820855b0100a3392101ed7352b933239d

A second claim with the same nullifier was rejected during simulation with:

```text
HostError: Error(Contract, #4)
```

`#4` is `AidPassError::NullifierSpent`.

## Quick start

```bash
npm install
npm run prove
npm run contract:test
npm run contract:build
```

Expected evidence:

- `npm run prove` prints `ok: true`, `protocol: groth16`, `curve: bls12381`.
- `npm run contract:test` runs Soroban tests where:
  - valid proof claim succeeds once,
  - second claim with same nullifier fails,
  - wrong root fails.
- `npm run contract:build` produces `contracts/aidpass/target/wasm32v1-none/release/aidpass.wasm`.

## Commands

```bash
# Generate and verify Groth16 proof locally
npm run prove

# Test Soroban contract with real proof/verifying-key fixture
npm run contract:test

# Build Soroban WASM
npm run contract:build

# Legacy JS-only demo from the first MVP
npm run demo
npm run stellar
```

## Hackathon alignment

| Requirement | AidPass implementation |
|---|---|
| Uses ZK | Circom Groth16 proof over BLS12-381 |
| Runs on Stellar | Soroban contract verifies proof using Stellar BLS12-381 host functions |
| ZK is load-bearing | Claim is accepted only after proof verification, root check, and nullifier check |
| Real-world use case | Private eligibility for aid/remittance/compliance-gated payments |
| Repo required | This GitHub repository |
| Demo video required | To be recorded for DoraHacks submission |

## Security notes / limitations

- Hackathon MVP, not audited.
- Demo uses a local trusted setup for reproducibility, not a production ceremony.
- Current contract demonstrates proof-gated claiming and nullifier enforcement; token escrow/release can be added on top of the same `claim()` success path.
- Do not use with real funds without audit and production-grade ceremony/key management.
