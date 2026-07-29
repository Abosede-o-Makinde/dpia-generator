'use client';

import { useCallback, useRef, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Node {
  id: string;
  kind: 'system' | 'api' | 'database' | 'user' | 'vendor' | 'cloud_service';
  label: string;
  country?: string;
  trustZone?: string;
  isProcessor?: boolean;
  position: { x: number; y: number };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dataCategories: string[];
  encrypted?: boolean;
}

interface Finding {
  kind: string;
  severity: 'INFO' | 'MEDIUM' | 'HIGH';
  message: string;
}

const KIND_COLOURS: Record<Node['kind'], string> = {
  system: 'border-blue-400 bg-blue-50 dark:bg-blue-950',
  api: 'border-purple-400 bg-purple-50 dark:bg-purple-950',
  database: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950',
  user: 'border-slate-400 bg-slate-50 dark:bg-slate-900',
  vendor: 'border-amber-400 bg-amber-50 dark:bg-amber-950',
  cloud_service: 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950',
};

export function DataFlowEditor({
  dpiaId,
  initialNodes,
  initialEdges,
  initialFindings,
  readOnly,
}: {
  dpiaId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialFindings: Finding[];
  readOnly?: boolean;
}) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNode = (kind: Node['kind']) => {
    const id = `n_${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        kind,
        label: kind.replace('_', ' '),
        position: { x: 40 + prev.length * 30, y: 40 + prev.length * 20 },
      },
    ]);
  };

  const onMouseDown = (e: React.MouseEvent, node: Node) => {
    if (readOnly) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: node.id,
      offsetX: e.clientX - rect.left - node.position.x,
      offsetY: e.clientY - rect.top - node.position.y,
    };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { id, offsetX, offsetY } = dragRef.current;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              position: { x: e.clientX - rect.left - offsetX, y: e.clientY - rect.top - offsetY },
            }
          : n,
      ),
    );
  }, []);

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const onNodeClick = (nodeId: string) => {
    if (readOnly) return;
    if (!linkFrom) {
      setLinkFrom(nodeId);
      return;
    }
    if (linkFrom !== nodeId) {
      setEdges((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          source: linkFrom,
          target: nodeId,
          dataCategories: [],
          encrypted: true,
        },
      ]);
    }
    setLinkFrom(null);
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  };

  async function save() {
    setSaving(true);
    try {
      const result = await apiFetch<{ findings: Finding[] }>(`/v1/dpias/${dpiaId}/data-flow`, {
        method: 'PUT',
        body: { nodes, edges },
      });
      setFindings(result.findings);
    } finally {
      setSaving(false);
    }
  }

  const nodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {(['system', 'api', 'database', 'user', 'vendor', 'cloud_service'] as const).map(
            (kind) => (
              <Button key={kind} variant="outline" size="sm" onClick={() => addNode(kind)}>
                <Plus className="h-3.5 w-3.5" /> {kind.replace('_', ' ')}
              </Button>
            ),
          )}
          <Button size="sm" onClick={save} loading={saving} className="ml-auto">
            <Save className="h-3.5 w-3.5" /> Save & analyse
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Map where personal data is collected, stored, shared, or accessed. Drag nodes to position
        them, then click a source and destination to connect the flow. Click{' '}
        <Trash2 className="inline h-3 w-3" /> to remove a node.
      </p>

      <div
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="relative h-[480px] overflow-hidden rounded-lg border border-border bg-muted/20"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {edges.map((e) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id}
                x1={s.position.x + 60}
                y1={s.position.y + 24}
                x2={t.position.x + 60}
                y2={t.position.y + 24}
                stroke={e.encrypted === false ? '#dc2626' : '#94a3b8'}
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {nodes.map((n) => (
          <div
            key={n.id}
            onMouseDown={(e) => onMouseDown(e, n)}
            onClick={() => onNodeClick(n.id)}
            style={{ left: n.position.x, top: n.position.y }}
            className={cn(
              'absolute flex w-[120px] cursor-move flex-col rounded-md border-2 p-2 text-xs shadow-sm select-none',
              KIND_COLOURS[n.kind],
              linkFrom === n.id && 'ring-2 ring-primary',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <input
                className="w-full truncate bg-transparent font-medium outline-none"
                value={n.label}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setNodes((prev) =>
                    prev.map((p) => (p.id === n.id ? { ...p, label: e.target.value } : p)),
                  )
                }
                disabled={readOnly}
              />
              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(n.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
            <span className="text-[10px] uppercase text-muted-foreground">
              {n.kind.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Data-flow findings</h4>
          {findings.map((f, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                f.severity === 'HIGH' && 'border-risk-high/30 bg-risk-high/5',
                f.severity === 'MEDIUM' && 'border-risk-medium/30 bg-risk-medium/5',
                f.severity === 'INFO' && 'border-border bg-muted/30',
              )}
            >
              <span className="mr-2 text-xs font-semibold uppercase text-muted-foreground">
                {f.severity}
              </span>
              {f.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
