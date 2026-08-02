'use client';

import { LogOut, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dpias': 'DPIAs',
  '/risks': 'Risk register',
  '/controls': 'Controls',
  '/evidence': 'Evidence repository',
  '/reports': 'Reports',
  '/settings/organisation': 'Organisation',
  '/settings/members': 'Members',
};

function titleFor(pathname: string): string {
  if (pathname === '/dpias/new') return 'Start a DPIA';
  if (pathname.startsWith('/dpias/')) return 'DPIA assessment';
  return PAGE_TITLES[pathname] ?? 'Shieldwise';
}

export function Topbar() {
  const { user, activeOrgId, setActiveOrg, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeMembership = user?.memberships.find((m) => m.organisation.id === activeOrgId);
  const initials =
    user?.displayName
      ?.split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'SW';

  return (
    <header className="border-b border-border bg-surface px-4 pb-5 pt-5 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="relative min-w-0">
          <button
            className="flex h-11 max-w-xs items-center gap-2 truncate rounded-full border border-border bg-white px-4 text-sm font-medium text-ink shadow-soft transition hover:border-primary/25"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="truncate">
              {activeMembership?.organisation.name ?? 'Select organisation'}
            </span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>
          {open && user && user.memberships.length > 1 && (
            <div className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-white py-1 shadow-portal">
              {user.memberships.map((m) => (
                <button
                  key={m.organisation.id}
                  className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-section-wash"
                  onClick={() => {
                    setActiveOrg(m.organisation.id);
                    setOpen(false);
                  }}
                >
                  {m.organisation.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#1E3A5F] text-xs font-semibold text-white ring-4 ring-primary/10">
              {initials}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={logout}
            title="Sign out"
            className="size-10 rounded-full border-border bg-white shadow-soft"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-light tracking-tight text-ink sm:text-[1.75rem]">
        {titleFor(pathname)}
      </h1>
    </header>
  );
}
