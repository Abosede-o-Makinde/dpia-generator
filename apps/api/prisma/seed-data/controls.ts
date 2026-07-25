/**
 * Built-in control library with multi-framework mappings.
 * `effectiveness` is the default residual-risk reduction (0–1) applied when
 * the control is IMPLEMENTED; it can be overridden per risk link.
 */
export interface SeedControl {
  key: string;
  name: string;
  description: string;
  category: string;
  guidance: string;
  effectiveness: number;
  mappings: Array<{ framework: string; reference: string; title: string }>;
}

export const CONTROL_LIBRARY: SeedControl[] = [
  {
    key: 'enc-at-rest',
    name: 'Encryption at rest',
    description: 'All personal data stores encrypted with strong, managed keys.',
    category: 'technical',
    guidance:
      'Enable AES-256 (or provider-managed SSE-KMS) on databases, object storage and backups. Manage keys in a KMS/HSM with rotation and separation of duties.',
    effectiveness: 0.5,
    mappings: [
      {
        framework: 'UK_GDPR',
        reference: 'Art. 32(1)(a)',
        title: 'Security of processing — encryption',
      },
      { framework: 'ISO_27001', reference: 'A.8.24', title: 'Use of cryptography' },
      { framework: 'NIST_CSF_2', reference: 'PR.DS-01', title: 'Data-at-rest protection' },
      { framework: 'CIS_V8', reference: '3.11', title: 'Encrypt sensitive data at rest' },
      { framework: 'PCI_DSS_4', reference: '3.5', title: 'Protect stored account data' },
      { framework: 'HIPAA', reference: '164.312(a)(2)(iv)', title: 'Encryption and decryption' },
    ],
  },
  {
    key: 'enc-in-transit',
    name: 'Encryption in transit',
    description: 'TLS 1.2+ on every hop that carries personal data.',
    category: 'technical',
    guidance:
      'Terminate TLS 1.2+/1.3 with modern ciphers everywhere, including internal service-to-service links; enforce HSTS on web endpoints; disable plaintext fallbacks.',
    effectiveness: 0.5,
    mappings: [
      {
        framework: 'UK_GDPR',
        reference: 'Art. 32(1)(a)',
        title: 'Security of processing — encryption',
      },
      { framework: 'ISO_27001', reference: 'A.8.21', title: 'Security of network services' },
      { framework: 'NIST_CSF_2', reference: 'PR.DS-02', title: 'Data-in-transit protection' },
      { framework: 'OWASP_ASVS_4', reference: 'V9.1', title: 'Client communication security' },
    ],
  },
  {
    key: 'access-rbac',
    name: 'Role-based access control',
    description: 'Least-privilege, role-scoped access to personal data.',
    category: 'technical',
    guidance:
      'Define roles from job functions; deny by default; scope permissions to tenant + purpose; log all access decisions.',
    effectiveness: 0.45,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 32(1)(b)', title: 'Confidentiality of systems' },
      { framework: 'ISO_27001', reference: 'A.5.15', title: 'Access control' },
      {
        framework: 'NIST_CSF_2',
        reference: 'PR.AA-05',
        title: 'Access permissions and authorisations',
      },
      { framework: 'CIS_V8', reference: '6.8', title: 'Role-based access control' },
      { framework: 'SOC_2', reference: 'CC6.3', title: 'Logical access — least privilege' },
    ],
  },
  {
    key: 'mfa-enforcement',
    name: 'Multi-factor authentication',
    description: 'MFA required for all accounts with access to personal data.',
    category: 'technical',
    guidance:
      'Enforce phishing-resistant MFA (passkeys/FIDO2 preferred, TOTP acceptable) for all users; require step-up for admin actions.',
    effectiveness: 0.5,
    mappings: [
      { framework: 'ISO_27001', reference: 'A.5.17', title: 'Authentication information' },
      { framework: 'NIST_CSF_2', reference: 'PR.AA-03', title: 'Users are authenticated' },
      { framework: 'CIS_V8', reference: '6.5', title: 'Require MFA for administrative access' },
      { framework: 'OWASP_ASVS_4', reference: 'V2.8', title: 'One-time verifiers' },
    ],
  },
  {
    key: 'access-review',
    name: 'Periodic access reviews',
    description: 'Quarterly reviews of who can access personal data.',
    category: 'organisational',
    guidance:
      'Run quarterly recertification of access to systems holding personal data; auto-revoke on role change/leaver events.',
    effectiveness: 0.3,
    mappings: [
      { framework: 'ISO_27001', reference: 'A.5.18', title: 'Access rights' },
      { framework: 'SOC_2', reference: 'CC6.2', title: 'Access provisioning and removal' },
      { framework: 'CIS_V8', reference: '5.1', title: 'Account inventory' },
    ],
  },
  {
    key: 'minimisation',
    name: 'Data minimisation',
    description: 'Collect and keep only fields necessary for the purpose.',
    category: 'privacy',
    guidance:
      'Field-level justification review; drop or aggregate unused attributes; prefer derived signals over raw data.',
    effectiveness: 0.4,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 5(1)(c)', title: 'Data minimisation principle' },
      { framework: 'ISO_27701', reference: '7.4.1', title: 'Limit collection' },
      { framework: 'NIST_PRIVACY', reference: 'CT.DM-P', title: 'Data minimisation management' },
    ],
  },
  {
    key: 'pseudonymisation',
    name: 'Pseudonymisation',
    description: 'Separate identifiers from content data wherever feasible.',
    category: 'privacy',
    guidance:
      'Tokenise direct identifiers; keep the mapping table in a separate, more tightly-controlled store; use per-tenant salts.',
    effectiveness: 0.4,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 32(1)(a)', title: 'Pseudonymisation' },
      { framework: 'UK_GDPR', reference: 'Art. 25(1)', title: 'Data protection by design' },
      { framework: 'ISO_27701', reference: '8.4.1', title: 'PII de-identification' },
    ],
  },
  {
    key: 'audit-logging',
    name: 'Audit logging',
    description: 'Immutable audit trail of access to and changes of personal data.',
    category: 'technical',
    guidance:
      'Log actor, action, entity, timestamp, origin; make the trail append-only; retain per policy; alert on anomalous access.',
    effectiveness: 0.3,
    mappings: [
      { framework: 'ISO_27001', reference: 'A.8.15', title: 'Logging' },
      { framework: 'NIST_CSF_2', reference: 'DE.CM-01', title: 'Networks and services monitored' },
      { framework: 'SOC_2', reference: 'CC7.2', title: 'Monitoring of controls' },
      { framework: 'HIPAA', reference: '164.312(b)', title: 'Audit controls' },
    ],
  },
  {
    key: 'incident-response',
    name: 'Incident response & breach notification',
    description: 'Tested plan meeting the 72-hour ICO notification duty.',
    category: 'organisational',
    guidance:
      'Maintain an IR runbook with severity matrix, DPO escalation, ICO 72-hour notification decision tree (Art. 33) and subject notification criteria (Art. 34); exercise twice a year.',
    effectiveness: 0.25,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 33', title: 'Notification of breach to the ICO' },
      { framework: 'ISO_27001', reference: 'A.5.24', title: 'Incident management planning' },
      { framework: 'NIST_CSF_2', reference: 'RS.MA-01', title: 'Incident response plan executed' },
      { framework: 'CIS_V8', reference: '17.1', title: 'Incident response process' },
    ],
  },
  {
    key: 'retention-schedule',
    name: 'Retention schedule & automated deletion',
    description: 'Defined retention with enforced deletion/anonymisation.',
    category: 'privacy',
    guidance:
      'Publish a retention schedule per data category; implement automated TTL deletion jobs; log deletions to the audit trail.',
    effectiveness: 0.4,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 5(1)(e)', title: 'Storage limitation' },
      { framework: 'ISO_27701', reference: '7.4.7', title: 'Retention' },
      { framework: 'NIST_PRIVACY', reference: 'CT.DM-P4', title: 'Data destruction' },
    ],
  },
  {
    key: 'dsar-workflow',
    name: 'Data subject rights workflow',
    description: 'Tracked handling of access/erasure/objection requests.',
    category: 'organisational',
    guidance:
      'Central intake, identity verification, one-month clock with extension logic, response templates and appeal route.',
    effectiveness: 0.5,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 12–23', title: 'Data subject rights' },
      { framework: 'ISO_27701', reference: '7.3', title: 'Obligations to PII principals' },
      { framework: 'NIST_PRIVACY', reference: 'CT.PO-P2', title: 'Data subject requests' },
    ],
  },
  {
    key: 'privacy-notice',
    name: 'Layered privacy notice',
    description: 'Art. 13/14 information delivered at the point of collection.',
    category: 'privacy',
    guidance:
      'Layered notice: headline purposes at collection, full notice one click away; cover recipients, retention, rights, transfers; version and date it.',
    effectiveness: 0.5,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 13', title: 'Information at collection' },
      { framework: 'UK_GDPR', reference: 'Art. 14', title: 'Information — indirect collection' },
      { framework: 'NIST_PRIVACY', reference: 'CM.AW-P1', title: 'Transparency mechanisms' },
    ],
  },
  {
    key: 'age-verification',
    name: 'Age assurance',
    description: 'Proportionate age verification and parental consent flow.',
    category: 'privacy',
    guidance:
      "Risk-based age assurance per the Children's Code; parental consent for under-13s where consent is the basis (Art. 8); child-appropriate language.",
    effectiveness: 0.45,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 8', title: "Child's consent conditions" },
      { framework: 'EU_GDPR', reference: 'Art. 8', title: "Child's consent conditions" },
    ],
  },
  {
    key: 'consent-management',
    name: 'Consent management platform',
    description: 'Granular, withdrawable, evidenced consent records.',
    category: 'privacy',
    guidance:
      'Per-purpose opt-ins, no pre-ticked boxes, withdrawal as easy as giving, immutable consent receipts.',
    effectiveness: 0.45,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 7', title: 'Conditions for consent' },
      { framework: 'ISO_27701', reference: '7.2.3', title: 'Obtain and record consent' },
    ],
  },
  {
    key: 'lia-assessment',
    name: 'Legitimate interests assessment',
    description: 'Documented three-part LIA with review date.',
    category: 'organisational',
    guidance:
      'Purpose test, necessity test, balancing test; record outcome and safeguards; link to the right-to-object handling path.',
    effectiveness: 0.35,
    mappings: [{ framework: 'UK_GDPR', reference: 'Art. 6(1)(f)', title: 'Legitimate interests' }],
  },
  {
    key: 'dpa-execution',
    name: 'Processor agreements (Art. 28)',
    description: 'Signed DPAs with all processors covering Art. 28(3) terms.',
    category: 'organisational',
    guidance:
      'Standard DPA template with sub-processor flow-down, audit rights, breach notice SLAs, deletion at end of contract.',
    effectiveness: 0.4,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 28(3)', title: 'Processing contract terms' },
      { framework: 'ISO_27701', reference: '8.2.4', title: 'Processor agreements' },
      { framework: 'SOC_2', reference: 'CC9.2', title: 'Vendor risk management' },
    ],
  },
  {
    key: 'vendor-assessment',
    name: 'Vendor security & privacy assessment',
    description: 'Due diligence before and during processor relationships.',
    category: 'organisational',
    guidance:
      'Assess certifications (ISO 27001/27701, SOC 2), sub-processor lists, breach history and data locations; re-assess annually.',
    effectiveness: 0.3,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 28(1)', title: 'Sufficient guarantees' },
      { framework: 'ISO_27001', reference: 'A.5.19', title: 'Supplier relationships' },
      { framework: 'NIST_CSF_2', reference: 'GV.SC-06', title: 'Supplier due diligence' },
    ],
  },
  {
    key: 'idta-scc',
    name: 'IDTA / SCC + UK Addendum',
    description: 'Valid Art. 46 safeguard for restricted transfers.',
    category: 'organisational',
    guidance:
      'Execute the ICO IDTA or EU SCCs with the UK Addendum for each restricted transfer; map every recipient country.',
    effectiveness: 0.45,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 46', title: 'Appropriate safeguards' },
      { framework: 'EU_GDPR', reference: 'Art. 46', title: 'Appropriate safeguards' },
    ],
  },
  {
    key: 'transfer-risk-assessment',
    name: 'Transfer risk assessment',
    description: 'TRA covering destination-country law and practice.',
    category: 'organisational',
    guidance:
      'Use the ICO TRA tool or EDPB 6-step approach: assess local surveillance law, contract enforceability and supplementary measures.',
    effectiveness: 0.3,
    mappings: [{ framework: 'UK_GDPR', reference: 'Art. 44', title: 'General transfer principle' }],
  },
  {
    key: 'human-review',
    name: 'Meaningful human review',
    description: 'Human-in-the-loop for significant automated decisions.',
    category: 'ai',
    guidance:
      'Reviewers must have authority and information to change the outcome; measure override rates; provide contest mechanism to subjects.',
    effectiveness: 0.5,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 22(3)', title: 'Right to human intervention' },
      { framework: 'NIST_PRIVACY', reference: 'CT.PO-P', title: 'Policies for data processing' },
    ],
  },
  {
    key: 'ai-transparency',
    name: 'AI transparency measures',
    description: 'Subjects told when AI is used and how it affects them.',
    category: 'ai',
    guidance:
      'Explain AI involvement in privacy notices; provide meaningful logic explanation for decisions; label AI-generated content.',
    effectiveness: 0.35,
    mappings: [
      {
        framework: 'UK_GDPR',
        reference: 'Art. 13(2)(f)',
        title: 'Automated decision-making information',
      },
      { framework: 'UK_GDPR', reference: 'Art. 5(1)(a)', title: 'Transparency principle' },
    ],
  },
  {
    key: 'model-documentation',
    name: 'Model documentation (model cards)',
    description: 'Documented purpose, data, limitations and evaluation of each model.',
    category: 'ai',
    guidance:
      'Maintain model cards: intended use, training data provenance, evaluation metrics, known failure modes, review cadence.',
    effectiveness: 0.25,
    mappings: [
      { framework: 'ISO_27701', reference: '7.2.8', title: 'Records of processing' },
      { framework: 'NIST_PRIVACY', reference: 'ID.IM-P', title: 'Inventory and mapping' },
    ],
  },
  {
    key: 'bias-testing',
    name: 'Bias and fairness testing',
    description: 'Pre-deployment and ongoing fairness evaluation.',
    category: 'ai',
    guidance:
      'Test outcomes across protected characteristics; set fairness thresholds; monitor drift in production; document remediation.',
    effectiveness: 0.35,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 5(1)(a)', title: 'Fairness principle' },
      { framework: 'UK_GDPR', reference: 'Recital 71', title: 'Discriminatory effects prevention' },
    ],
  },
  {
    key: 'dpia-review',
    name: 'Periodic DPIA review',
    description: 'Scheduled re-assessment when risk or scope changes.',
    category: 'organisational',
    guidance:
      'Review at least annually and on material change (new data categories, new recipients, new tech); track in the platform workflow.',
    effectiveness: 0.2,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 35(11)', title: 'DPIA review' },
      { framework: 'ISO_27701', reference: '7.2.5', title: 'Privacy impact assessment' },
    ],
  },
  {
    key: 'signage-transparency',
    name: 'Monitoring signage & transparency',
    description: 'Clear notification where monitoring takes place.',
    category: 'privacy',
    guidance:
      'Prominent signage for CCTV/monitoring zones, contact details, purpose statement; publish a monitoring policy.',
    effectiveness: 0.3,
    mappings: [{ framework: 'UK_GDPR', reference: 'Art. 13', title: 'Information at collection' }],
  },
  {
    key: 'network-segmentation',
    name: 'Network segmentation',
    description: 'Personal data systems isolated in restricted zones.',
    category: 'technical',
    guidance:
      'Segment by trust zone; default-deny between zones; place data stores in private subnets with no direct internet path.',
    effectiveness: 0.35,
    mappings: [
      { framework: 'ISO_27001', reference: 'A.8.22', title: 'Segregation of networks' },
      { framework: 'CIS_V8', reference: '12.2', title: 'Secure network architecture' },
      { framework: 'PCI_DSS_4', reference: '1.3', title: 'Network access restriction' },
    ],
  },
  {
    key: 'security-testing',
    name: 'Security testing programme',
    description: 'Regular penetration tests and continuous scanning.',
    category: 'technical',
    guidance:
      'Annual pentest of systems processing personal data plus continuous dependency/container scanning; track findings to closure.',
    effectiveness: 0.3,
    mappings: [
      { framework: 'UK_GDPR', reference: 'Art. 32(1)(d)', title: 'Testing and evaluation' },
      { framework: 'ISO_27001', reference: 'A.8.29', title: 'Security testing' },
      { framework: 'OWASP_ASVS_4', reference: 'V1.1', title: 'Secure SDLC' },
      { framework: 'SOC_2', reference: 'CC4.1', title: 'Monitoring activities' },
    ],
  },
];
