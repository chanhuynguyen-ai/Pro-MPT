import Link from 'next/link';
import { CompatibilityTarget, RepositoryKind, RepositorySourceMode } from '@prisma/client';
import { CATEGORY_OPTIONS } from '@/lib/constants';
import { getCurrentUser } from '@/lib/auth';
import { getExploreRepositories } from '@/lib/repositories';
import { RepositoryCard } from '@/components/repository/repository-card';

const kindTabs: Array<{ key: RepositoryKind; label: string; description: string }> = [
  { key: 'PROMPT_TEXT', label: 'Prompt text', description: 'Prompt chữ cho tác vụ, phân tích và xử lý công việc.' },
  { key: 'PROMPT_IMAGE', label: 'Prompt image', description: 'Prompt tạo ảnh, có preview repo ảnh và style đã tạo.' },
  { key: 'SKILL', label: 'Skill', description: 'Tác tử nhiệm vụ chuyên biệt cho Claude / ChatGPT skill / workflow bot.' },
];

function resolveSourceMode(value?: string): RepositorySourceMode | 'ALL' {
  return value === 'UPLOAD_BUNDLE' || value === 'MANUAL' ? value : 'ALL';
}

function resolveAi(value?: string): CompatibilityTarget | 'All models' {
  return value === 'CHATGPT' || value === 'CLAUDE' || value === 'CLAUDE_CODE' || value === 'GEMINI' || value === 'ALL_MODELS'
    ? value
    : 'All models';
}

function resolveKind(value?: string): RepositoryKind {
  return value === 'PROMPT_IMAGE' || value === 'SKILL' ? value : 'PROMPT_TEXT';
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getCurrentUser();
  const resolved = (await searchParams) ?? {};

  const q = Array.isArray(resolved.q) ? resolved.q[0] : resolved.q;
  const category = Array.isArray(resolved.category) ? resolved.category[0] : resolved.category;
  const ai = resolveAi(Array.isArray(resolved.ai) ? resolved.ai[0] : resolved.ai);
  const sourceMode = resolveSourceMode(Array.isArray(resolved.sourceMode) ? resolved.sourceMode[0] : resolved.sourceMode);
  const kind = resolveKind(Array.isArray(resolved.kind) ? resolved.kind[0] : resolved.kind);

  const repositories = await getExploreRepositories({
    q,
    category: category && category !== 'All' ? category : undefined,
    ai,
    sourceMode,
    kind,
    visibility: viewer ? 'all' : 'public',
    viewerUserId: viewer?.id,
  });

  const activeTab = kindTabs.find((item) => item.key === kind) ?? kindTabs[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-400">Explore</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Khám phá repo theo 3 mảng riêng</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Explore hiện được chia rõ thành Prompt text, Prompt image và Skill. Prompt image ưu tiên repo có ảnh mẫu, preview gallery và style hình ảnh; Skill là mảng tách riêng cho các tác tử chuyên biệt.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
            <div className="font-medium text-white">Đang xem</div>
            <div className="mt-1">{activeTab.label}</div>
            <div className="mt-1 text-xs text-zinc-500">{activeTab.description}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {kindTabs.map((tab) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (category) params.set('category', category);
            if (ai !== 'All models') params.set('ai', ai);
            if (sourceMode !== 'ALL') params.set('sourceMode', sourceMode);
            params.set('kind', tab.key);

            return (
              <Link
                key={tab.key}
                href={`/explore?${params.toString()}`}
                className={`rounded-2xl border p-4 transition ${kind === tab.key ? 'border-emerald-700 bg-emerald-950/20' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}
              >
                <div className="text-base font-semibold text-white">{tab.label}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">{tab.description}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <form className="mt-8 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input type="hidden" name="kind" value={kind} />
        <label className="grid gap-2 text-sm text-zinc-300">
          Search
          <input name="q" defaultValue={q} placeholder={kind === 'PROMPT_IMAGE' ? 'Search image prompt, style, visual tag...' : kind === 'SKILL' ? 'Search skill, agent, workflow...' : 'Search prompt, task, repo...'} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Category
          <select name="category" defaultValue={category ?? 'All'} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
            <option value="All">All</option>
            {CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Model
          <select name="ai" defaultValue={ai} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
            <option value="All models">All models</option>
            <option value="CHATGPT">ChatGPT</option>
            <option value="CLAUDE">Claude</option>
            <option value="CLAUDE_CODE">Claude Code</option>
            <option value="GEMINI">Gemini</option>
            <option value="ALL_MODELS">All models / universal</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Source
          <select name="sourceMode" defaultValue={sourceMode} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
            <option value="ALL">All</option>
            <option value="MANUAL">Web prompt</option>
            <option value="UPLOAD_BUNDLE">Uploaded bundle</option>
          </select>
        </label>
        <button type="submit" className="mt-auto h-[42px] rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">Apply filters</button>
      </form>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {repositories.length ? repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} />) : (
          <div className="md:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
            <div className="text-lg font-semibold text-white">No repositories found</div>
            <p className="mt-3 text-sm leading-6">Try another keyword, switch the explore tab, or loosen the filters. Prompt image repos become more visible when they include image files and a style label.</p>
          </div>
        )}
      </div>
    </div>
  );
}
