# DPIA Guide — When and How to Conduct a Data Protection Impact Assessment

A plain-English guide to UK GDPR Article 35 DPIAs. Use this alongside
[`HOWTO.md`](../HOWTO.md) and the [ICO DPIA guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/).

## What a DPIA is

A Data Protection Impact Assessment is a structured way to:

1. Describe a proposed processing activity
2. Assess necessity and proportionality
3. Identify risks to people
4. Decide what safeguards reduce those risks
5. Record who approved the decision and when to review it again

It is an accountability record, not a formality. The goal is a defensible
decision you can explain to a DPO, auditor, board, or the ICO.

## When a DPIA is required

Under **Article 35**, you must carry out a DPIA when processing is **likely
to result in a high risk** to individuals.

### Always-required categories (Article 35(3))

A DPIA is required where you systematically and extensively:

- evaluate people based on automated processing, including profiling, and
  make decisions with legal or similarly significant effects
- process special category data or criminal offence data on a large scale
- systematically monitor a publicly accessible area on a large scale

### ICO screening triggers

The ICO also expects a DPIA (or at least serious consideration of one) for
processing that involves, for example:

- innovative technology
- biometric or genetic data
- large-scale profiling or data matching
- tracking individuals
- invisible processing (data not obtained from the individual)
- targeting children or other vulnerable people
- denial of service / exclusion risk
- risk of physical harm

**Rule of thumb:** if two or more screening criteria apply, treat a DPIA as
required. A single serious criterion can still trigger one.

Shieldwise’s AI screening returns `REQUIRED`, `RECOMMENDED`, or
`NOT_REQUIRED` against these criteria, with cited rationale. A human must
still confirm the decision.

## What a good DPIA covers

| Area | Questions to answer |
| ---- | ------------------- |
| Purpose | Why are you processing this data? |
| Necessity | Can you achieve the purpose with less data or a less intrusive method? |
| People | Who is affected, including children or vulnerable groups? |
| Data | What categories? Special category? Biometric? |
| Flow | Where does data move — systems, vendors, countries? |
| Risks | What could go wrong for people, and how severe is it? |
| Controls | What safeguards reduce likelihood or impact? |
| Residual risk | Is remaining risk acceptable? |
| Consultation | Do you need to consult the ICO under Article 36? |
| Review | When will you revisit this if the processing changes? |

## Article 36 — prior consultation

If, **after** applying planned measures, residual risk remains **high**,
you must consult the ICO before starting the processing (Article 36).

In Shieldwise, prior consultation is flagged when any open residual risk is
still scored **HIGH** or **CRITICAL**. That is a decision support signal —
your DPO and legal team decide whether consultation is required in context.

## How to run a DPIA in Shieldwise

1. **Screen** the processing description (AI classification helps).
2. **Create** a DPIA from the UK GDPR template.
3. **Answer** the adaptive questionnaire (autosaves).
4. **Model** the data flow where systems and vendors matter.
5. **Submit** for review — the risk engine scores inherent and residual risk.
6. **Link controls and evidence** so residual scores update.
7. **Approve** through the workflow and **export** PDF/DOCX for the record.
8. **Monitor** and set a next review date.

## Worked example: biometric office access

See the README section
[Example: biometric access control DPIA](../README.md#example-biometric-access-control-dpia)
and the completed sample at
[`sample_outputs/example_dpia.docx`](../sample_outputs/example_dpia.docx).

That example covers facial recognition for building access: special category
biometric data, Article 9 condition, necessity/proportionality, residual
risk after controls, and whether Article 36 consultation is flagged.

## What Shieldwise does *not* replace

- Your organisation’s legal advice
- DPO judgement and consultation duties
- Policy decisions on risk appetite
- Human confirmation of lawful basis and Article 9 conditions

Shieldwise structures the assessment, scores risks consistently, and keeps
evidence connected. Accountability stays with the controller.
