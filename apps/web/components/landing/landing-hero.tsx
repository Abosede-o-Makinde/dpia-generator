'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const PROOF_POINTS = [
  ['Article 35', 'ICO-aligned screening'],
  ['20+ rules', 'Consistent risk scoring'],
  ['10 frameworks', 'Controls mapped once'],
  ['One record', 'Evidence through approval'],
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease },
  },
};

export function LandingHero() {
  return (
    <section className="overflow-hidden bg-white">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-10 pt-8 text-center sm:px-5 md:pb-14 md:pt-12"
      >
        <motion.p variants={item} className="text-sm font-medium tracking-wide text-muted-foreground">
          Shieldwise
        </motion.p>
        <motion.h1 variants={item} className="landing-hero-title mt-4 max-w-[17ch] sm:max-w-none">
          Privacy decisions you can defend
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base md:mt-8 md:text-lg"
        >
          Build evidence-backed UK GDPR assessments with guided questions, consistent risk scoring,
          and accountable approvals—all in one workspace.
        </motion.p>
        <motion.div
          variants={item}
          className="mt-8 flex flex-row flex-wrap items-center justify-center gap-3 md:mt-10"
        >
          <Link href="/register" className="landing-btn landing-btn-primary h-12 px-6">
            Assess new processing <ArrowRight className="size-4" />
          </Link>
          <a href="#how-it-works" className="landing-btn landing-btn-ghost h-12 px-6">
            See how it works
          </a>
        </motion.div>
        <motion.a
          variants={item}
          href="#how-it-works"
          aria-label="Scroll to how it works"
          className="mt-10 hidden flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
        >
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-5" />
          </motion.span>
        </motion.a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease }}
        className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-5 sm:pb-16 md:px-8 md:pb-20"
      >
        <div className="overflow-hidden rounded-[28px] bg-surface shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="relative aspect-[1024/494] overflow-hidden bg-surface">
            <Image
              src="/dashboard.png"
              alt="Shieldwise dashboard overview with DPIA programme KPIs, risk heat map, and residual risk trend"
              fill
              priority
              unoptimized
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 960px"
            />
          </div>
        </div>

        <div className="mt-10 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
          {PROOF_POINTS.map(([value, label], index) => (
            <div
              key={value}
              className={`py-5 sm:px-6 ${index > 0 ? 'sm:border-l sm:border-border' : ''}`}
            >
              <p className="font-display text-xl font-medium tracking-tight text-ink">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
