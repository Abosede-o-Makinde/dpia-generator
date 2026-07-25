import { z } from 'zod';
import { conditionSchema, evaluateCondition } from './conditions.js';
import type { RiskLevel } from './enums.js';

/**
 * Configurable risk scoring model.
 *
 * residual = likelihood × impact × Π(modifier weights) × (1 − controlEffectiveness)
 * then mapped onto LOW/MEDIUM/HIGH/CRITICAL via configurable thresholds.
 *
 * Likelihood & impact use a 1–5 scale (ISO 27005-style). Modifiers capture
 * sensitivity, scale and exploitability amplifiers as multipliers ≥ 1.
 */

export const riskScoringConfigSchema = z.object({
  /** score > threshold ⇒ that level. Evaluated highest-first. */
  thresholds: z.object({
    critical: z.number().positive().default(18),
    high: z.number().positive().default(11),
    medium: z.number().positive().default(5),
  }),
  // Note: no .partial() here — each field's own .default() already makes it
  // optional on input. Adding .partial() wraps each in ZodOptional *around*
  // the ZodDefault, and ZodOptional short-circuits on a missing key before
  // the default ever runs — silently zeroing out every modifier weight.
  modifierWeights: z
    .object({
      specialCategory: z.number().min(1).default(1.4),
      children: z.number().min(1).default(1.4),
      largeScale: z.number().min(1).default(1.25),
      crossBorder: z.number().min(1).default(1.15),
      internetExposed: z.number().min(1).default(1.2),
      automatedDecisions: z.number().min(1).default(1.3),
    })
    .default({}),
});
export type RiskScoringConfig = z.infer<typeof riskScoringConfigSchema>;

export const DEFAULT_SCORING_CONFIG: RiskScoringConfig = riskScoringConfigSchema.parse({
  thresholds: { critical: 18, high: 11, medium: 5 },
});

export const riskRuleSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  /** Fires when this condition matches the DPIA fact map. */
  condition: conditionSchema,
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  /** Modifier keys applied when the rule fires (keys of modifierWeights). */
  modifiers: z.array(z.string()).default([]),
  /** Article/recital/guidance references, e.g. "UK GDPR Art. 32". */
  references: z.array(z.string()).default([]),
  /** Control keys recommended when this risk fires. */
  recommendedControls: z.array(z.string()).default([]),
  category: z.string().default('privacy'),
});
export type RiskRule = z.infer<typeof riskRuleSchema>;

export interface ScoredRisk {
  ruleKey: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  level: RiskLevel;
  residualLevel: RiskLevel;
  modifiersApplied: string[];
  references: string[];
  recommendedControls: string[];
  category: string;
}

export function levelForScore(score: number, config: RiskScoringConfig): RiskLevel {
  if (score > config.thresholds.critical) return 'CRITICAL';
  if (score > config.thresholds.high) return 'HIGH';
  if (score > config.thresholds.medium) return 'MEDIUM';
  return 'LOW';
}

export function scoreRisk(
  rule: RiskRule,
  config: RiskScoringConfig,
  /** 0–1: aggregate effectiveness of controls already in place against this risk. */
  controlEffectiveness = 0,
): ScoredRisk {
  const weights = config.modifierWeights as Record<string, number | undefined>;
  const modifiersApplied = rule.modifiers.filter((m) => weights[m] !== undefined);
  const modifierProduct = modifiersApplied.reduce((acc, m) => acc * (weights[m] ?? 1), 1);

  const inherentScore = round1(rule.likelihood * rule.impact * modifierProduct);
  const clampedEffectiveness = Math.min(Math.max(controlEffectiveness, 0), 0.95);
  const residualScore = round1(inherentScore * (1 - clampedEffectiveness));

  return {
    ruleKey: rule.key,
    title: rule.title,
    description: rule.description,
    likelihood: rule.likelihood,
    impact: rule.impact,
    inherentScore,
    residualScore,
    level: levelForScore(inherentScore, config),
    residualLevel: levelForScore(residualScore, config),
    modifiersApplied,
    references: rule.references,
    recommendedControls: rule.recommendedControls,
    category: rule.category,
  };
}

/** Evaluate the full rule set against a fact map. */
export function evaluateRiskRules(
  rules: RiskRule[],
  facts: Record<string, unknown>,
  config: RiskScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoredRisk[] {
  return rules
    .filter((r) => evaluateCondition(r.condition, facts))
    .map((r) => scoreRisk(r, config))
    .sort((a, b) => b.residualScore - a.residualScore);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
