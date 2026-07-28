/**
 * Seed: built-in questionnaire template + control library.
 * With SEED_DEMO=true also creates a demo organisation, users and a sample
 * DPIA (safe for local/dev only — refuses to run in production).
 *
 *   pnpm --filter @shieldwise/api run db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { CONTROL_LIBRARY } from './seed-data/controls';
import { UK_DPIA_TEMPLATE } from './seed-data/uk-dpia-template';

const prisma = new PrismaClient();

async function seedTemplate(): Promise<string> {
  const existing = await prisma.questionnaireTemplate.findUnique({
    where: { key_version: { key: UK_DPIA_TEMPLATE.key, version: UK_DPIA_TEMPLATE.version } },
  });
  if (existing) {
    await prisma.questionnaireTemplate.update({
      where: { id: existing.id },
      data: { document: UK_DPIA_TEMPLATE as object, name: UK_DPIA_TEMPLATE.name, isActive: true },
    });
    console.log(`✓ template ${UK_DPIA_TEMPLATE.key} v${UK_DPIA_TEMPLATE.version} (updated)`);
    return existing.id;
  }
  const created = await prisma.questionnaireTemplate.create({
    data: {
      key: UK_DPIA_TEMPLATE.key,
      version: UK_DPIA_TEMPLATE.version,
      name: UK_DPIA_TEMPLATE.name,
      document: UK_DPIA_TEMPLATE as object,
    },
  });
  console.log(`✓ template ${UK_DPIA_TEMPLATE.key} v${UK_DPIA_TEMPLATE.version} (created)`);
  return created.id;
}

async function seedControls(): Promise<void> {
  for (const control of CONTROL_LIBRARY) {
    // Global controls have organisationId = null, which Prisma compound
    // uniques cannot address in upsert — find-then-write instead.
    const data = {
      name: control.name,
      description: control.description,
      category: control.category,
      guidance: control.guidance,
      effectiveness: control.effectiveness,
    };
    const found = await prisma.control.findFirst({
      where: { organisationId: null, key: control.key },
    });
    const record = found
      ? await prisma.control.update({ where: { id: found.id }, data })
      : await prisma.control.create({ data: { key: control.key, ...data } });
    for (const m of control.mappings) {
      await prisma.controlMapping.upsert({
        where: {
          controlId_framework_reference: {
            controlId: record.id,
            framework: m.framework,
            reference: m.reference,
          },
        },
        update: { title: m.title },
        create: {
          controlId: record.id,
          framework: m.framework,
          reference: m.reference,
          title: m.title,
        },
      });
    }
  }
  console.log(`✓ ${CONTROL_LIBRARY.length} controls with framework mappings`);
}

async function seedDemo(templateId: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('SEED_DEMO ignored in production');
    return;
  }
  const password = await argon2.hash('Demo-Passw0rd-Shieldwise!', { type: argon2.argon2id });

  const org = await prisma.organisation.upsert({
    where: { slug: 'demo-health-trust' },
    update: {},
    create: {
      name: 'Demo Health Trust',
      slug: 'demo-health-trust',
      industry: 'healthcare',
    },
  });

  const users = [
    { email: 'dpo@demo.shieldwise.local', displayName: 'Dana Officer', role: 'DPO' as const },
    {
      email: 'engineer@demo.shieldwise.local',
      displayName: 'Priya Engineer',
      role: 'PRIVACY_ENGINEER' as const,
    },
    { email: 'admin@demo.shieldwise.local', displayName: 'Alex Admin', role: 'OWNER' as const },
  ];
  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, displayName: u.displayName, passwordHash: password },
    });
    created[u.email] = user.id;
    await prisma.membership.upsert({
      where: { organisationId_userId: { organisationId: org.id, userId: user.id } },
      update: { role: u.role },
      create: { organisationId: org.id, userId: user.id, role: u.role },
    });
  }

  const existing = await prisma.dpia.findFirst({
    where: { organisationId: org.id, reference: 'DPIA-2026-0001' },
  });
  if (!existing) {
    await prisma.dpia.create({
      data: {
        organisationId: org.id,
        templateId,
        reference: 'DPIA-2026-0001',
        title: 'AI-assisted patient triage chatbot',
        description:
          'Symptom-checking chatbot that triages patients to the right service using an LLM.',
        ownerId: created['engineer@demo.shieldwise.local']!,
        completeness: 74,
        answers: {
          processing_name: 'Patient triage chatbot',
          processing_purpose:
            'Automated symptom triage to route patients to appropriate NHS services, reducing A&E load.',
          industry: 'healthcare',
          lawful_basis: 'PUBLIC_TASK',
          dpo_consulted: true,
          data_categories: ['BASIC_PERSONAL', 'CONTACT', 'HEALTH'],
          subjects_count: 'gte_100k',
          children_subjects: false,
          data_sources: ['direct'],
          retention_period: '1_3y',
          technologies: ['cloud', 'mobile_app'],
          cloud_providers: ['aws'],
          uses_ai: true,
          ai_purpose:
            'LLM classifies free-text symptom descriptions into triage categories; clinicians review high-risk outputs.',
          automated_decisions: false,
          encryption_at_rest: true,
          encryption_in_transit: true,
          access_controls: ['rbac', 'mfa'],
          third_party_processors: true,
          processors_list: 'Cloud hosting (AWS eu-west-2); LLM inference provider.',
          dpa_in_place: true,
          international_transfers: false,
          privacy_notice: true,
          dsar_process: true,
          public_monitoring: false,
          subjects_consulted: true,
          consultation_detail: 'Patient panel review in March 2026; feedback incorporated.',
        } as object,
      },
    });
    console.log('✓ demo organisation, users (password: Demo-Passw0rd-Shieldwise!) and sample DPIA');
  }
}

async function main(): Promise<void> {
  const templateId = await seedTemplate();
  await seedControls();
  if (process.env.SEED_DEMO === 'true') {
    await seedDemo(templateId);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
