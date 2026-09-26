# Proof of Trust — Decision Bundle Verification

**Verification ID:** POT-CMC-VRF-001  
**Date:** 2026-09-23  
**Bundle:** `POT-CMC-001-decision-bundle.json`  
**Schema:** `pot-decision-bundle/v0.1`

## Result

**PASS — the exported decision bundle independently reproduces its embedded SHA-256 digest.**

- Algorithm: `SHA-256`
- Hashed section: `payload`
- Canonicalization: recursive lexicographic key ordering encoded as UTF-8
- Embedded digest: `c1ad325163678c2f019621702085bc69593a3f7182a1ec1efce22916e6b0855f`
- Independently calculated digest: `c1ad325163678c2f019621702085bc69593a3f7182a1ec1efce22916e6b0855f`
- Digest comparison: **MATCH**

The verified payload contained three evidence records and four classified claims.

## Controlled tamper test

The original file was not modified. A copy of the payload was changed in memory:

- Field: `payload.decision.state`
- Original value: `DEFERRED`
- Test value: `AUTHORIZED`
- Resulting digest: `fbf5a03682005e7cb653a40face955cb038fa8f2780e7754faecc324005fce61`
- Comparison with original digest: **MISMATCH — tampering detected**

## Credential-boundary check

No CoinMarketCap API key, bearer token, `X-CMC_PRO_API_KEY` value, or HTTP authorization header was found. The word “authorization” appears only in the governance statement: an interpretation cannot become authorization.

## Conclusion

The test demonstrates that the Version 5 bundle is portable and tamper-evident. An independent verifier can reproduce the recorded digest from the canonical payload, while a one-field change produces a different digest. The integrity mechanism therefore detects modification of the governed decision record.

**Status:** Verified and preserved as hackathon evidence.
