'use client';

import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AssistantPanel({ dpiaId }: { dpiaId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const result = await apiFetch<{ conversationId: string; reply: string }>('/v1/ai/chat', {
        method: 'POST',
        body: { message: text, conversationId, dpiaId },
      });
      setConversationId(result.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: result.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'I could not reach the DPIA assistant. Your assessment has not been changed.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">DPIA drafting assistant</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask for help understanding a question, improving a draft answer, or identifying possible
            mitigations. Check legal conclusions before relying on them.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] break-words rounded-lg px-3 py-2 text-sm',
              m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted',
            )}
          >
            {m.role === 'assistant' ? (
              <AssistantMessage content={m.content} />
            ) : (
              <span className="whitespace-pre-wrap">{m.content}</span>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">Thinking…</div>}
      </div>
      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          rows={2}
          placeholder="Ask about this DPIA…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-0"
        />
        <Button size="icon" onClick={() => void send()} loading={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
