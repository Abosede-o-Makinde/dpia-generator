import { z } from 'zod';

/**
 * Declarative condition DSL used by:
 *  - the adaptive questionnaire (question visibility / follow-ups)
 *  - the risk engine (rule matching)
 *
 * Conditions are pure JSON, evaluated against an answer map
 * (`Record<string, unknown>`), so templates and rules are fully
 * data-driven and editable without code changes.
 */

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | LeafCondition;

export interface LeafCondition {
  /** Question key or fact key, e.g. `data_categories` or `scan.publicBuckets`. */
  q: string;
  op:
    | 'eq'
    | 'neq'
    | 'in'
    | 'includes'
    | 'includesAny'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'answered'
    | 'truthy';
  value?: unknown;
}

const leafSchema = z.object({
  q: z.string().min(1),
  op: z.enum([
    'eq',
    'neq',
    'in',
    'includes',
    'includesAny',
    'gt',
    'gte',
    'lt',
    'lte',
    'answered',
    'truthy',
  ]),
  value: z.unknown().optional(),
});

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
    leafSchema,
  ]),
) as z.ZodType<Condition>;

function toNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function evaluateCondition(cond: Condition, facts: Record<string, unknown>): boolean {
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, facts));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, facts));
  if ('not' in cond) return !evaluateCondition(cond.not, facts);

  const actual = facts[cond.q];
  switch (cond.op) {
    case 'answered':
      return (
        actual !== undefined &&
        actual !== null &&
        actual !== '' &&
        !(Array.isArray(actual) && actual.length === 0)
      );
    case 'truthy':
      return Boolean(actual);
    case 'eq':
      return actual === cond.value;
    case 'neq':
      return actual !== cond.value;
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(actual as never);
    case 'includes':
      return Array.isArray(actual) && actual.includes(cond.value as never);
    case 'includesAny':
      return (
        Array.isArray(actual) &&
        Array.isArray(cond.value) &&
        cond.value.some((v) => (actual as unknown[]).includes(v))
      );
    case 'gt': {
      const a = toNumber(actual);
      const b = toNumber(cond.value);
      return a !== null && b !== null && a > b;
    }
    case 'gte': {
      const a = toNumber(actual);
      const b = toNumber(cond.value);
      return a !== null && b !== null && a >= b;
    }
    case 'lt': {
      const a = toNumber(actual);
      const b = toNumber(cond.value);
      return a !== null && b !== null && a < b;
    }
    case 'lte': {
      const a = toNumber(actual);
      const b = toNumber(cond.value);
      return a !== null && b !== null && a <= b;
    }
    default:
      return false;
  }
}
