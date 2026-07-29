import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Shieldwise — DPIA Generator',
  description:
    'Generate, score, and approve UK GDPR Article 35 Data Protection Impact Assessments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${bricolage.variable} ${dmMono.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
