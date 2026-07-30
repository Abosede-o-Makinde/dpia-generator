# Compliance Framework Mapping

## Methodology

Every entry in the built-in control catalogue
(`apps/api/prisma/seed-data/controls.ts`) carries zero or more
`ControlMapping` rows, each pointing at a specific requirement in a named
framework — never a bare framework name with no reference. "Encryption at
rest" maps to `UK_GDPR Art. 32(1)(a)`, `ISO_27001 A.8.24`, `NIST_CSF_2
PR.DS-01`, `CIS_V8 3.11`, `PCI_DSS_4 3.5`, and `HIPAA 164.312(a)(2)(iv)` —
five independently-citable mappings for one control, because that is what
lets `ControlsService.complianceSummary()` answer "what fraction of our ISO
27001 Annex A controls are evidenced" without a separate data model per
framework.

A control counts as **implemented** against a framework if it is linked,
with `status = IMPLEMENTED`, to at least one Risk or DPIA in the
organisation (`ControlsService.complianceSummary()`). A control that exists
in the catalogue but has never been applied anywhere counts as a **gap** for
every framework it maps to.

## Supported frameworks (v1)

| Framework              | Enum value     | Coverage in built-in catalogue                                                                                 |
| ---------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| UK GDPR                | `UK_GDPR`      | Primary — every article referenced by a risk rule or control is UK GDPR first                                  |
| EU GDPR                | `EU_GDPR`      | Mapped where the article numbering is identical to UK GDPR (the substantive overlap is near-total post-Brexit) |
| ISO/IEC 27001:2022     | `ISO_27001`    | Annex A controls referenced by ID (e.g. `A.8.24`)                                                              |
| ISO/IEC 27701:2019     | `ISO_27701`    | Privacy-specific extension controls                                                                            |
| NIST CSF 2.0           | `NIST_CSF_2`   | Subcategory references (e.g. `PR.DS-01`)                                                                       |
| NIST Privacy Framework | `NIST_PRIVACY` | Function/category references                                                                                   |
| CIS Controls v8        | `CIS_V8`       | Safeguard references (e.g. `3.11`)                                                                             |
| OWASP ASVS 4.0         | `OWASP_ASVS_4` | Verification requirement references                                                                            |
| SOC 2                  | `SOC_2`        | Trust Services Criteria references (e.g. `CC6.3`)                                                              |
| PCI DSS 4.0            | `PCI_DSS_4`    | Requirement references                                                                                         |
| HIPAA                  | `HIPAA`        | Security Rule citations (e.g. `164.312(b)`)                                                                    |

## How coverage is computed

```
GET /v1/controls/compliance-summary
```

returns, per framework: `mappedControls` (catalogue size for that
framework), `implementedControls` (how many of those are actually linked and
implemented in this organisation), `coverage` (percentage), and up to 20
named `gaps`. The dashboard surfaces this as one card per framework; drilling
into a framework shows the specific gap list so a CISO can prioritise which
control to implement next for the biggest coverage gain.

## Extending the mapping

Framework mappings are seed data, not hardcoded logic — adding a new
framework means adding `ControlMapping` rows (via the seed script or a
future admin UI) referencing a new `FrameworkId` enum value in
`packages/shared/src/enums.ts`. No code in `ControlsService` needs to change;
`complianceSummary()` iterates `FRAMEWORKS` generically. This is why
`FRAMEWORKS` is a plain string array rather than a hardcoded switch — the
addition of, say, DORA or the EU AI Act as a mapped framework is purely a
data change, reviewed under the same "cite your source" bar as any other
privacy-domain content (see `CONTRIBUTING.md`).

## Relationship to the risk engine

Risk rules recommend controls by key (`recommendedControls: ['enc-at-rest',
'access-review']` — see `apps/api/src/modules/risks/risk-rules.ts`). When a
risk fires, its recommended controls are automatically linked
(`RiskControl`, status `RECOMMENDED`) — this is what seeds the compliance
dashboard's gap list with organisation-specific, risk-derived
recommendations rather than a generic checklist disconnected from what the
organisation actually does.
