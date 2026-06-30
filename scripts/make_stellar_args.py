import json
from pathlib import Path

base = Path(__file__).resolve().parents[1]
vk = json.loads((base/'circuits/keys/verification_key.json').read_text())
proof = json.loads((base/'circuits/build/proof.json').read_text())
public = json.loads((base/'circuits/build/public.json').read_text())
out = base/'circuits/build/stellar-args'
out.mkdir(parents=True, exist_ok=True)

def fp_hex(n):
    return int(n).to_bytes(48, 'big').hex()

def g1_hex(p):
    return fp_hex(p[0]) + fp_hex(p[1])

def g2_hex(p):
    # snarkjs: [[x_c0, x_c1], [y_c0, y_c1], [1,0]]
    # Soroban BLS12-381 G2 uncompressed: x_c1 || x_c0 || y_c1 || y_c0
    return fp_hex(p[0][1]) + fp_hex(p[0][0]) + fp_hex(p[1][1]) + fp_hex(p[1][0])

vk_arg = {
    'alpha': g1_hex(vk['vk_alpha_1']),
    'beta': g2_hex(vk['vk_beta_2']),
    'gamma': g2_hex(vk['vk_gamma_2']),
    'delta': g2_hex(vk['vk_delta_2']),
    'ic': [g1_hex(p) for p in vk['IC']],
}
claim_arg = {
    'proof': {
        'a': g1_hex(proof['pi_a']),
        'b': g2_hex(proof['pi_b']),
        'c': g1_hex(proof['pi_c']),
    },
    'public_signals': public,
}
(out/'vk.json').write_text(json.dumps(vk_arg), encoding='utf-8')
(out/'claim.json').write_text(json.dumps(claim_arg), encoding='utf-8')
(out/'root.txt').write_text(public[0], encoding='utf-8')
print(json.dumps({
    'vk': str(out/'vk.json'),
    'claim': str(out/'claim.json'),
    'root': public[0],
    'nullifier': public[1],
}, indent=2))
