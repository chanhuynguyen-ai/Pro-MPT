import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/layout/top-nav';
import { getLanguage } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Prompt-Hub MVP1',
  description: 'GitHub-style MVP starter for managing prompts and prompt skills.',
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
