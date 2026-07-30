# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial public release of the Shieldwise Privacy Platform.
- Adaptive DPIA questionnaire engine with UK GDPR-aligned built-in template.
- Automated risk engine (20+ rules) mapped to UK GDPR articles and ICO/EDPB guidance.
- Control catalogue mapped to UK GDPR, EU GDPR, ISO 27001, ISO 27701, NIST CSF 2.0,
  NIST Privacy Framework, CIS v8, OWASP ASVS 4, SOC 2, PCI DSS 4, and HIPAA.
- AI privacy assistant (classification, chat, answer improvement, executive summaries)
  with RAG grounding over UK GDPR/ICO guidance, multi-provider support (Anthropic/OpenAI/local).
- Interactive drag-and-drop data flow modeller with automated cross-border transfer
  and trust-boundary detection.
- Full authentication stack: password + MFA (TOTP), WebAuthn passkeys, OIDC SSO, API tokens.
- Multi-tenant organisation/department/team/project hierarchy with RBAC.
- Immutable audit trail and append-only workflow history.
- Report generation in PDF, DOCX, HTML, Markdown, CSV, and JSON.
- Article 36 prior consultation flag when residual risk remains HIGH/CRITICAL.
- Sample biometric DPIA Word export in `sample_outputs/example_dpia.docx`.
- Plain-English DPIA guide (`docs/DPIA_GUIDE.md`).
- Executive dashboard with KPIs, risk heat map, and trend analysis.
- Docker Compose for local deployment.
- CI/CD pipeline: lint, typecheck, unit/integration tests, SAST (CodeQL), secret
  scanning (Gitleaks), dependency scanning, container scanning (Trivy), signed
  images (cosign), SBOM generation (CycloneDX).

[Unreleased]: https://github.com/Abosede-o-Makinde/dpia-generator/compare/main...HEAD
