# Stellar ZK AidPass

Privacy-preserving aid/remittance eligibility claims for Stellar.

Built for **Stellar Hacks: Real-World ZK**.

## Problem

Aid distribution and remittance programs often need eligibility checks, sanctions/compliance controls, and duplicate-claim prevention. Public blockchains make payments transparent, but publishing a recipient list leaks sensitive identity and location data.

## Solution

**Stellar ZK AidPass** lets a recipient prove:

> “I am an eligible recipient for this aid round and I have not claimed before”

without revealing which private record they are.

The MVP combines:

- **Poseidon Merkle registry** of eligible recipients
- **Non-interactive Schnorr zero-knowledge proof of knowledge** of the recipient secret
- **Nullifier** to prevent double claims per aid round
- **Stellar transaction anchoring** with proof hash in memo
- **Soroban claim-contract interface** for root/nullifier tracking and future Groth16/BN254 verifier integration

## Why Stellar

Stellar is strong for real-world money movement: remittance, low-cost payments, and aid distribution. Protocol 25/26 ZK primitives make this pattern a natural fit for privacy-preserving, compliance-aware payments.

## Architecture

```text
Aid Program Admin
  -> creates private eligible recipient registry
       -> Poseidon Merkle root published to Soroban contract

Recipient browser/client
  -> creates nullifier = Poseidon(secret, aid_round)
  -> proves Merkle membership without exposing private recipient id
  -> creates Schnorr NIZK proof of knowledge of secret
  -> submits claim proof hash to Stellar/Soroban

Soroban claim contract
  -> checks root
  -> rejects spent nullifier
  -> production: verifies Groth16/BN254 proof
  -> releases XLM/USDC aid payment
```

## Current MVP Scope

This repo intentionally ships a working hackathon MVP that can run locally now:

- `npm run demo` generates and verifies an AidPass privacy proof.
- `npm run stellar` prepares a Stellar testnet transaction envelope with the proof hash anchored in a memo.
- `contracts/aidpass/src/lib.rs` shows the Soroban claim-contract interface for root/nullifier tracking.

The production path is to replace the JS-side NIZK verifier with an on-chain Groth16/BN254 verifier using Stellar Protocol 25/26 host functions.

## Quick Start

```bash
npm install
npm test
npm run demo
npm run stellar
```

## Example Use Cases

- Disaster-relief payouts without exposing recipient lists
- NGO cash-transfer programs
- Privacy-preserving remittance vouchers
- KYC/compliance-gated Stellar payments
- One-person-one-claim airdrops with private eligibility

## Hackathon Alignment

| Criterion | How AidPass addresses it |
|---|---|
| Innovation | Combines aid/remittance, privacy, nullifiers, and Stellar payments |
| Technical implementation | Poseidon Merkle tree, NIZK proof, Stellar SDK transaction, Soroban contract interface |
| Real-world applicability | Directly useful for NGOs, remittance corridors, compliance-gated payments, and aid distribution |

## Security Notes

- MVP is not audited and must not custody real funds.
- Nullifiers are scoped by aid round to prevent replay/double-claims.
- Recipient secrets never need to leave the client.
- Production should use a formal SNARK circuit and on-chain verifier instead of relying on client-side verification.

## Demo Script

1. Show the recipient registry root, not the private recipient list.
2. Generate AidPass proof for one private recipient.
3. Verify proof: Merkle membership + NIZK knowledge proof + nullifier.
4. Show Stellar testnet transaction XDR with proof hash memo.
5. Explain Soroban contract prevents double claims and would release XLM/USDC after verifier success.
