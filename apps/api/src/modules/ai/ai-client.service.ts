import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../../common/config';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Thin client for the Python AI service (apps/ai). Server-to-server auth via
 * a shared bearer token; the AI service is never exposed to browsers.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  private async post<T>(path: string, body: unknown): Promise<T> {
    const cfg = config();
    let res: Response;
    try {
      res = await fetch(`${cfg.AI_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.AI_SERVICE_TOKEN ? { Authorization: `Bearer ${cfg.AI_SERVICE_TOKEN}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.error(`AI service unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI service is unavailable');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`AI service ${path} → ${res.status}: ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException('AI service returned an error');
    }
    return (await res.json()) as T;
  }

  classify(description: string, context?: Record<string, unknown>) {
    return this.post<Record<string, unknown>>('/v1/classify', { description, context });
  }

  chat(messages: AiChatMessage[], context?: Record<string, unknown>) {
    return this.post<{ reply: string; model: string; usage?: Record<string, number> }>('/v1/chat', {
      messages,
      context,
    });
  }

  improveAnswer(question: string, draft: string, context?: Record<string, unknown>) {
    return this.post<{ improved: string; issues: string[]; model: string }>('/v1/improve', {
      question,
      draft,
      context,
    });
  }

  executiveSummary(dpia: Record<string, unknown>) {
    return this.post<{ summary: string; model: string }>('/v1/summarise', { dpia });
  }
}
