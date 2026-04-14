import Link from 'next/link';
import { Github, Plus, Search, Settings2 } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth-actions';
import { getCurrentUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';

export async function TopNav() {
  const user = await getCurrentUser();
  const { dict } = await getDictionary();

  const links = [
    { href: '/explore', label: dict.nav.explore },
    { href: '/crow-chat', label: dict.nav.crowChat },
  ];

  return (
    <header className="border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Github className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">Prompt-Hub</span>
        </Link>

        <div className="hidden flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 md:flex">
          <Search className="h-4 w-4" />
          <span>{dict.nav.searchPlaceholder}</span>
        </div>

        <nav className="ml-auto hidden items-center gap-5 text-sm text-zinc-300 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link href="/dashboard" className="transition hover:text-white">
                {dict.nav.myRepositories}
              </Link>
              <Link href="/workspaces" className="transition hover:text-white">
                {dict.nav.workspaces}
              </Link>
              <Link
                href="/dashboard/repositories/new"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:border-zinc-500"
              >
                <Plus className="h-4 w-4" />
                {dict.nav.create}
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-white hover:border-zinc-500"
              >
                <Settings2 className="h-4 w-4" />
                {dict.nav.settings}
              </Link>
              <Link href={`/profile/${user.username}`} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-white hover:border-zinc-600">
                @{user.username}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-white hover:border-zinc-500">
                  {dict.nav.signOut}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="transition hover:text-white">
                {dict.nav.signIn}
              </Link>
              <Link href="/sign-up" className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500">
                {dict.nav.signUp}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
