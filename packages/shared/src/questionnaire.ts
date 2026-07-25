import { z } from 'zod';
import { conditionSchema, evaluateCondition, type Condition } from './conditions.js';
import { QUESTION_TYPES } from './enums.js';

/**
 * Adaptive questionnaire template model.
 *
 * Templates are versioned JSON documents. Question visibility is driven by
 * the condition DSL, which gives us skip-logic and automatic follow-ups
 * without hard-coded branching.
 */

export const questionOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  /** Tags emitted into the fact map when selected — consumed by the risk engine. */
  riskTags: z.array(z.string()).optional(),
});

export const questionSchema = z.object({
  /** Stable key, unique within a template, snake_case. Answers are stored against this. */
  key: z.string().regex(/^[a-z0-9_.]+$/),
  type: z.enum(QUESTION_TYPES),
  label: z.string().min(1),
  help: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(questionOptionSchema).optional(),
  /** Question shown only when the condition evaluates true against current answers. */
  visibleWhen: conditionSchema.optional(),
  /** GDPR / guidance references surfaced next to the question. */
  references: z.array(z.string()).optional(),
  /** Hint for the AI assistant when improving/reviewing this answer. */
  aiHint: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const sectionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.]+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  visibleWhen: conditionSchema.optional(),
  questions: z.array(questionSchema).min(1),
});

export const questionnaireTemplateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().optional(),
  sections: z.array(sectionSchema).min(1),
});

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type QuestionnaireTemplate = z.infer<typeof questionnaireTemplateSchema>;

export type AnswerMap = Record<string, unknown>;

export interface VisibleQuestionnaire {
  sections: Array<Section & { questions: Question[] }>;
  /** Keys of required, visible, unanswered questions. */
  missingRequired: string[];
  /** 0–100 completion across visible required questions. */
  completeness: number;
}

/** Resolve which sections/questions are visible for the given answers. */
export function resolveVisibility(
  template: QuestionnaireTemplate,
  answers: AnswerMap,
): VisibleQuestionnaire {
  const sections = template.sections
    .filter((s) => !s.visibleWhen || evaluateCondition(s.visibleWhen, answers))
    .map((s) => ({
      ...s,
      questions: s.questions.filter(
        (q) => !q.visibleWhen || evaluateCondition(q.visibleWhen, answers),
      ),
    }))
    .filter((s) => s.questions.length > 0);

  const requiredVisible = sections.flatMap((s) => s.questions.filter((q) => q.required));
  const missingRequired = requiredVisible
    .filter((q) => {
      const v = answers[q.key];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    })
    .map((q) => q.key);

  const completeness =
    requiredVisible.length === 0
      ? 100
      : Math.round(
          ((requiredVisible.length - missingRequired.length) / requiredVisible.length) * 100,
        );

  return { sections, missingRequired, completeness };
}

/**
 * Build the fact map for the risk engine: raw answers plus riskTags emitted
 * by selected options (as `tags` array) — e.g. selecting "Biometric data"
 * emits `tag:biometric`.
 */
export function buildFactMap(template: QuestionnaireTemplate, answers: AnswerMap): AnswerMap {
  const tags = new Set<string>();
  for (const section of template.sections) {
    for (const q of section.questions) {
      const answer = answers[q.key];
      if (answer === undefined || !q.options) continue;
      const selected = Array.isArray(answer) ? answer : [answer];
      for (const opt of q.options) {
        if (selected.includes(opt.value)) {
          for (const t of opt.riskTags ?? []) tags.add(t);
        }
      }
    }
  }
  return { ...answers, tags: [...tags] };
}

export type { Condition };
