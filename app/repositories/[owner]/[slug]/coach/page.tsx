import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryDetail } from '@/lib/repositories';
import { PromptCoachShell } from '@/components/repository/prompt-coach-shell';

export default async function RepositoryCoachPage({ params }: { params: Promise<{ owner: string; slug: string }> }) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const repository = await getRepositoryDetail(owner, slug, viewer?.id);
  if (!repository) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400"><Sparkles className="h-3.5 w-3.5" /> MVP2 optimizer · AI prompt optimizer</div>
          <h1 className="text-3xl font-semibold text-white">Prompt Optimizer for {repository.owner}/{repository.slug}</h1>
          <p className="mt-2 text-sm text-zinc-400">Ask Crow to critique this repo, rewrite the prompt pack, improve grounded behavior, and suggest stronger bundle docs.</p>
        </div>
        <Link href={`/repositories/${repository.owner}/${repository.slug}`} className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">Back to repository</Link>
      </div>
      <PromptCoachShell owner={owner} slug={slug} />
    </div>
  );
}
