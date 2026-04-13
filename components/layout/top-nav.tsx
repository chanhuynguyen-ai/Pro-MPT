import Link from 'next/link';
import { Github, Plus, Search } from 'lucide-react';

const links = [
  { href: '/explore', label: 'Explore' },
  { href: '/dashboard', label: 'My Repositories' },
  { href: '/dashboard/repositories/new', label: 'New' },
];

export function TopNav() {
  return (
    <header className="border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Github className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">Prompt-Hub</span>
        </Link>

        <div className="hidden flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 md:flex">
          <Search className="h-4 w-4" />
          <span>Search or jump to...</span>
        </div>

        <nav className="ml-auto hidden items-center gap-5 text-sm text-zinc-300 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard/repositories/new"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:border-zinc-500"
          >
            <Plus className="h-4 w-4" />
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
