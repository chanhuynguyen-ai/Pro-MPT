import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryCompareData, getRepositoryCompareRunHistory } from '@/lib/repositories';
import { getOllamaStatus } from '@/lib/ollama';
import { getUserRemoteLlmConfigs } from '@/lib/remote-llm';
import { OutputCompareShell } from '@/components/repository/output-compare-shell';
import { notFound } from 'next/navigation';

export default async function RepositoryOutputComparePage({ params }: { params: Promise<{ owner: string; slug: string }> }) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const compareData = await getRepositoryCompareData(owner, slug, viewer?.id);
  if (!compareData || compareData.versions.length < 2) notFound();

  const history = await getRepositoryCompareRunHistory(owner, slug, viewer?.id);

  const [ollama, remoteConfigs] = viewer
    ? await Promise.all([getOllamaStatus(), getUserRemoteLlmConfigs(viewer.id)])
    : [{ installedModels: [] }, [] as Awaited<ReturnType<typeof getUserRemoteLlmConfigs>>];

  const modelOptions = [
    ...(Array.isArray(ollama.installedModels)
      ? ollama.installedModels.map((model) => ({ id: `local:${model.name}`, label: `${model.name} • local`, kind: 'local' as const, value: model.name }))
      : []),
    ...remoteConfigs.map((config) => ({ id: `api:${config.id}`, label: `${config.label?.trim() || config.model} • api`, kind: 'api' as const, value: config.id })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            <ArrowLeftRight className="h-3.5 w-3.5" /> MVP2 · A/B compare outputs
          </div>
          <h1 className="text-3xl font-semibold text-white">Compare live outputs</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">Run the same test input through two versions of this repository and compare the real answers side by side using the same selected model.</p>
        </div>
        <Link href={`/repositories/${owner}/${slug}`} className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">Back to repository</Link>
      </div>

      <OutputCompareShell owner={owner} slug={slug} versions={compareData.versions.map((version) => ({ version: version.version, createdAt: version.createdAt, changelog: version.changelog }))} modelOptions={modelOptions} history={history} />
    </div>
  );
}
