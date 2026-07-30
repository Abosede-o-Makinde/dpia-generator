# ADR 0005: Layered authentication (password+MFA, passkeys, OIDC, PATs) with refresh-token rotation

## Status

Accepted

## Context

Enterprise privacy tooling is used by security-conscious organisations that
expect modern authentication options (SSO, phishing-resistant MFA) while
smaller deployers need self-service signup with strong-but-simple defaults.

## Decision

Four authentication paths converge on the same session-issuance code path
(`AuthService.issueLogin`/`issueTokens`): password + optional TOTP MFA,
WebAuthn passkeys, generic OIDC SSO (works with Keycloak, Entra ID, Okta,
Google — any spec-compliant IdP, not provider-specific integrations), and
personal API tokens for machine-to-machine use. Refresh tokens rotate on
every use, tracked by a `familyId`; replaying an already-rotated or expired
token revokes the entire session family, not just the one token.

## Rationale

- **One OIDC integration, not four.** Rather than writing separate
  Keycloak/Entra ID/Okta/Google integrations, `SsoService` implements the
  OIDC spec generically (discovery document, authorization code exchange,
  ID token verification via JWKS) — any compliant IdP works without
  Shieldwise-side code changes, which is both less code to maintain and avoids
  vendor lock-in for the deployer's identity provider choice.
- **Refresh-token rotation with reuse detection** is a stronger posture than
  long-lived refresh tokens: a stolen-and-later-reused refresh token (the
  classic token-theft signature) triggers full session-family revocation
  rather than silently continuing to honour the thief's copy.
- **NIST SP 800-63B-aligned password policy** — length-first (minimum 12
  characters), no composition rules (no forced special-character/uppercase
  rules), reflecting current guidance that composition rules push users
  toward predictable patterns without improving actual entropy.
- **Passkeys and MFA are both offered, not one instead of the other** —
  passkeys are the stronger, phishing-resistant option, but TOTP MFA remains
  necessary for users on shared/managed devices where a platform passkey
  isn't practical, or during the transition period before an organisation
  has rolled out passkeys org-wide.

## Consequences

- `AuthService` is the single place session issuance logic lives — every
  new auth method (there will likely be more; SCIM-provisioned SSO is on
  the roadmap) should call into it rather than reimplementing token
  issuance, keeping the rotation/family-revocation guarantee uniform across
  all entry points.
- The WebAuthn challenge store is in-process (documented limitation, see
  the threat model's residual risks) — acceptable for the reference
  deployment's single-replica default, flagged for anyone scaling the API
  horizontally.
- API tokens are scoped (`read`/`write`/`admin`) but the scope enforcement
  is currently informational on the token record — routes do not yet check
  `tokenScopes` against required scope per-endpoint. Tracked as a near-term
  hardening item now that the token issuance and storage model is in place.
