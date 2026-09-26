# Proof of Trust — Live CMC Capture Milestone

**Milestone:** POT-CMC-M001  
**Date:** 2026-09-23  
**Project:** Proof of Trust — CMC Review  
**Site:** https://proof-of-trust-cmc-review.garth-rt-smith.chatgpt.site

## Achievement

The prototype completed its first successful governed capture of live CoinMarketCap evidence.

The Site called CoinMarketCap from the server-side credential boundary, received complete responses, validated the expected schemas, and admitted the resulting records into the evidence ledger. The capture receipt recorded the endpoints, HTTP status, schema outcome, and capture time without exposing the API credential, request headers, or raw provider payloads.

## Evidence admitted

- `CMC /v2/cryptocurrency/quotes/latest` — HTTP 200, schema complete
- `CMC /v1/global-metrics/quotes/latest` — HTTP 200, schema complete
- BTC market quote and global market metrics refreshed from the admitted live capture
- Site-displayed capture timestamp: `23/09/2026, 10:57:34`

The displayed snapshot included a BTC quote of approximately **$83,908.68**, a 24-hour change of **−3.02%**, total market capitalization of approximately **$2.85T**, and BTC dominance of approximately **59.11%**.

## Governance behavior verified

- The CoinMarketCap credential remained stored as a Site secret and was not exposed to the browser.
- An earlier incomplete response was correctly rejected; no partial or failed response was admitted and the labelled demo fixture remained in place.
- The successful response was admitted only after endpoint and schema checks passed.
- Live market evidence did not override the unresolved counterparty-exposure requirement.
- The case remained **DEFERRED**.
- Identity verification remained distinct from mandate and scope.
- Human authorization remained mandatory; automation could not transition the case to **AUTHORIZED**.

## Why this matters

The system did more than display live market data. It proved the complete control sequence:

1. protect the credential;
2. request live evidence server-side;
3. reject an incomplete response safely;
4. validate a complete response;
5. admit only verified evidence;
6. preserve unresolved requirements; and
7. refuse to convert valid data into an unauthorized decision.

This marks the transition from a governed demonstration fixture to a working governed-evidence prototype.

## Frozen boundary

This milestone records the observed behavior above. It does not expand the project's authority boundary:

- no transaction execution;
- no financial advice;
- no autonomous authorization;
- no credential or raw-provider-payload retention in this record; and
- no substitution of calculation quality for evidence, mandate, or scope.

## Onward build phase

Next, develop the **Claim Review** layer:

- classify claims as **Observed**, **Derived**, **Interpreted**, or **Unresolved**;
- bind each admitted claim to its evidence record and capture receipt;
- preserve provenance and timestamps;
- prevent interpreted or unresolved claims from masquerading as observed facts; and
- generate an integrity-verifiable decision bundle while keeping human authorization as the final gate.

---

**Status:** Marked and preserved. Proceed from this milestone onward.  
**Security note:** No API key or secret value is contained in this record.
