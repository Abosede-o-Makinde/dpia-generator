import { z } from 'zod';
import { DATA_CATEGORIES } from './enums.js';

/**
 * AI processing-activity classification contract.
 * Produced by the AI service (`POST /v1/classify`), consumed by api + web.
 */

export const detectedCategorySchema = z.object({
  category: z.enum(DATA_CATEGORIES),
  confidence: z.number().min(0).max(1),
  /** Short quote/evidence from the description that triggered the detection. */
  rationale: z.string(),
});

export const screeningCriterionSchema = z.object({
  /** e.g. "systematic_monitoring", "large_scale_special_category" */
  key: z.string(),
  label: z.string(),
  met: z.boolean(),
  rationale: z.string(),
  /** Legal source, e.g. "UK GDPR Art. 35(3)(b)", "ICO examples list". */
  source: z.string(),
});

export const classificationResultSchema = z.object({
  categories: z.array(detectedCategorySchema),
  specialCategory: z.boolean(),
  childrenData: z.boolean(),
  criminalOffenceData: z.boolean(),
  aiProcessing: z.boolean(),
  automatedDecisionMaking: z.boolean(),
  largeScale: z.boolean(),
  internationalTransfers: z.boolean(),
  /** Art. 35(3) + ICO screening checklist evaluation. */
  screening: z.array(screeningCriterionSchema),
  dpiaRequired: z.enum(['REQUIRED', 'RECOMMENDED', 'NOT_REQUIRED']),
  dpiaRationale: z.string(),
  suggestedAnswers: z.record(z.string(), z.unknown()).optional(),
  model: z.string().optional(),
});

export type DetectedCategory = z.infer<typeof detectedCategorySchema>;
export type ScreeningCriterion = z.infer<typeof screeningCriterionSchema>;
export type ClassificationResult = z.infer<typeof classificationResultSchema>;
