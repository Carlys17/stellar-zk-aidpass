pragma circom 2.2.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template MerkleProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component hashers[levels];
    signal hashes[levels + 1];
    signal left[levels];
    signal right[levels];
    signal isLeft[levels];

    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Constrain path index to boolean.
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        // If pathIndices[i] == 0: current node is left.
        // If pathIndices[i] == 1: current node is right.
        // Written as quadratic-safe selectors for Circom.
        isLeft[i] <== 1 - pathIndices[i];
        left[i] <== pathElements[i] + (hashes[i] - pathElements[i]) * isLeft[i];
        right[i] <== hashes[i] + (pathElements[i] - hashes[i]) * isLeft[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[levels];
}

template AidPass(levels) {
    // Private inputs: recipient secret and Merkle auth path.
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Public context inputs and public outputs verified by Stellar/Soroban.
    signal input claimScopeHash;
    signal input credentialTagHash;
    signal output root;
    signal output nullifier;

    // leaf = Poseidon(secret, credentialTagHash)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== credentialTagHash;

    // Constraint 1: leaf is included in Merkle root.
    component merkle = MerkleProof(levels);
    merkle.leaf <== leafHasher.out;
    for (var i = 0; i < levels; i++) {
        merkle.pathElements[i] <== pathElements[i];
        merkle.pathIndices[i] <== pathIndices[i];
    }
    root <== merkle.root;

    // Constraint 2: nullifier = Poseidon(secret, claimScopeHash)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== claimScopeHash;
    nullifier <== nullifierHasher.out;
}

component main { public [claimScopeHash, credentialTagHash] } = AidPass(3);
