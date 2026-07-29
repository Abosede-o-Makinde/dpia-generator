import { riskRuleSchema, type RiskRule } from '@shieldwise/shared';

/**
 * Built-in risk rule library.
 *
 * Rules match on the DPIA fact map: raw answers (by question key), tags
 * emitted by selected options (`tags`), data-flow analysis tags and AI
 * classification facts (`classification.*`). Deployments can extend/override
 * via org settings (roadmap: DB-backed rule editor).
 */
const RULES: unknown[] = [
  {
    key: 'special-category-processing',
    title: 'Special category data processing',
    description:
      'The activity processes Article 9 special category data. An Article 9(2) condition and, where required (DPA 2018 Sch.1), an Appropriate Policy Document are needed alongside heightened technical safeguards.',
    condition: { q: 'tags', op: 'includes', value: 'tag:special-category' },
    likelihood: 3,
    impact: 4,
    modifiers: ['specialCategory'],
    references: ['UK GDPR Art. 9', 'DPA 2018 Sch. 1', 'ICO special category guidance'],
    recommendedControls: ['enc-at-rest', 'access-rbac', 'minimisation', 'audit-logging'],
    category: 'privacy',
  },
  {
    key: 'large-scale-special-category',
    title: 'Large-scale processing of special category data',
    description:
      'Large-scale special category processing is a mandatory DPIA trigger and materially increases the impact of any breach.',
    condition: {
      all: [
        { q: 'tags', op: 'includes', value: 'tag:special-category' },
        { q: 'tags', op: 'includes', value: 'tag:large-scale' },
      ],
    },
    likelihood: 3,
    impact: 5,
    modifiers: ['specialCategory', 'largeScale'],
    references: ['UK GDPR Art. 35(3)(b)', 'EDPB WP248 rev.01'],
    recommendedControls: ['enc-at-rest', 'pseudonymisation', 'access-rbac', 'incident-response'],
    category: 'privacy',
  },
  {
    key: 'children-data',
    title: "Processing of children's data",
    description:
      "Children merit specific protection. Age-appropriate design, verification and child-friendly transparency are required (ICO Children's Code).",
    condition: {
      any: [
        { q: 'tags', op: 'includes', value: 'tag:children' },
        { q: 'children_subjects', op: 'eq', value: true },
        { q: 'classification.childrenData', op: 'eq', value: true },
      ],
    },
    likelihood: 3,
    impact: 4,
    modifiers: ['children'],
    references: ['UK GDPR Recital 38', "ICO Children's Code", 'UK GDPR Art. 8'],
    recommendedControls: ['age-verification', 'privacy-notice', 'minimisation'],
    category: 'privacy',
  },
  {
    key: 'criminal-offence-data',
    title: 'Criminal offence data processing',
    description:
      'Article 10 data requires official authority or a DPA 2018 Sch.1 condition, with strict access limitation.',
    condition: { q: 'tags', op: 'includes', value: 'tag:criminal' },
    likelihood: 2,
    impact: 4,
    modifiers: ['specialCategory'],
    references: ['UK GDPR Art. 10', 'DPA 2018 s.10'],
    recommendedControls: ['access-rbac', 'audit-logging', 'retention-schedule'],
    category: 'privacy',
  },
  {
    key: 'biometric-identification',
    title: 'Biometric identification',
    description:
      'Biometric data used for unique identification is special category data and typically irrevocable if breached; strong justification and safeguards are required.',
    condition: {
      any: [
        { q: 'tags', op: 'includes', value: 'tag:biometric' },
        { q: 'tags', op: 'includes', value: 'tag:facial-recognition' },
      ],
    },
    likelihood: 3,
    impact: 5,
    modifiers: ['specialCategory'],
    references: ['UK GDPR Art. 9(1)', 'ICO biometric guidance 2024'],
    recommendedControls: ['enc-at-rest', 'pseudonymisation', 'dpia-review', 'security-testing'],
    category: 'privacy',
  },
  {
    key: 'no-encryption-at-rest',
    title: 'Personal data stored without encryption at rest',
    description:
      'Unencrypted storage significantly raises breach impact and falls short of Art. 32 state-of-the-art expectations.',
    condition: { q: 'encryption_at_rest', op: 'eq', value: false },
    likelihood: 4,
    impact: 4,
    modifiers: [],
    references: ['UK GDPR Art. 32(1)(a)', 'ISO 27001 A.8.24'],
    recommendedControls: ['enc-at-rest'],
    category: 'security',
  },
  {
    key: 'no-encryption-in-transit',
    title: 'Personal data transmitted without encryption',
    description: 'Data in transit without TLS is exposed to interception and tampering.',
    condition: {
      any: [
        { q: 'encryption_in_transit', op: 'eq', value: false },
        { q: 'tags', op: 'includes', value: 'tag:unencrypted-transit' },
      ],
    },
    likelihood: 4,
    impact: 4,
    modifiers: ['internetExposed'],
    references: ['UK GDPR Art. 32', 'NIST CSF 2.0 PR.DS'],
    recommendedControls: ['enc-in-transit'],
    category: 'security',
  },
  {
    key: 'automated-decision-making',
    title: 'Solely automated decisions with significant effects',
    description:
      'Article 22 restricts solely automated decisions with legal or similarly significant effects; meaningful human review and contestability are required.',
    condition: { q: 'automated_decisions', op: 'eq', value: true },
    likelihood: 3,
    impact: 4,
    modifiers: ['automatedDecisions'],
    references: ['UK GDPR Art. 22', 'UK GDPR Art. 35(3)(a)', 'ICO AI guidance'],
    recommendedControls: ['human-review', 'ai-transparency', 'model-documentation'],
    category: 'ai',
  },
  {
    key: 'ai-processing',
    title: 'AI/ML processing of personal data',
    description:
      'AI systems introduce fairness, accuracy, transparency and drift risks; statistical accuracy and bias testing must be evidenced.',
    condition: {
      any: [
        { q: 'uses_ai', op: 'eq', value: true },
        { q: 'classification.aiProcessing', op: 'eq', value: true },
      ],
    },
    likelihood: 3,
    impact: 3,
    modifiers: [],
    references: ['ICO AI & data protection guidance', 'UK GDPR Art. 5(1)(a)'],
    recommendedControls: ['ai-transparency', 'model-documentation', 'bias-testing'],
    category: 'ai',
  },
  {
    key: 'transfer-without-mechanism',
    title: 'Restricted international transfer without a valid mechanism',
    description:
      'Transfers outside the UK without adequacy or an Art. 46 safeguard (IDTA/Addendum) are unlawful; a transfer risk assessment is also required.',
    condition: {
      any: [
        {
          all: [
            { q: 'international_transfers', op: 'eq', value: true },
            { q: 'transfer_mechanism', op: 'in', value: ['NONE', undefined, null, ''] },
          ],
        },
        { q: 'tags', op: 'includes', value: 'tag:restricted-transfer' },
      ],
    },
    likelihood: 4,
    impact: 4,
    modifiers: ['crossBorder'],
    references: ['UK GDPR Art. 44–49', 'ICO IDTA guidance'],
    recommendedControls: ['idta-scc', 'transfer-risk-assessment'],
    category: 'privacy',
  },
  {
    key: 'processor-without-dpa',
    title: 'Third-party processor without a data processing agreement',
    description:
      'Using a processor without an Art. 28(3) contract is a direct compliance breach and removes contractual safeguards.',
    condition: {
      all: [
        { q: 'third_party_processors', op: 'eq', value: true },
        { q: 'dpa_in_place', op: 'eq', value: false },
      ],
    },
    likelihood: 4,
    impact: 4,
    modifiers: [],
    references: ['UK GDPR Art. 28(3)'],
    recommendedControls: ['dpa-execution', 'vendor-assessment'],
    category: 'privacy',
  },
  {
    key: 'third-party-processing',
    title: 'Third-party processors in the pipeline',
    description:
      'Processor onboarding requires due diligence, contractual controls and ongoing assurance.',
    condition: {
      any: [
        { q: 'third_party_processors', op: 'eq', value: true },
        { q: 'tags', op: 'includes', value: 'tag:third-party-processor' },
      ],
    },
    likelihood: 2,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Art. 28', 'ISO 27701 8.2'],
    recommendedControls: ['vendor-assessment', 'dpa-execution'],
    category: 'privacy',
  },
  {
    key: 'sensitive-data-to-processor',
    title: 'Sensitive data flowing to a third party',
    description:
      'The data-flow model shows special category or high-sensitivity data reaching an external processor; verify minimisation and processor guarantees.',
    condition: { q: 'tags', op: 'includes', value: 'tag:sensitive-to-processor' },
    likelihood: 3,
    impact: 4,
    modifiers: ['specialCategory'],
    references: ['UK GDPR Art. 28(1)', 'UK GDPR Art. 5(1)(c)'],
    recommendedControls: ['minimisation', 'vendor-assessment', 'enc-in-transit'],
    category: 'privacy',
  },
  {
    key: 'indefinite-retention',
    title: 'No defined retention limit',
    description:
      'Storage limitation requires defined, justified retention periods with deletion or anonymisation at expiry.',
    condition: { q: 'tags', op: 'includes', value: 'tag:indefinite-retention' },
    likelihood: 3,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Art. 5(1)(e)'],
    recommendedControls: ['retention-schedule', 'minimisation'],
    category: 'privacy',
  },
  {
    key: 'weak-access-control',
    title: 'Inadequate access control',
    description:
      'No role-based restriction or MFA on systems holding personal data enables both external compromise and insider misuse.',
    condition: { q: 'tags', op: 'includes', value: 'tag:weak-access' },
    likelihood: 4,
    impact: 4,
    modifiers: [],
    references: ['UK GDPR Art. 32', 'CIS Control 6', 'OWASP ASVS V4'],
    recommendedControls: ['access-rbac', 'mfa-enforcement', 'access-review'],
    category: 'security',
  },
  {
    key: 'no-dsar-process',
    title: 'No data subject rights procedure',
    description:
      'Without a DSAR workflow the one-month statutory deadline (Art. 12(3)) is unlikely to be met.',
    condition: { q: 'dsar_process', op: 'eq', value: false },
    likelihood: 3,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Art. 12–23'],
    recommendedControls: ['dsar-workflow'],
    category: 'privacy',
  },
  {
    key: 'no-privacy-notice',
    title: 'Missing or inadequate privacy information',
    description:
      'Data subjects must receive Art. 13/14 information at collection; absence undermines the lawful basis and transparency principle.',
    condition: { q: 'privacy_notice', op: 'eq', value: false },
    likelihood: 4,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Art. 13', 'UK GDPR Art. 14'],
    recommendedControls: ['privacy-notice'],
    category: 'privacy',
  },
  {
    key: 'systematic-public-monitoring',
    title: 'Systematic monitoring of publicly accessible areas',
    description:
      'Large-scale systematic monitoring of public areas is a mandatory DPIA trigger with high intrusion potential.',
    condition: { q: 'public_monitoring', op: 'eq', value: true },
    likelihood: 3,
    impact: 4,
    modifiers: ['largeScale'],
    references: ['UK GDPR Art. 35(3)(c)', 'ICO CCTV guidance'],
    recommendedControls: ['dpia-review', 'signage-transparency', 'retention-schedule'],
    category: 'privacy',
  },
  {
    key: 'scraped-or-public-data',
    title: 'Data collected by scraping / from public sources',
    description:
      'Invisible processing of publicly sourced data raises Art. 14 transparency and lawful-basis risks (ICO/EDPB scraping positions).',
    condition: { q: 'tags', op: 'includes', value: 'tag:scraped-data' },
    likelihood: 3,
    impact: 4,
    modifiers: [],
    references: ['UK GDPR Art. 14', 'ICO data scraping joint statement 2023'],
    recommendedControls: ['lia-assessment', 'privacy-notice', 'minimisation'],
    category: 'privacy',
  },
  {
    key: 'tracking-profiling',
    title: 'Behavioural tracking / profiling',
    description:
      'Tracking technologies require PECR-compliant consent and fair profiling logic disclosure.',
    condition: { q: 'tags', op: 'includes', value: 'tag:tracking' },
    likelihood: 3,
    impact: 3,
    modifiers: [],
    references: ['PECR Reg. 6', 'UK GDPR Art. 21–22', 'ICO cookies guidance'],
    recommendedControls: ['consent-management', 'privacy-notice'],
    category: 'privacy',
  },
  {
    key: 'location-data',
    title: 'Location data processing',
    description:
      'Location traces are highly re-identifying and can reveal special category inferences (e.g. health visits, worship).',
    condition: { q: 'tags', op: 'includes', value: 'tag:location' },
    likelihood: 2,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Recital 51', 'EDPB Guidelines 01/2020'],
    recommendedControls: ['minimisation', 'pseudonymisation', 'retention-schedule'],
    category: 'privacy',
  },
  {
    key: 'legitimate-interests-basis',
    title: 'Reliance on legitimate interests',
    description:
      'Legitimate interests requires a documented three-part balancing test (LIA) and an effective right to object.',
    condition: { q: 'lawful_basis', op: 'eq', value: 'LEGITIMATE_INTERESTS' },
    likelihood: 2,
    impact: 3,
    modifiers: [],
    references: ['UK GDPR Art. 6(1)(f)', 'ICO legitimate interests guidance'],
    recommendedControls: ['lia-assessment'],
    category: 'privacy',
  },
  {
    key: 'trust-boundary-crossing',
    title: 'Data crosses trust boundaries',
    description:
      'Flows across trust zones need authenticated, encrypted channels and boundary controls.',
    condition: { q: 'tags', op: 'includes', value: 'tag:trust-boundary' },
    likelihood: 2,
    impact: 3,
    modifiers: [],
    references: ['NIST CSF 2.0 PR.AC', 'ISO 27001 A.8.20'],
    recommendedControls: ['enc-in-transit', 'network-segmentation'],
    category: 'security',
  },
];

export const RISK_RULES: RiskRule[] = RULES.map((r) => riskRuleSchema.parse(r));
