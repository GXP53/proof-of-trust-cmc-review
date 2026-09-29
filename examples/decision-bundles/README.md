# Submission-era Decision Bundle

This directory preserves a live decision bundle exported from **Proof of Trust (PoT) — CMC Review** during the hackathon submission period.

## Artifact

- File: [`POT-CMC-001-decision-bundle-2026-09-29.json`](POT-CMC-001-decision-bundle-2026-09-29.json)
- Capture time: `2026-09-29T00:44:55.120Z`
- Decision: `DEFERRED`
- Algorithm: `SHA-256`
- Hashed section: `payload`
- Canonicalization: recursive lexicographic key ordering, UTF-8
- Expected digest: `c463d8810becf96e55d4d4c4f7dfdf78725aef4209f7d39a5c414f03f061e479`

This later export supplements—and does not replace—the frozen Version 5 sample in [`/evidence`](../../evidence/).

## Verify

From this directory, run:

```bash
jq -S -c '.payload' POT-CMC-001-decision-bundle-2026-09-29.json \
  | tr -d '\n' \
  | sha256sum
```

Expected output:

```text
c463d8810becf96e55d4d4c4f7dfdf78725aef4209f7d39a5c414f03f061e479  -
```

A match demonstrates that the canonical payload reproduces the digest embedded in the bundle. Changing a payload field produces a different digest.

## Boundary

The exported artifact contains no CMC API credential, request headers, bearer token, or raw provider payload. The reviewer identity is explicitly marked as fictional demonstration data. The prototype does not prepare or execute a transaction.
