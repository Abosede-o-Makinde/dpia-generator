'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { Check, GitBranch, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

const CAPABILITIES = [
  {
    eyebrow: '01 · Guided assessment',
    title: 'Ask the right questions, in the right order.',
    copy: 'An ICO-aligned questionnaire keeps teams focused on necessity, proportionality, people, data, and safeguards—without starting from a blank document.',
    icon: GitBranch,
    tint: 'bg-[#f5f7ff]',
    image: {
      src: '/dpia-questionaire.png',
      alt: 'Shieldwise DPIA questionnaire with processing context questions and AI assist',
    },
  },
  {
    eyebrow: '02 · Risk and controls',
    title: 'Move from answers to clear risk decisions.',
    copy: 'Surface privacy risks from the assessment, compare inherent and residual exposure, and connect the controls that make treatment decisions defensible.',
    icon: ShieldCheck,
    tint: 'bg-[#eef8f4]',
    image: {
      src: '/dpia-risks.png',
      alt: 'Shieldwise DPIA risk register showing scored privacy risks and residual levels',
    },
  },
  {
    eyebrow: '03 · Programme oversight',
    title: 'Know what is moving, blocked, or due.',
    copy: 'Give privacy teams one view of assessment status, completeness, risks, and recent activity instead of chasing updates across email and spreadsheets.',
    icon: LockKeyhole,
    tint: 'bg-[#faf6ee]',
    image: {
      src: '/dpia-list.png',
      alt: 'Shieldwise DPIA list showing assessment references, status, completeness, and risks',
    },
  },
] as const;

function FeatureCard({ feature, index }: { feature: (typeof CAPABILITIES)[number]; index: number }) {
  const Icon = feature.icon;
  const reversed = index % 2 === 1;

  return (
    <article
      className={`relative h-full overflow-hidden rounded-[1.75rem] border border-black/[0.05] ${feature.tint}`}
    >
      <span
        aria-hidden
        className="absolute -right-2 -top-8 font-display text-[9rem] font-semibold leading-none tracking-[-0.08em] text-black/[0.025] sm:text-[13rem]"
      >
        0{index + 1}
      </span>

      <div className="relative mx-auto grid h-full w-full items-center gap-8 px-6 py-10 sm:px-10 md:grid-cols-[0.78fr_1.22fr] md:gap-12 md:py-14 lg:px-12">
        <div className={reversed ? 'md:order-2' : ''}>
          <span className="flex size-11 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-black/[0.04]">
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
          <p className="landing-eyebrow mt-6">{feature.eyebrow}</p>
          <h3 className="mt-3 max-w-lg text-3xl font-light leading-tight tracking-tight sm:text-4xl">
            {feature.title}
          </h3>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {feature.copy}
          </p>
          <ul className="mt-6 space-y-3 border-t border-black/[0.06] pt-5 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Connected to the assessment record
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-primary" /> Clear to contributors and reviewers
            </li>
          </ul>
        </div>

        <div
          className={`overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_28px_65px_-40px_rgba(15,23,42,0.4)] ${
            reversed ? 'md:order-1' : ''
          }`}
        >
          <div className="relative aspect-[1024/494] overflow-hidden bg-surface">
            <Image
              src={feature.image.src}
              alt={feature.image.alt}
              fill
              unoptimized
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        </div>

        <span className="absolute bottom-5 right-7 font-mono text-xs text-black/25">
          0{index + 1} / 0{CAPABILITIES.length}
        </span>
      </div>
    </article>
  );
}

export function ProductFeaturesStack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const track = trackRef.current;
    const pin = pinRef.current;
    const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];

    if (!track || !pin || cards.length < 2) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: reduce), (max-width: 767px)', () => {
        gsap.set(cards, { clearProps: 'all' });
        pin.style.height = 'auto';
        pin.style.overflowX = 'clip';
        pin.style.overflowY = 'visible';
        cards.forEach((card, index) => {
          card.style.position = 'relative';
          card.style.inset = 'auto';
          card.style.transform = 'none';
          card.style.zIndex = String(index + 1);
          card.style.marginTop = '0';
        });
      });

      media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        pin.style.height = '';
        pin.style.overflow = 'hidden';

        cards.forEach((card) => {
          card.style.position = '';
          card.style.marginTop = '';
        });

        gsap.set(cards, { transformOrigin: 'center bottom', force3D: true });
        gsap.set(cards[0]!, { yPercent: 0, scale: 1, y: 0 });
        gsap.set(cards.slice(1), { yPercent: 100, scale: 1, y: 0 });

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: track,
            start: 'top top',
            end: () => `+=${(cards.length - 1) * window.innerHeight}`,
            pin,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        for (let index = 1; index < cards.length; index += 1) {
          const position = index - 1;

          timeline.to(cards[index]!, { yPercent: 0, duration: 1 }, position);

          for (let previous = 0; previous < index; previous += 1) {
            const depth = index - previous;
            timeline.to(
              cards[previous]!,
              {
                scale: 1 - depth * 0.035,
                y: -depth * 12,
                duration: 1,
              },
              position,
            );
          }
        }

        const refresh = () => ScrollTrigger.refresh();
        window.addEventListener('resize', refresh);
        return () => window.removeEventListener('resize', refresh);
      });
    }, track);

    return () => context.revert();
  }, []);

  return (
    <div ref={trackRef} className="relative mt-14 w-full overflow-hidden md:mt-16 lg:mt-20">
      <div
        ref={pinRef}
        className="relative h-svh min-h-svh w-full overflow-hidden max-md:h-auto max-md:min-h-0 max-md:space-y-6 max-md:overflow-visible"
      >
        {CAPABILITIES.map((feature, index) => (
          <div
            key={feature.title}
            ref={(element) => {
              cardsRef.current[index] = element;
            }}
            className="absolute inset-0 max-md:relative max-md:inset-auto max-md:h-auto"
            style={{ zIndex: index + 1 }}
          >
            <FeatureCard feature={feature} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
}
