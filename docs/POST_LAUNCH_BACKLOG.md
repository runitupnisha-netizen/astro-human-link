# Post-Launch Backlog

## v1.1 — Hardening (first post-launch update)

### IAP receipt JWS x5c signature-chain verification
- **File**: `supabase/functions/verify-apple-iap/index.ts`
- **Current state (v1)**: We decode the JWS *payload* segment only (middle of the
  `.`-separated token). The transport itself is HTTPS to Apple, so the response is
  trustworthy in transit, but we are NOT cryptographically validating the JWS
  signature against Apple's x5c certificate chain.
- **Risk accepted for v1**: A forged JWS submitted directly to our edge function
  would be accepted as long as the payload shape is valid. Mitigated for launch
  by (a) the original_transaction_id uniqueness constraint on
  `iap_subscriptions`, and (b) the fact that we re-fetch from Apple's server
  using the transaction ID before granting entitlements — so a forged payload
  pointing at a real transaction still requires Apple to confirm it.
- **v1.1 work**: implement full JWS verification
  1. Parse the x5c header chain.
  2. Validate the leaf cert's issuer chains up to Apple's root CA
     (`AppleRootCA-G3.cer`, bundle in the function).
  3. Verify the JWS signature using the leaf cert's public key (ES256).
  4. Reject any payload whose signature does not verify.
- **Reference**: https://developer.apple.com/documentation/appstoreserverapi/jwsdecodedheader
