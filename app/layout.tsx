import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/layout/top-nav';

export const metadata: Metadata = {
  title: 'Prompt-Hub MVP1',
  description: 'GitHub-style MVP starter for managing prompts and prompt skills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
