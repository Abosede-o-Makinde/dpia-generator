import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { REPORT_TEMPLATES, type ReportModel, type ReportTemplateKey } from '../report-model';

const LEVEL_COLOURS: Record<string, string> = {
  LOW: '#38a169',
  MEDIUM: '#d69e2e',
  HIGH: '#dd6b20',
  CRITICAL: '#e53e3e',
};

export function renderPdf(model: ReportModel, template: ReportTemplateKey): Promise<Buffer> {
  const inc = REPORT_TEMPLATES[template];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title page
    doc.fontSize(22).fillColor('#1a365d').text('Data Protection Impact Assessment');
    doc.moveDown(0.3);
    doc.fontSize(16).fillColor('#2d3748').text(model.title);
    doc.moveDown(1);

    const meta: Array<[string, string]> = [
      ['Reference', model.reference],
      ['Organisation', model.organisation],
      ['Status', model.status],
      ['Completeness', `${model.completeness}%`],
      ['Generated', model.generatedAt],
      ...(model.approvedAt ? ([['Approved', model.approvedAt]] as Array<[string, string]>) : []),
      ...(model.nextReviewAt
        ? ([['Next review', model.nextReviewAt]] as Array<[string, string]>)
        : []),
    ];
    doc.fontSize(10);
    for (const [k, v] of meta) {
      doc.fillColor('#4a5568').text(`${k}: `, { continued: true }).fillColor('#1a202c').text(v);
    }
    if (model.description) {
      doc.moveDown(1).fontSize(11).fillColor('#1a202c').text(model.description);
    }

    doc.moveDown(1);
    doc.fontSize(15).fillColor('#1a365d').text('Article 36 prior consultation');
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .fillColor(model.priorConsultation.required ? '#c53030' : '#2f855a')
      .text(
        model.priorConsultation.required
          ? 'REQUIRED — consult the ICO before starting processing'
          : 'Not indicated on residual-risk grounds alone',
      );
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#1a202c')
      .text(model.priorConsultation.reason);

    if (inc.questionnaire) {
      for (const section of model.sections) {
        doc.addPage();
        doc.fontSize(15).fillColor('#1a365d').text(section.title);
        doc.moveDown(0.5);
        for (const item of section.items) {
          doc.fontSize(10.5).fillColor('#2d3748').text(item.question, { continued: false });
          doc.fontSize(10).fillColor('#1a202c').text(item.answer);
          if (item.references?.length) {
            doc.fontSize(8).fillColor('#718096').text(item.references.join(' · '));
          }
          doc.moveDown(0.6);
        }
      }
    }

    if (inc.risks && model.risks.length > 0) {
      doc.addPage();
      doc.fontSize(15).fillColor('#1a365d').text('Identified risks');
      doc.moveDown(0.5);
      for (const r of model.risks) {
        doc
          .fontSize(11)
          .fillColor(LEVEL_COLOURS[r.residualLevel] ?? '#1a202c')
          .text(`[${r.residualLevel}] `, { continued: true })
          .fillColor('#1a202c')
          .text(r.title);
        doc
          .fontSize(9)
          .fillColor('#4a5568')
          .text(
            `Likelihood ${r.likelihood}/5 · Impact ${r.impact}/5 · Inherent ${r.inherentScore} · Residual ${r.residualScore} · ${r.status}`,
          );
        if (r.controls.length > 0) {
          doc
            .fontSize(9)
            .fillColor('#2b6cb0')
            .text(`Controls: ${r.controls.map((c) => `${c.name} (${c.status})`).join('; ')}`);
        }
        if (r.references.length > 0) {
          doc.fontSize(8).fillColor('#718096').text(r.references.join(' · '));
        }
        doc.moveDown(0.7);
      }
    }

    if (inc.approvals && model.approvals.length > 0) {
      doc.moveDown(1);
      doc.fontSize(15).fillColor('#1a365d').text('Approvals');
      doc.moveDown(0.4);
      for (const a of model.approvals) {
        doc
          .fontSize(9.5)
          .fillColor('#1a202c')
          .text(`${a.decidedAt} — ${a.decision} at ${a.stage}${a.comment ? `: ${a.comment}` : ''}`);
      }
    }

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor('#a0aec0')
        .text(
          `${model.reference} · Shieldwise Privacy Platform · page ${i + 1} of ${range.count}`,
          56,
          doc.page.height - 40,
          { lineBreak: false },
        );
    }
    doc.end();
  });
}

export async function renderDocx(model: ReportModel, template: ReportTemplateKey): Promise<Buffer> {
  const inc = REPORT_TEMPLATES[template];
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'Data Protection Impact Assessment',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: model.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun(
          `Reference ${model.reference} · ${model.organisation} · Status ${model.status} · Generated ${model.generatedAt}`,
        ),
      ],
    }),
  ];
  if (model.description) children.push(new Paragraph({ text: model.description }));

  children.push(
    new Paragraph({ text: 'Article 36 prior consultation', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({
      children: [
        new TextRun({
          text: model.priorConsultation.required
            ? 'REQUIRED — consult the ICO before starting processing'
            : 'Not indicated on residual-risk grounds alone',
          bold: true,
        }),
      ],
    }),
    new Paragraph({ text: model.priorConsultation.reason }),
  );

  if (inc.questionnaire) {
    for (const section of model.sections) {
      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }));
      for (const item of section.items) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: item.question, bold: true })] }),
          new Paragraph({ text: item.answer }),
        );
      }
    }
  }

  if (inc.risks && model.risks.length > 0) {
    children.push(new Paragraph({ text: 'Identified risks', heading: HeadingLevel.HEADING_2 }));
    const header = new TableRow({
      children: ['Risk', 'L', 'I', 'Residual', 'Level', 'Status'].map(
        (h) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
          }),
      ),
    });
    const rows = model.risks.map(
      (r) =>
        new TableRow({
          children: [
            r.title,
            String(r.likelihood),
            String(r.impact),
            String(r.residualScore),
            r.residualLevel,
            r.status,
          ].map((v) => new TableCell({ children: [new Paragraph({ text: v })] })),
        }),
    );
    children.push(
      new Table({ rows: [header, ...rows], width: { size: 100, type: WidthType.PERCENTAGE } }),
    );
  }

  if (inc.approvals && model.approvals.length > 0) {
    children.push(new Paragraph({ text: 'Approvals', heading: HeadingLevel.HEADING_2 }));
    for (const a of model.approvals) {
      children.push(
        new Paragraph({
          text: `${a.decidedAt} — ${a.decision} at ${a.stage}${a.comment ? `: ${a.comment}` : ''}`,
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Generated by Shieldwise Privacy Platform', italics: true })],
    }),
  );

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
