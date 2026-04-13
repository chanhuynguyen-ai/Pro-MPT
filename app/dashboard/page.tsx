import Link from 'next/link';
import { FolderGit2, GitBranch, ArrowUpToLine, Star } from 'lucide-react';
import { repositories } from '@/lib/mock-data';
import { RepositoryCard } from '@/components/repository/repository-card';
import { StatCard } from '@/components/ui/stat-card';

export default function DashboardPage() {
  const mine = repositories.slice(0, 2);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">My repositories</h1>
          <p className="mt-2 text-sm text-zinc-400">Manage prompt repos, publish versions, and monitor reuse signals.</p>
        </div>
        <Link
          href="/dashboard/repositories/new"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          New repository
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Repositories" value="12" icon={<FolderGit2 className="h-4 w-4" />} />
        <StatCard label="Published versions" value="29" icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="Total downloads" value="380" icon={<ArrowUpToLine className="h-4 w-4" />} />
        <StatCard label="Stars received" value="512" icon={<Star className="h-4 w-4" />} />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-black/20 p-5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recent repositories</h2>
          <span className="text-sm text-zinc-500">2 shown in starter data</span>
        </div>
        <div className="grid gap-4">
          {mine.map((repository) => (
            <RepositoryCard key={repository.id} repository={repository} />
          ))}
        </div>
      </div>
    </div>
  );
}
