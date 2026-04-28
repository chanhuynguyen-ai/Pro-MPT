import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/layout/top-nav';
import { getLanguage } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Prompt-Hub MVP1',
  description: 'Git-inspired workspace for managing prompt repositories, knowledge bundles, and grounded AI workflows.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();

  return (
    <html lang={language}>
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
