#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bls12_381::{Bls12381Fr, Bls12381G1Affine, Bls12381G2Affine},
    vec, Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AidPassError {
    NotInitialized = 1,
    MalformedPublicSignals = 2,
    WrongRoot = 3,
    NullifierSpent = 4,
    MalformedVerifyingKey = 5,
    InvalidProof = 6,
}

#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bls12381G1Affine,
    pub beta: Bls12381G2Affine,
    pub gamma: Bls12381G2Affine,
    pub delta: Bls12381G2Affine,
    pub ic: Vec<Bls12381G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bls12381G1Affine,
    pub b: Bls12381G2Affine,
    pub c: Bls12381G1Affine,
}

#[derive(Clone)]
#[contracttype]
pub struct ClaimProof {
    pub proof: Proof,
    // public signals order from snarkjs for this circuit:
    // [root, nullifier, claimScopeHash, credentialTagHash]
    pub public_signals: Vec<Bls12381Fr>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Root,
    VerifyingKey,
    Spent(Bls12381Fr),
}

#[contract]
pub struct AidPassClaim;

fn verify_groth16(
    env: &Env,
    vk: VerificationKey,
    proof: Proof,
    pub_signals: Vec<Bls12381Fr>,
) -> Result<bool, AidPassError> {
    let bls = env.crypto().bls12_381();
    if pub_signals.len() + 1 != vk.ic.len() {
        return Err(AidPassError::MalformedVerifyingKey);
    }

    let mut vk_x = vk.ic.get(0).unwrap();
    for (s, v) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
        let prod = bls.g1_mul(&v, &s);
        vk_x = bls.g1_add(&vk_x, &prod);
    }

    let neg_a = -proof.a;
    let vp1 = vec![env, neg_a, vk.alpha, vk_x, proof.c];
    let vp2 = vec![env, proof.b, vk.beta, vk.gamma, vk.delta];
    Ok(bls.pairing_check(vp1, vp2))
}

#[contractimpl]
impl AidPassClaim {
    pub fn init(env: Env, root: Bls12381Fr, admin: Address, vk: VerificationKey) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Root, &root);
        env.storage().instance().set(&DataKey::VerifyingKey, &vk);
    }

    pub fn claim(env: Env, claimant: Address, claim: ClaimProof) -> Result<bool, AidPassError> {
        claimant.require_auth();
        if claim.public_signals.len() != 4 {
            return Err(AidPassError::MalformedPublicSignals);
        }

        let stored_root: Bls12381Fr = env
            .storage()
            .instance()
            .get(&DataKey::Root)
            .ok_or(AidPassError::NotInitialized)?;
        let root = claim.public_signals.get(0).unwrap();
        let nullifier = claim.public_signals.get(1).unwrap();

        if root != stored_root {
            return Err(AidPassError::WrongRoot);
        }
        if env
            .storage()
            .persistent()
            .get(&DataKey::Spent(nullifier.clone()))
            .unwrap_or(false)
        {
            return Err(AidPassError::NullifierSpent);
        }

        let vk: VerificationKey = env
            .storage()
            .instance()
            .get(&DataKey::VerifyingKey)
            .ok_or(AidPassError::NotInitialized)?;
        let verified = verify_groth16(&env, vk, claim.proof, claim.public_signals)?;
        if !verified {
            return Err(AidPassError::InvalidProof);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Spent(nullifier), &true);
        Ok(true)
    }
}

#[cfg(test)]
mod test;
