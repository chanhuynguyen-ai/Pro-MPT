import { notFound } from 'next/navigation';
import { FolderGit2, Star } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getWorkspaceDetailForUser, hasWorkspaceSupport } from '@/lib/workspaces';
import { saveWorkspaceRepositoriesAction } from '@/app/actions/workspace-actions';

export default async function WorkspaceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('/workspaces');
  const { id } = await params;
  const resolved = (await searchParams) ?? {};
  const created = Array.isArray(resolved.created) ? resolved.created[0] : resolved.created;
  const saved = Array.isArray(resolved.saved) ? resolved.saved[0] : resolved.saved;
  const workspaceSupport = hasWorkspaceSupport();
  const workspace = await getWorkspaceDetailForUser(id, user.id);

  if (!workspaceSupport) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">Workspace support is not available in your current Prisma client yet. Run <code className="rounded bg-black px-1 py-0.5">npm run prisma:generate</code> and <code className="rounded bg-black px-1 py-0.5">npm run prisma:dbpush</code>, then restart the dev server.</div>
      </div>
    );
  }

  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {created === '1' ? <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">Workspace created successfully.</div> : null}
      {saved === '1' ? <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">Workspace repositories updated successfully.</div> : null}
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">{workspace.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{workspace.description}</p>
        </div>
        <div className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400">{workspace.repositories.length} repos in workspace</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><FolderGit2 className="h-4 w-4" /> Current workspace library</div>
          <div className="grid gap-3">
            {workspace.repositories.length ? workspace.repositories.map((repo) => (
              <div key={repo.id} className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                <div className="font-medium text-white">{repo.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{repo.sourceModeLabel} • {repo.visibility}</div>
              </div>
            )) : <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-6 text-sm text-zinc-400">No repositories are attached yet. Use the panel on the right to add owned or starred repos.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Star className="h-4 w-4" /> Workspace sources</div>
          <form action={saveWorkspaceRepositoriesAction.bind(null, workspace.id)} className="space-y-4">
            <p className="text-sm leading-6 text-zinc-400">Choose the repositories Crow-Chat should treat as a single workspace library. You can mix your own repos with repositories you have starred.</p>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {workspace.availableRepositories.map((repo) => (
                <label key={repo.id} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-300">
                  <input type="checkbox" name="repositoryIds" value={repo.id} defaultChecked={repo.selected} className="mt-1 h-4 w-4 rounded border-zinc-700 bg-black text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{repo.label}</span>
                      {repo.isStarred ? <span className="rounded-full border border-amber-800 bg-amber-950/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">starred</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{repo.sourceModeLabel} • {repo.visibility}</div>
                  </div>
                </label>
              ))}
            </div>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">Save workspace library</button>
          </form>
        </section>
      </div>
    </div>
  );
}
