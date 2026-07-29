import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-svh overflow-hidden bg-white">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto bg-surface">
            <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
