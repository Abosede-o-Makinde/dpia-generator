'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Paperclip,
  BarChart3,
  Settings,
  ShieldQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dpias', label: 'DPIAs', icon: FileText },
  { href: '/risks', label: 'Risk register', icon: AlertTriangle },
  { href: '/controls', label: 'Controls', icon: ShieldCheck },
  { href: '/evidence', label: 'Evidence', icon: Paperclip },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings/organisation', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-6 pb-2 pt-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-section-wash text-primary">
          <ShieldQuestion className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-tight text-ink">Shieldwise</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
            DPIA generator
          </p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-0.5 px-3">
        <p className="mb-2 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Assessments
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-sm transition-colors',
                active
                  ? 'font-semibold text-[#0F172A]'
                  : 'font-medium text-slate-500 hover:bg-white/60 hover:text-ink',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-slate-400')}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-2xl bg-primary p-4 text-white shadow-lg shadow-primary/20">
        <p className="text-sm font-semibold">Assess new processing</p>
        <p className="mt-1 text-xs text-white/80">
          Start a guided UK GDPR DPIA and document the risks.
        </p>
        <Link
          href="/dpias/new"
          className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-primary transition hover:-translate-y-px"
        >
          New DPIA
        </Link>
      </div>
    </aside>
  );
}
