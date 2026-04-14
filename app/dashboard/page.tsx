import Link from 'next/link';
import { RepositorySourceMode } from '@prisma/client';
import { ArrowUpToLine, Bot, FileStack, FolderGit2, GitBranch, Star } from 'lucide-react';
import { RepositoryCard } from '@/components/repository/repository-card';
import { StatCard } from '@/components/ui/stat-card';
import { requireUser } from '@/lib/auth';
import { getDashboardData } from '@/lib/repositories';

function readSearchParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/dashboard');
  const resolved = (await searchParams) ?? {};
  const deleted = Array.isArray(resolved.deleted) ? resolved.deleted[0] : resolved.deleted;
  const q = readSearchParam(resolved.q, '');
  const source = readSearchParam(resolved.source, 'ALL') as RepositorySourceMode | 'ALL';
  const data = await getDashboardData(user.id, { q, sourceMode: source });

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-zinc-400 lg:px-6">
        Your account was not found. Sign out and sign back in.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {deleted === '1' ? <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">Repository deleted successfully.</div> : null}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">My repositories</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Workspace for @{data.user.username}. Manage prompt repos, upload bundle files, publish versions, and control ownership.
          </p>
        </div>
        <Link
          href="/dashboard/repositories/new"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          New repository
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Repositories" value={String(data.stats.repositories)} icon={<FolderGit2 className="h-4 w-4" />} />
        <StatCard label="Published versions" value={String(data.stats.publishedVersions)} icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="Total downloads" value={String(data.stats.totalDownloads)} icon={<ArrowUpToLine className="h-4 w-4" />} />
        <StatCard label="Stars received" value={String(data.stats.starsReceived)} icon={<Star className="h-4 w-4" />} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Web prompt repos" value={String(data.stats.webPromptRepositories)} icon={<Bot className="h-4 w-4" />} />
        <StatCard label="Bundle repos" value={String(data.stats.bundleRepositories)} icon={<FileStack className="h-4 w-4" />} />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          <Bot className="h-4 w-4" />
          Repository standard for MVP1
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          Every repository should declare category, visibility, tags, source mode, and compatible AI targets. Upload-backed repositories can now store file bundles on the web for grounded context and search.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          <FileStack className="h-4 w-4" />
          Personal workflow target
        </div>
        <p className="text-sm leading-6 text-zinc-300">
          Use Prompt-Hub either as a prompt repository you write directly in the browser, or as a bundle repository that stores prompt files, notes, skills, docs, or zipped folders from your machine.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Workspace repositories</h2>
            <p className="mt-1 text-sm text-zinc-500">Loaded from Prisma for your authenticated workspace.</p>
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input name="q" defaultValue={q} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500" placeholder="Search name, tags, bundle files, or prompt text" />
            <select name="source" defaultValue={source} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
              <option value="ALL">All sources</option>
              <option value="MANUAL">Web prompt</option>
              <option value="UPLOAD_BUNDLE">Uploaded bundle</option>
            </select>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Apply</button>
          </form>
        </div>
        <div className="mb-4 text-sm text-zinc-400">Showing <span className="font-semibold text-white">{data.repositories.length}</span> repositories in your current workspace view.</div>
        <div className="grid gap-4">
          {data.repositories.length ? data.repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} />) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-6 text-sm text-zinc-400">
              No repositories matched the current dashboard filters. Try clearing the search or switching the source mode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
