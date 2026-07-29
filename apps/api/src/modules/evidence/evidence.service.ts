import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EvidenceType } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { sha256Hex } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from './storage.service';

/**
 * Evidence repository. Uploads are content-addressed (sha256 recorded),
 * type-restricted, size-capped (multer) and stored under a per-org prefix.
 */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    type: EvidenceType,
    description?: string,
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    const storageKey = `evidence/${orgId}/${randomUUID()}`;
    await this.storage.put(storageKey, file.buffer, file.mimetype);

    const evidence = await this.prisma.client.evidence.create({
      data: {
        organisationId: orgId,
        type,
        filename: file.originalname.slice(0, 255),
        contentType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        sha256: sha256Hex(file.buffer),
        uploadedById: userId,
        description,
      },
    });
    await this.audit.log({
      action: 'UPLOAD',
      entityType: 'Evidence',
      entityId: evidence.id,
      metadata: { filename: evidence.filename, sha256: evidence.sha256 },
    });
    return evidence;
  }

  list(orgId: string, type?: EvidenceType) {
    return this.prisma.client.evidence.findMany({
      where: { organisationId: orgId, deletedAt: null, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        dpiaLinks: { include: { dpia: { select: { id: true, reference: true, title: true } } } },
      },
    });
  }

  async download(orgId: string, id: string) {
    const evidence = await this.assert(orgId, id);
    await this.audit.log({ action: 'DOWNLOAD', entityType: 'Evidence', entityId: id });
    const presigned = await this.storage.presignDownload(evidence.storageKey);
    if (presigned) return { url: presigned };
    const body = await this.storage.get(evidence.storageKey);
    return {
      inline: {
        filename: evidence.filename,
        contentType: evidence.contentType,
        base64: body.toString('base64'),
      },
    };
  }

  async linkToDpia(orgId: string, id: string, dpiaId: string) {
    await this.assert(orgId, id);
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id: dpiaId, organisationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');
    return this.prisma.system.dpiaEvidence.upsert({
      where: { dpiaId_evidenceId: { dpiaId, evidenceId: id } },
      create: { dpiaId, evidenceId: id },
      update: {},
    });
  }

  async linkToControl(orgId: string, id: string, controlId: string) {
    await this.assert(orgId, id);
    return this.prisma.system.controlEvidence.upsert({
      where: { controlId_evidenceId: { controlId, evidenceId: id } },
      create: { controlId, evidenceId: id },
      update: {},
    });
  }

  async softDelete(orgId: string, id: string) {
    await this.assert(orgId, id);
    await this.prisma.client.evidence.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({ action: 'DELETE', entityType: 'Evidence', entityId: id });
  }

  private async assert(orgId: string, id: string) {
    const evidence = await this.prisma.client.evidence.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
    });
    if (!evidence) throw new NotFoundException('Evidence not found');
    return evidence;
  }
}
