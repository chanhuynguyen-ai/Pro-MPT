import Link from 'next/link';
import { FolderKanban, Layers3, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getWorkspaceOptionsForUser, hasWorkspaceSupport } from '@/lib/workspaces';
import { createWorkspaceAction } from '@/app/actions/workspace-actions';

export default async function WorkspacesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('/workspaces');
  const resolved = (await searchParams) ?? {};
  const error = Array.isArray(resolved.error) ? resolved.error[0] : resolved.error;
  const workspaces = await getWorkspaceOptionsForUser(user.id);
  const workspaceSupport = hasWorkspaceSupport();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {error ? <div className="mb-6 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">{error === 'duplicate-name' ? 'A workspace with this name already exists.' : error === 'workspace-support-unavailable' ? 'Workspace support is not available in your current Prisma client yet.' : 'Could not load or create the workspace.'}</div> : null}
      {!workspaceSupport ? <div className="mb-6 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">Workspace support is not available in your current Prisma client yet. Run <code className="rounded bg-black px-1 py-0.5">npm run prisma:generate</code> and <code className="rounded bg-black px-1 py-0.5">npm run prisma:dbpush</code>, then restart the dev server.</div> : null}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Workspaces</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Create multi-repository collections for Crow-Chat. A workspace can combine your own repos with starred repos so the chatbot can reason across several libraries at once.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Plus className="h-4 w-4" /> Create workspace</div>
          <form action={createWorkspaceAction} className="space-y-4">
            <label className="grid gap-2 text-sm text-zinc-300">
              <span>Name</span>
              <input name="name" placeholder="Support + Growth Ops" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              <span>Description</span>
              <textarea name="description" placeholder="Combine customer-support playbooks, private notes, and prompt repos for multi-repo chat." className="min-h-28 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" />
            </label>
            <button type="submit" disabled={!workspaceSupport} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" /> Create workspace</button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Layers3 className="h-4 w-4" /> Existing workspaces</div>
          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.length ? workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/workspaces/${workspace.id}`} className="rounded-2xl border border-zinc-800 bg-black p-5 hover:border-zinc-700">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{workspace.name}</div>
                  <div className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-wide text-zinc-400">{workspace.repositoryCount} repos</div>
                </div>
                <p className="text-sm leading-6 text-zinc-400">{workspace.description}</p>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-6 text-sm text-zinc-400">
                {workspaceSupport ? 'No workspaces yet. Create your first multi-repository workspace to unlock cross-repo Crow-Chat.' : 'Workspace data will appear here after you regenerate Prisma client and push the updated schema.'}
              </div>
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 text-sm leading-6 text-zinc-400">
            <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><FolderKanban className="h-4 w-4" /> MVP2 direction</div>
            Workspaces are the first step toward multi-repo AI operations. Later they can become team collections, project folders, or deployment-ready chatbot libraries.
          </div>
        </section>
      </div>
    </div>
  );
}
