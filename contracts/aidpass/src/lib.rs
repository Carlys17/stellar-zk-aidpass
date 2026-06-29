#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Map, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct ClaimProof {
    pub root: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub proof_hash: BytesN<32>,
}

#[contract]
pub struct AidPassClaim;

#[contractimpl]
impl AidPassClaim {
    pub fn init(env: Env, root: BytesN<32>, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&Symbol::new(&env, "root"), &root);
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
    }

    pub fn claim(env: Env, claimant: Address, proof: ClaimProof) -> bool {
        claimant.require_auth();
        let root: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, "root")).unwrap();
        if proof.root != root { return false; }

        let mut spent: Map<BytesN<32>, bool> = env.storage().persistent()
            .get(&Symbol::new(&env, "spent")).unwrap_or(Map::new(&env));
        if spent.get(proof.nullifier.clone()).unwrap_or(false) { return false; }

        // Hackathon MVP interface:
        // - JS demo verifies a Merkle membership + Schnorr NIZK proof client-side.
        // - Production version swaps this placeholder for Stellar Groth16/BN254 verifier
        //   using Protocol 25/26 host functions, then releases XLM/USDC from escrow.
        spent.set(proof.nullifier, true);
        env.storage().persistent().set(&Symbol::new(&env, "spent"), &spent);
        true
    }
}
