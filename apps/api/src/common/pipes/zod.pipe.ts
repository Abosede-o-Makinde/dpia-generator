import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Zod-backed validation pipe. DTOs are shared Zod schemas (many from
 * @shieldwise/shared), keeping API and frontend contracts identical.
 */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    // Nest can pass `undefined` for empty `@Query()` / `@Body()`; treat as {}.
    const result = this.schema.safeParse(value === undefined || value === null ? {} : value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
      );
    }
    return result.data;
  }
}
