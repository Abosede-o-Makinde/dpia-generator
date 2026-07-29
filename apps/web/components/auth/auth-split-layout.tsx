import Link from 'next/link';
import { ShieldQuestion } from 'lucide-react';

type AuthSplitLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

export function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-surface px-4 py-8 sm:px-6 lg:px-10">
      {/* Soft ambient shapes — reference-style atmosphere without purple */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 size-[28rem] rounded-full bg-section-wash blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 size-[32rem] rounded-full bg-primary/[0.07] blur-3xl"
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
      >
        <defs>
          <pattern id="auth-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid)" />
      </svg>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-portal lg:min-h-[640px] lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        {/* Brand / visual panel */}
        <aside className="relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#0b1f4d] p-6 text-white sm:p-8 lg:min-h-0 lg:p-10">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(99,140,255,0.35),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(30,58,95,0.9),transparent_50%)]"
          />
          <div
            aria-hidden
            className="absolute -right-16 top-24 size-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden
            className="absolute -right-8 top-40 size-48 rounded-full border border-white/10"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"
          />

          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/95 text-primary shadow-sm">
              <ShieldQuestion className="size-5" strokeWidth={1.75} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Shieldwise</span>
          </Link>

          <div className="relative z-10 mt-10 max-w-sm lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              UK GDPR · Article 35
            </p>
            <p className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight text-balance sm:text-3xl lg:text-[2rem]">
              Generate DPIAs your DPO can defend.
            </p>
            <ul className="mt-8 space-y-3 text-sm leading-relaxed text-white/85">
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/70" />
                Guided questionnaire with UK GDPR screening and skip logic
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/70" />
                Automatic risk scoring, controls, and residual risk
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/70" />
                Evidence, approval history, and review-ready export reports
              </li>
            </ul>
          </div>
        </aside>

        {/* Form panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="relative">
              <span
                aria-hidden
                className="absolute -left-3 -top-2 size-10 rounded-full bg-section-wash"
              />
              <h1 className="relative text-3xl font-light tracking-tight text-ink sm:text-[2rem]">
                {title}
              </h1>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
