import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getWorkspaceDetailForUser, hasWorkspaceSupport } from '@/lib/workspaces';
import { getOllamaStatus } from '@/lib/ollama';
import { getUserRemoteLlmConfigs } from '@/lib/remote-llm';
import { WorkspaceOptimizerShell } from '@/components/workspaces/workspace-optimizer-shell';

export default async function WorkspaceOptimizerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('/workspaces');
  const { id } = await params;

  if (!hasWorkspaceSupport()) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">Workspace support is not available in your current Prisma client yet. Run <code className="rounded bg-black px-1 py-0.5">npm run prisma:generate</code> and <code className="rounded bg-black px-1 py-0.5">npm run prisma:dbpush</code>, then restart the dev server.</div>
      </div>
    );
  }

  const workspace = await getWorkspaceDetailForUser(id, user.id);
  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">Workspace not found.</div>
      </div>
    );
  }

  const [ollama, remoteConfigs] = await Promise.all([getOllamaStatus(), getUserRemoteLlmConfigs(user.id)]);
  const modelOptions = [
    ...ollama.installedModels.map((model) => ({ id: `local:${model.name}`, label: `${model.name} • local`, kind: 'local' as const, value: model.name })),
    ...remoteConfigs.map((config) => ({ id: `api:${config.id}`, label: `${config.label?.trim() || config.model} • api`, kind: 'api' as const, value: config.id })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">MVP2 • Workspace AI tools</div>
          <h1 className="text-3xl font-semibold text-white">Workspace Optimizer</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Optimize how <span className="font-medium text-white">{workspace.name}</span> should behave as a multi-repository AI workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspace.id}`} className="rounded-md border border-zinc-700 bg-black px-4 py-2 text-sm text-white hover:border-zinc-500">Back to workspace</Link>
          <Link href="/crow-chat" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Open Crow-Chat</Link>
        </div>
      </div>

      <WorkspaceOptimizerShell workspaceId={workspace.id} workspaceName={workspace.name} modelOptions={modelOptions} />
    </div>
  );
}
