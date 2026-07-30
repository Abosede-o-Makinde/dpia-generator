import Image from 'next/image';
import Link from 'next/link';
import { LandingHero } from '@/components/landing/landing-hero';
import { ProductFeaturesStack } from '@/components/landing/product-features-stack';
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitBranch,
  ScanSearch,
  ShieldCheck,
  ShieldQuestion,
  Users,
} from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Describe the processing',
    copy: 'Start with the project, system, or processing activity you need to assess.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Complete the guided DPIA',
    copy: 'Work through an adaptive UK GDPR questionnaire and map the movement of personal data.',
    icon: ClipboardCheck,
  },
  {
    number: '03',
    title: 'Assess and reduce risk',
    copy: 'Score inherent and residual risk, then connect safeguards and supporting evidence.',
    icon: ScanSearch,
  },
  {
    number: '04',
    title: 'Review and export',
    copy: 'Route decisions through the approval workflow and create a review-ready DPIA record.',
    icon: FileCheck2,
  },
] as const;

const GOVERNANCE_FEATURES = [
  {
    title: 'Purpose-led by design',
    copy: 'Every assessment starts with why the processing is needed and who it affects.',
    icon: ShieldQuestion,
  },
  {
    title: 'Evidence stays connected',
    copy: 'Supporting records sit alongside the assessment and the control they substantiate.',
    icon: FileCheck2,
  },
  {
    title: 'Decisions are traceable',
    copy: 'Statuses, review actions, risks, and changes remain visible to accountable teams.',
    icon: ClipboardCheck,
  },
] as const;

const FAQS = [
  {
    question: 'When should an organisation complete a DPIA?',
    answer:
      'Before processing that is likely to result in a high risk to people—particularly where new technology, systematic monitoring, or special category data is involved.',
  },
  {
    question: 'Does Shieldwise replace a Data Protection Officer?',
    answer:
      'No. It structures the assessment and its evidence. Professional judgement, consultation, approval, and accountability remain with your organisation.',
  },
  {
    question: 'Can teams revisit an assessment after approval?',
    answer:
      'Yes. DPIAs remain living records so teams can review them when processing, suppliers, technology, risk, or legal context changes.',
  },
] as const;

const PERSONAS = [
  {
    title: 'Data Protection Officers',
    copy: 'Review DPIAs, monitor residual risk, and keep assessments ready for governance scrutiny.',
    icon: ShieldCheck,
  },
  {
    title: 'Privacy and compliance teams',
    copy: 'Apply one questionnaire, risk model, and approval process across the organisation.',
    icon: Users,
  },
  {
    title: 'Engineering and security teams',
    copy: 'Map data flows, document technical safeguards, and provide evidence for privacy decisions.',
    icon: BarChart3,
  },
] as const;

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white text-ink">
      <header className="relative z-50 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:min-h-[4.5rem] sm:px-5 md:min-h-20">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldQuestion className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="font-display text-[1.05rem] font-semibold tracking-tight">Shieldwise</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex lg:gap-8">
            <a href="#how-it-works" className="transition-colors hover:text-primary">
              How it works
            </a>
            <a href="#product" className="transition-colors hover:text-primary">
              Product
            </a>
            <a href="#teams" className="transition-colors hover:text-primary">
              Who it&apos;s for
            </a>
            <a href="#faq" className="transition-colors hover:text-primary">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
            >
              Log in
            </Link>
            <Link href="/register" className="landing-btn landing-btn-primary h-9 px-4">
              Start a DPIA <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <LandingHero />

        <section id="how-it-works" className="scroll-mt-24 bg-surface py-16 sm:py-24 lg:py-28">
          <div className="landing-wide">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="landing-eyebrow">A guided workflow</p>
                <h2 className="landing-section-title mt-3">
                  From a new activity to an accountable decision.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:justify-self-end">
                Bring the assessment, data flow, risks, controls, supporting evidence, and review
                history into one process that every contributor can follow.
              </p>
            </div>

            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ number, title, copy, icon: Icon }) => (
                <article
                  key={number}
                  className="group border-t border-slate-300 pt-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-slate-400">{number}</span>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-border">
                      <Icon className="size-[18px]" strokeWidth={1.7} />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 grid overflow-hidden rounded-[1.75rem] border border-border bg-white lg:grid-cols-[0.34fr_0.66fr]">
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <span className="flex size-11 items-center justify-center rounded-xl bg-section-wash text-primary">
                  <GitBranch className="size-5" strokeWidth={1.7} />
                </span>
                <p className="landing-eyebrow mt-7">Visual data flows</p>
                <h3 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight">
                  See where personal data moves.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Map systems, people, vendors, APIs, databases, and cloud services directly inside
                  the assessment.
                </p>
              </div>
              <div className="relative min-h-[290px] border-t border-border bg-surface lg:min-h-[430px] lg:border-l lg:border-t-0">
                <Image
                  src="/dpia-dataflow.png"
                  alt="Shieldwise data-flow canvas mapping systems, APIs, databases, users, and cloud services"
                  fill
                  unoptimized
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 720px"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="py-20 sm:py-24 lg:py-32">
          <div className="landing-wide">
            <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="landing-eyebrow">Inside Shieldwise</p>
                <h2 className="landing-section-title mt-3">
                  One record from first question to final review.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:justify-self-end">
                Each part of the workflow adds context to the same assessment, so reviewers can see
                not only the conclusion, but how the team reached it.
              </p>
            </div>

            <ProductFeaturesStack />
          </div>
        </section>

        <section className="scroll-mt-24 border-y border-border bg-surface py-16 sm:py-24">
          <div className="landing-wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="landing-eyebrow">Governance built in</p>
              <h2 className="landing-section-title mt-3">
                The detail needed for accountable decisions.
              </h2>
            </div>
            <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3">
              {GOVERNANCE_FEATURES.map(({ title, copy, icon: Icon }) => (
                <article key={title} className="border-t border-slate-300 pt-6">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-border">
                    <Icon className="size-[18px]" strokeWidth={1.7} />
                  </span>
                  <h3 className="mt-7 text-lg font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="teams" className="bg-ink py-20 text-white sm:py-24 lg:py-28">
          <div className="landing-wide">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/45">
                  A shared privacy workspace
                </p>
                <h2 className="mt-4 max-w-xl font-display text-3xl font-light leading-tight tracking-tight text-balance sm:text-5xl">
                  Privacy decisions improve when the right teams share the context.
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
                  Bring privacy, compliance, engineering, security, and project owners into one
                  structured process without losing accountability.
                </p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ink transition hover:-translate-y-px hover:bg-white/90"
                >
                  Create a workspace <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {PERSONAS.map(({ title, copy, icon: Icon }) => (
                  <article
                    key={title}
                    className="rounded-[22px] border border-white/10 bg-white/[0.05] p-6"
                  >
                    <Icon className="size-5 text-white/55" strokeWidth={1.7} />
                    <h3 className="mt-10 text-base font-medium">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-20 sm:py-24 lg:py-28">
          <div className="landing-wide">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="landing-eyebrow">Common questions</p>
                <h2 className="landing-section-title mt-3">A clearer way to approach DPIAs.</h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Shieldwise provides structure and traceability while keeping accountable
                  decisions with your organisation.
                </p>
              </div>
              <div className="divide-y divide-border border-y border-border">
                {FAQS.map(({ question, answer }, index) => (
                  <article key={question} className="grid gap-4 py-7 sm:grid-cols-[2rem_1fr]">
                    <span className="font-mono text-xs font-medium text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-base font-medium">{question}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {answer}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20 sm:pb-24 lg:pb-28">
          <div className="landing-wide">
            <div className="relative overflow-hidden rounded-2xl bg-[#eef1ff] px-6 py-14 text-center sm:px-10 sm:py-20">
              <div
                aria-hidden
                className="absolute -right-20 -top-24 size-80 rounded-full border-[48px] border-primary/[0.055]"
              />
              <div
                aria-hidden
                className="absolute -bottom-28 -left-24 size-64 rounded-full border-[42px] border-primary/[0.035]"
              />
              <div className="relative mx-auto max-w-2xl">
                <p className="landing-eyebrow">Start before the risk becomes real</p>
                <h2 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-balance sm:text-5xl">
                  Build your next DPIA as one clear, review-ready record.
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Create a workspace, describe the processing, and let the guided assessment lead
                  your team through the questions that matter.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/register" className="landing-btn landing-btn-primary h-12 px-6">
                    Create an account <ChevronRight className="size-4" />
                  </Link>
                  <Link href="/login" className="landing-btn landing-btn-ghost h-12 px-6">
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white text-ink">
        <div className="landing-wide">
          <div className="border-b border-border py-14 sm:py-16">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-section-wash text-primary">
                <ShieldQuestion className="size-5" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-none">Shieldwise</span>
                <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Privacy engineering
                </span>
              </span>
            </Link>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A guided UK GDPR DPIA workspace for teams that need to understand privacy risk,
              document safeguards, and explain how decisions were reached.
            </p>
          </div>

          <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
            <div>
              <h3 className="text-base font-medium">Platform</h3>
              <div className="mt-6 flex flex-col items-start gap-3.5 text-sm text-muted-foreground">
                <Link href="/dashboard" className="transition-colors hover:text-ink">Dashboard</Link>
                <Link href="/dpias" className="transition-colors hover:text-ink">DPIA assessments</Link>
                <Link href="/risks" className="transition-colors hover:text-ink">Risk register</Link>
                <Link href="/controls" className="transition-colors hover:text-ink">Controls</Link>
                <Link href="/reports" className="transition-colors hover:text-ink">Reports</Link>
              </div>
            </div>

            <div>
              <h3 className="text-base font-medium">Explore</h3>
              <div className="mt-6 flex flex-col items-start gap-3.5 text-sm text-muted-foreground">
                <a href="#how-it-works" className="transition-colors hover:text-ink">How it works</a>
                <a href="#product" className="transition-colors hover:text-ink">Product</a>
                <a href="#teams" className="transition-colors hover:text-ink">For teams</a>
                <a href="#faq" className="transition-colors hover:text-ink">Common questions</a>
              </div>
            </div>

            <div>
              <h3 className="text-base font-medium">Account</h3>
              <div className="mt-6 flex flex-col items-start gap-3.5 text-sm text-muted-foreground">
                <Link href="/register" className="transition-colors hover:text-ink">Create an account</Link>
                <Link href="/login" className="transition-colors hover:text-ink">Log in</Link>
                <Link href="/dpias/new" className="transition-colors hover:text-ink">Start a DPIA</Link>
              </div>
            </div>

            <div>
              <h3 className="text-base font-medium">UK GDPR guidance</h3>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Use Shieldwise alongside your organisation&apos;s legal advice, policies, and Data
                Protection Officer oversight.
              </p>
              <a
                href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Read ICO DPIA guidance <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Shieldwise. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span>UK GDPR Article 35</span>
              <Link href="/login" className="transition-colors hover:text-ink">Sign in</Link>
              <Link href="/register" className="transition-colors hover:text-ink">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
