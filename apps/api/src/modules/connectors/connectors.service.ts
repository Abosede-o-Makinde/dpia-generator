import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConnectorProvider } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { config } from '../../common/config';
import { decryptSecret, encryptSecret } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DpiasService } from '../dpias/dpias.service';
import { AwsScanner } from './scanners/aws.scanner';
import { DockerScanner } from './scanners/docker.scanner';
import { KubernetesScanner } from './scanners/kubernetes.scanner';
import { TerraformScanner } from './scanners/terraform.scanner';
import type { RawFinding, Scanner, ScanInputFile } from './scanners/types';

/**
 * Cloud/configuration connectors. Static-analysis providers (TERRAFORM,
 * DOCKER, KUBERNETES) take files with each scan request; live providers
 * (AWS) use encrypted stored credentials. Remaining providers implement the
 * same Scanner interface (plugin registry below).
 */
@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);
  private readonly scanners = new Map<string, Scanner>(
    [new AwsScanner(), new TerraformScanner(), new DockerScanner(), new KubernetesScanner()].map(
      (s) => [s.provider, s],
    ),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dpias: DpiasService,
  ) {}

  supportedProviders(): string[] {
    return [...this.scanners.keys()];
  }

  async create(
    orgId: string,
    provider: ConnectorProvider,
    name: string,
    cfg: Record<string, unknown>,
  ) {
    if (!this.scanners.has(provider)) {
      throw new BadRequestException(
        `Provider ${provider} not yet implemented — available: ${this.supportedProviders().join(', ')}`,
      );
    }
    const connector = await this.prisma.client.connector.create({
      data: {
        organisationId: orgId,
        provider,
        name,
        configEnc: encryptSecret(JSON.stringify(cfg), config().MFA_ENCRYPTION_KEY),
      },
    });
    await this.audit.log({ action: 'CREATE', entityType: 'Connector', entityId: connector.id });
    return { id: connector.id, provider: connector.provider, name: connector.name };
  }

  list(orgId: string) {
    return this.prisma.client.connector.findMany({
      where: { organisationId: orgId, deletedAt: null },
      select: {
        id: true,
        provider: true,
        name: true,
        status: true,
        lastScanAt: true,
        createdAt: true,
        _count: { select: { scans: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(orgId: string, id: string) {
    await this.assert(orgId, id);
    await this.prisma.client.connector.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DISABLED' },
    });
    await this.audit.log({ action: 'DELETE', entityType: 'Connector', entityId: id });
  }

  /** Run a scan synchronously (bounded workloads); persists findings. */
  async scan(orgId: string, id: string, files: ScanInputFile[] = []) {
    const connector = await this.assert(orgId, id);
    const scanner = this.scanners.get(connector.provider);
    if (!scanner) throw new BadRequestException(`No scanner for ${connector.provider}`);

    const scan = await this.prisma.system.scan.create({
      data: { connectorId: id, status: 'RUNNING', startedAt: new Date() },
    });

    try {
      const cfg = JSON.parse(
        decryptSecret(connector.configEnc, config().MFA_ENCRYPTION_KEY),
      ) as Record<string, unknown>;
      const findings = await scanner.scan({ config: cfg, files });

      await this.prisma.system.$transaction([
        this.prisma.system.scanFinding.createMany({
          data: findings.map((f) => ({
            scanId: scan.id,
            severity: f.severity,
            category: f.category,
            resourceId: f.resourceId,
            title: f.title,
            description: f.description,
            remediation: f.remediation,
            dpiaHints: (f.dpiaHints ?? {}) as object,
          })),
        }),
        this.prisma.system.scan.update({
          where: { id: scan.id },
          data: { status: 'COMPLETED', finishedAt: new Date() },
        }),
        this.prisma.system.connector.update({
          where: { id },
          data: { lastScanAt: new Date() },
        }),
      ]);

      await this.audit.log({
        action: 'SCAN',
        entityType: 'Connector',
        entityId: id,
        metadata: { scanId: scan.id, findings: findings.length },
      });
      return { scanId: scan.id, status: 'COMPLETED', findings: findings.length };
    } catch (err) {
      this.logger.error(`Scan ${scan.id} failed: ${(err as Error).message}`);
      await this.prisma.system.scan.update({
        where: { id: scan.id },
        data: { status: 'FAILED', finishedAt: new Date(), error: (err as Error).message },
      });
      throw new BadRequestException(`Scan failed: ${(err as Error).message}`);
    }
  }

  async findings(orgId: string, scanId: string) {
    const scan = await this.prisma.system.scan.findFirst({
      where: { id: scanId, connector: { organisationId: orgId } },
      include: { findings: { orderBy: { severity: 'desc' } } },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  /** Pre-populate DPIA answers from scan findings (dpiaHints merge). */
  async prefillDpia(orgId: string, scanId: string, dpiaId: string) {
    const scan = await this.findings(orgId, scanId);
    const hints: Record<string, unknown> = {};
    for (const f of scan.findings) {
      Object.assign(hints, f.dpiaHints as Record<string, unknown>);
    }
    if (Object.keys(hints).length === 0) {
      return { applied: {}, message: 'No DPIA-relevant hints in this scan' };
    }
    await this.dpias.patchAnswers(orgId, dpiaId, hints);
    return { applied: hints };
  }

  private async assert(orgId: string, id: string) {
    const connector = await this.prisma.client.connector.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
    });
    if (!connector) throw new NotFoundException('Connector not found');
    return connector;
  }
}

export type { RawFinding };
