import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bot, GitBranch, Shield } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryDetail } from '@/lib/repositories';
import { RepoChatSandbox } from '@/components/chat/repo-chat-sandbox';

export default async function RepositoryChatPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const repository = await getRepositoryDetail(owner, slug, viewer?.id);

  if (!repository) notFound();

  const latest = repository.versions[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link href={`/repositories/${repository.owner}/${repository.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to repository
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.visibility}</span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.category}</span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.sourceModeLabel}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Chat with {repository.owner}/{repository.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">Use this sandbox to test how a chatbot should answer when grounded by this repository&apos;s prompt skill and uploaded files.</p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-400 sm:text-right">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Latest version</div>
            <div className="mt-1 flex items-center gap-2 font-semibold text-white sm:justify-end"><GitBranch className="h-4 w-4" /> {latest.version}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Prompt target</div>
            <div className="mt-1 flex items-center gap-2 font-semibold text-white sm:justify-end"><Bot className="h-4 w-4" /> {repository.supportedModels.join(', ')}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Access</div>
            <div className="mt-1 flex items-center gap-2 font-semibold text-white sm:justify-end"><Shield className="h-4 w-4" /> {repository.viewerCanEdit ? 'Owner access' : 'Viewer access'}</div>
          </div>
        </div>
      </div>

      <RepoChatSandbox
        owner={repository.owner}
        slug={repository.slug}
        repositoryName={repository.name}
        latestVersion={latest.version}
        sourceModeLabel={repository.sourceModeLabel}
        supportedModels={repository.supportedModels}
        hasLiveModel={Boolean(process.env.OPENAI_API_KEY)}
      />
    </div>
  );
}
