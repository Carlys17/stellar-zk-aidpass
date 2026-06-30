import { Keypair, Networks, Operation, TransactionBuilder, Asset, Memo, BASE_FEE } from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';
import { buildAidRegistry, createAidPassProof, randomSecret, verifyAidPassProof } from './aidpass.js';

const registry = await buildAidRegistry([
  { id: 'alice-private', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
  { id: 'bob-private', secret: randomSecret(), credentialTag: 'eligible-aid-recipient-v1' },
], 2);
const proof = await createAidPassProof(registry, 0, 'stellar-testnet-aid-round');
const verdict = await verifyAidPassProof(proof);
const proofHash = createHash('sha256').update(JSON.stringify(proof)).digest('hex');

const sponsor = Keypair.random();
const claimant = Keypair.random();
const accountLike = { accountId: () => sponsor.publicKey(), sequenceNumber: () => '0', incrementSequenceNumber() {} };
const tx = new TransactionBuilder(accountLike, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addMemo(Memo.text(`AidPass:${proofHash.slice(0, 18)}`))
  .addOperation(Operation.payment({ destination: claimant.publicKey(), asset: Asset.native(), amount: '25' }))
  .setTimeout(300)
  .build();

console.log(JSON.stringify({
  integration: 'Stellar testnet transaction envelope prepared offline',
  note: 'Legacy Stellar SDK envelope demo. Hackathon compliance path verifies Groth16 proofs on-chain in Soroban before marking nullifiers spent.',
  verifierVerdict: verdict,
  proofHash,
  sponsorPublicKey: sponsor.publicKey(),
  claimantPublicKey: claimant.publicKey(),
  xdrPreview: tx.toXDR().slice(0, 120) + '...',
}, null, 2));
