import Link from 'next/link';
import { RepositorySourceMode } from '@prisma/client';
import { RepositoryCard } from '@/components/repository/repository-card';
import { CATEGORY_OPTIONS, COMPATIBILITY_LABEL_TO_ENUM, REPOSITORY_SOURCE_MODES, SUPPORTED_MODEL_OPTIONS } from '@/lib/constants';
import { getCurrentUser } from '@/lib/auth';
import { getExploreRepositories } from '@/lib/repositories';

function readSearchParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getCurrentUser();
  const resolved = (await searchParams) ?? {};
  const q = readSearchParam(resolved.q, '');
  const category = readSearchParam(resolved.category, 'All');
  const aiLabel = readSearchParam(resolved.ai, 'All models');
  const visibility = readSearchParam(resolved.visibility, 'public') as 'public' | 'all';
  const source = readSearchParam(resolved.source, 'ALL') as RepositorySourceMode | 'ALL';
  const aiEnum = aiLabel === 'All models' ? 'All models' : COMPATIBILITY_LABEL_TO_ENUM[aiLabel as keyof typeof COMPATIBILITY_LABEL_TO_ENUM];

  const repositories = await getExploreRepositories({
    q,
    category,
    ai: aiEnum,
    visibility,
    sourceMode: source,
    viewerUserId: viewer?.id,
  });

  const sourceSummary = source === 'ALL' ? 'all repository types' : source === 'MANUAL' ? 'web-authored prompt repos' : 'uploaded bundle repos';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Explore prompt repositories</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Discover public prompt skills by category, compatible AI, source mode, tags, popularity, and uploaded knowledge bundles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/explore" className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white">
            Reset filters
          </Link>
          {['All', ...CATEGORY_OPTIONS].map((item) => {
            const isActive = item === category;
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (item !== 'All') params.set('category', item);
            if (aiLabel !== 'All models') params.set('ai', aiLabel);
            if (source !== 'ALL') params.set('source', source);
            if (visibility !== 'public' && viewer) params.set('visibility', visibility);
            return (
              <Link
                key={item}
                href={`/explore${params.toString() ? `?${params.toString()}` : ''}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-blue-700 bg-blue-950/40 text-blue-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {item}
              </Link>
            );
          })}
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-6">
        <input name="q" defaultValue={q} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 md:col-span-2" placeholder="Search repositories, tags, owners, bundle files, or prompt text" />
        <select name="category" defaultValue={category} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
          <option value="All">Category: All</option>
          {CATEGORY_OPTIONS.map((item) => (
            <option key={item} value={item}>Category: {item}</option>
          ))}
        </select>
        <select name="source" defaultValue={source} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
          <option value="ALL">Source: All</option>
          {REPOSITORY_SOURCE_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>Source: {mode.label}</option>
          ))}
        </select>
        <select name="visibility" defaultValue={visibility} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none" disabled={!viewer}>
          <option value="public">Visibility: Public</option>
          <option value="all">Visibility: My public + private</option>
        </select>
        <div className="flex gap-3">
          <select name="ai" defaultValue={aiLabel} className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
            {SUPPORTED_MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>AI: {model}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Apply</button>
        </div>
      </form>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Current scope</div>
        <p className="text-sm leading-6 text-zinc-300">
          Showing results across <span className="font-semibold text-white">{sourceSummary}</span>{q ? <>, matching the query <span className="font-semibold text-white">{q}</span></> : ''}.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Popular compatibility filters</div>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_MODEL_OPTIONS.map((model) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (category !== 'All') params.set('category', category);
            if (source !== 'ALL') params.set('source', source);
            if (visibility !== 'public' && viewer) params.set('visibility', visibility);
            if (model !== 'All models') params.set('ai', model);
            const isActive = model === aiLabel;
            return (
              <Link
                key={model}
                href={`/explore${params.toString() ? `?${params.toString()}` : ''}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
                    : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300 hover:border-emerald-700 hover:text-white'
                }`}
              >
                {model}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4 text-sm text-zinc-400">Showing <span className="font-semibold text-white">{repositories.length}</span> repository results.</div>

      <div className="grid gap-4">
        {repositories.length ? repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} />) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-sm text-zinc-400">
            No repositories matched the current filters. Try searching a file name from an uploaded bundle, switching source mode, or clearing the AI filter.
          </div>
        )}
      </div>
    </div>
  );
}
