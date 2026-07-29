'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { useDpia } from '@/hooks/use-dpias';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionnaireWizard } from '@/components/dpia/questionnaire-wizard';
import { WorkflowActions } from '@/components/dpia/workflow-actions';
import { RiskList } from '@/components/dpia/risk-list';
import { DataFlowEditor } from '@/components/dpia/dataflow-editor';
import { AssistantPanel } from '@/components/ai/assistant-panel';

export default function DpiaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: dpia, isLoading } = useDpia(id);

  if (isLoading || !dpia) {
    return <div className="text-sm text-muted-foreground">Loading DPIA…</div>;
  }

  const flow =
    (dpia.dataFlow as { nodes?: unknown[]; edges?: unknown[]; findings?: unknown[] } | null) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dpias"
            className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to DPIAs
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-ink">{dpia.title}</h1>
          <p className="font-mono text-xs text-muted-foreground">{dpia.reference}</p>
        </div>
        <ReportButton dpiaId={dpia.id} />
      </div>

      <WorkflowActions dpia={dpia} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <Tabs defaultValue="questionnaire">
          <TabsList>
            <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
            <TabsTrigger value="risks">Risks ({dpia.risks.length})</TabsTrigger>
            <TabsTrigger value="dataflow">Data flow</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="questionnaire">
            <QuestionnaireWizard dpia={dpia} />
          </TabsContent>
          <TabsContent value="risks">
            <RiskList dpiaId={dpia.id} risks={dpia.risks as never} />
          </TabsContent>
          <TabsContent value="dataflow">
            <DataFlowEditor
              dpiaId={dpia.id}
              initialNodes={(flow.nodes as never) ?? []}
              initialEdges={(flow.edges as never) ?? []}
              initialFindings={(flow.findings as never) ?? []}
              readOnly={!dpia.editable}
            />
          </TabsContent>
          <TabsContent value="history">
            <div className="space-y-2">
              {dpia.workflowEvents.map((e, i) => (
                <div key={i} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span className="font-medium">
                    {e.fromStatus} → {e.toStatus}
                  </span>
                  {e.comment && <p className="mt-1 text-muted-foreground">{e.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {dpia.workflowEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No workflow history yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="h-[600px] xl:sticky xl:top-6">
          <AssistantPanel dpiaId={dpia.id} />
        </div>
      </div>
    </div>
  );
}

function ReportButton({ dpiaId }: { dpiaId: string }) {
  async function download() {
    const { apiFetch } = await import('@/lib/api-client');
    const blob = await apiFetch<Blob>(`/v1/reports/dpia/${dpiaId}`, {
      method: 'POST',
      body: { format: 'pdf', template: 'dpia-full' },
      raw: true,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dpiaId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="outline" onClick={() => void download()}>
      <Download className="h-4 w-4" /> Export report
    </Button>
  );
}
