import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Bot, CheckCircle2, Download, GitBranch, GitFork, Image as ImageIcon, Lock, Pencil, Shield, ShieldAlert, Sparkles, Star } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryDetail } from '@/lib/repositories';
import { cloneRepositoryAction, toggleStarRepositoryAction } from '@/app/actions/repository-actions';
import { CopyButton } from '@/components/ui/copy-button';
import { ShareRepositoryButton } from '@/components/ui/share-repository-button';
import { CopyablePromptBlock } from '@/components/repository/copyable-prompt-block';
import { BundleExplorer } from '@/components/repository/bundle-explorer';

function buildCombinedPrompt(repository: Awaited<ReturnType<typeof getRepositoryDetail>>) {
  if (!repository) return '';
  const latest = repository.versions[0];
  const assetContext = repository.assets.length
    ? `\n\n## Uploaded bundle files\n${repository.assets
        .map((asset) => {
          const preview = asset.isText && asset.previewText ? `\nPreview:\n${asset.previewText.slice(0, 1200)}` : '';
          return `- ${asset.relativePath || asset.originalName} (${asset.sizeLabel})${preview}`;
        })
        .join('\n\n')}`
    : '';

  return [
    `Repository: ${repository.owner}/${repository.name}`,
    `Type: ${repository.kindLabel}`,
    `Description: ${repository.description}`,
    `Category: ${repository.category}`,
    `Mode: ${repository.sourceModeLabel}`,
    repository.imageStyle ? `Image style: ${repository.imageStyle}` : '',
    `Compatible AI: ${repository.supportedModels.join(', ')}`,
    `Latest version: ${latest.version}`,
    '',
    '## System prompt',
    latest.systemPrompt,
    '',
    '## User prompt template',
    latest.userTemplate,
    '',
    '## Variables',
    latest.variables.join(', ') || 'none',
    '',
    '## Output format',
    latest.outputFormat,
    '',
    '## Notes',
    latest.notes || 'No notes provided.',
    assetContext,
  ].filter(Boolean).join('\n');
}

function SafetyBanner({ status, summary, flags }: { status: 'REVIEWED' | 'WARNING' | 'BLOCKED'; summary: string; flags: string[] }) {
  if (status === 'BLOCKED') {
    return (
      <div className="mb-6 rounded-xl border border-sky-700 bg-sky-950/30 p-4 text-sm text-sky-100">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">LƯU Ý QUAN TRỌNG</div>
            <p className="mt-1 leading-6">{summary}</p>
            {flags.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-sky-100/90">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
            <p className="mt-3 text-xs text-sky-100/80">Các mô hình AI tạo phản hồi và đầu ra dựa trên các thuật toán phức tạp và kỹ thuật học máy, đồng thời những phản hồi hoặc đầu ra đó có thể không chính xác, có hại, thiên vị hoặc không đúng đắn. Bằng cách thử nghiệm mô hình này, bạn chịu rủi ro về bất kỳ tác hại nào do bất kỳ phản hồi hoặc đầu ra nào của mô hình gây ra. Vui lòng không tải lên bất kỳ thông tin bí mật hoặc dữ liệu cá nhân nào trừ khi được cho phép rõ ràng. Việc sử dụng của bạn được ghi lại vì mục đích bảo mật.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'WARNING') {
    return (
      <div className="mb-6 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Cảnh báo an toàn nội dung</div>
            <p className="mt-1 leading-6">{summary}</p>
            {flags.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
            <p className="mt-3 text-xs text-amber-100/80">Vui lòng không làm theo các chỉ dẫn yêu cầu chia sẻ thông tin cá nhân, khóa bí mật, dữ liệu tài khoản hoặc gửi dữ liệu ra ngoài khi chưa được xác minh.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 text-sm text-emerald-200">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-medium">Đã kiểm duyệt</div>
          <p className="mt-1 leading-6">{summary}</p>
        </div>
      </div>
    </div>
  );
}

export default async function RepositoryDetailPage({ params, searchParams }: { params: Promise<{ owner: string; slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>>; }) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const resolved = (await searchParams) ?? {};
  const created = Array.isArray(resolved.created) ? resolved.created[0] : resolved.created;
  const updated = Array.isArray(resolved.updated) ? resolved.updated[0] : resolved.updated;
  const cloned = Array.isArray(resolved.cloned) ? resolved.cloned[0] : resolved.cloned;
  const starred = Array.isArray(resolved.starred) ? resolved.starred[0] : resolved.starred;
  const repository = await getRepositoryDetail(owner, slug, viewer?.id);

  if (!repository) notFound();

  const latest = repository.versions[0];
  const combinedPrompt = buildCombinedPrompt(repository);
  const repositoryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/repositories/${repository.owner}/${repository.slug}`;
  const downloadBase = `/repositories/${repository.owner}/${repository.slug}/download`;
  const isBlocked = repository.reviewStatus === 'BLOCKED';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-6 space-y-3">
        {created === '1' ? <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">Repository created successfully.</div> : null}
        {updated === '1' ? <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-4 text-sm text-blue-200">Published a new version and updated repository metadata.</div> : null}
        {cloned === '1' ? <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">Repository cloned into your workspace.</div> : null}
        {starred === '1' ? <div className="rounded-xl border border-yellow-900/60 bg-yellow-950/30 p-4 text-sm text-yellow-200">Repository starred.</div> : null}
        {starred === '0' ? <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">Repository unstarred.</div> : null}
      </div>

      <SafetyBanner status={repository.reviewStatus} summary={repository.reviewSummary} flags={repository.reviewFlags} />

      <div className="mb-8 flex flex-col gap-5 border-b border-zinc-800 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 uppercase tracking-wide">{repository.visibility}</span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.kindLabel}</span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.category}</span>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.sourceModeLabel}</span>
            {repository.assetCount ? <span className="rounded-full border border-zinc-700 px-2.5 py-1">{repository.assetCount} files</span> : null}
            <span className={`rounded-full border px-2.5 py-1 ${repository.reviewStatus === 'BLOCKED' ? 'border-sky-700 text-sky-300' : repository.reviewStatus === 'WARNING' ? 'border-amber-700 text-amber-300' : 'border-emerald-700 text-emerald-300'}`}>{repository.reviewStatus === 'BLOCKED' ? 'Blocked' : repository.reviewStatus === 'WARNING' ? 'Needs review' : 'Reviewed'}</span>
          </div>
          <h1 className="text-3xl font-semibold text-white"><span className="text-blue-400">{repository.owner}</span> / {repository.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">{repository.description}</p>
          {repository.kind === 'PROMPT_IMAGE' && repository.imageStyle ? <div className="mt-4 inline-flex rounded-full border border-fuchsia-800 bg-fuchsia-950/30 px-3 py-1 text-xs text-fuchsia-200">Image style: {repository.imageStyle}</div> : null}
          <div className="mt-4 flex flex-wrap gap-2">{repository.tags.map((tag) => <span key={tag} className="rounded-full bg-blue-950/50 px-2.5 py-1 text-xs text-blue-300">{tag}</span>)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewer ? (
            <form action={toggleStarRepositoryAction}><input type="hidden" name="repositoryId" value={repository.id} /><input type="hidden" name="owner" value={repository.owner} /><input type="hidden" name="slug" value={repository.slug} /><button type="submit" className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${repository.viewerHasStarred ? 'border-yellow-700 bg-yellow-950/40 text-yellow-200 hover:border-yellow-500' : 'border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500'}`}><Star className={`h-4 w-4 ${repository.viewerHasStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />{repository.viewerHasStarred ? 'Unstar' : 'Star'}</button></form>
          ) : <Link href={`/sign-in?next=${encodeURIComponent(`/repositories/${repository.owner}/${repository.slug}`)}`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><Star className="h-4 w-4" />Sign in to star</Link>}
          {viewer ? (
            <form action={cloneRepositoryAction}><input type="hidden" name="sourceRepositoryId" value={repository.id} /><input type="hidden" name="sourceOwner" value={repository.owner} /><input type="hidden" name="sourceSlug" value={repository.slug} /><button type="submit" className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><GitFork className="h-4 w-4" />Clone</button></form>
          ) : <Link href={`/sign-in?next=${encodeURIComponent(`/repositories/${repository.owner}/${repository.slug}`)}`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><GitFork className="h-4 w-4" />Sign in to clone</Link>}
          <div className="relative"><details className="group"><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><Download className="h-4 w-4" />Download</summary><div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-zinc-800 bg-black p-2 shadow-2xl shadow-black/50"><Link href={`${downloadBase}?format=md`} className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white">Markdown (.md)</Link><Link href={`${downloadBase}?format=json`} className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white">JSON (.json)</Link><Link href={`${downloadBase}?format=txt`} className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white">Text (.txt)</Link></div></details></div>
          {isBlocked ? <span className="inline-flex items-center gap-2 rounded-md border border-sky-800 bg-sky-950/30 px-3 py-2 text-sm font-medium text-sky-200"><Lock className="h-4 w-4" />Chat blocked</span> : <Link href={`/repositories/${repository.owner}/${repository.slug}/chat`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><Bot className="h-4 w-4" />Chat sandbox</Link>}
          {repository.versions.length > 1 ? <Link href={`/repositories/${repository.owner}/${repository.slug}/compare`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><GitBranch className="h-4 w-4" />Compare</Link> : null}
          <Link href={`/repositories/${repository.owner}/${repository.slug}/coach`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><Sparkles className="h-4 w-4" />Prompt Optimizer</Link>
          {repository.viewerCanEdit ? <Link href={`/dashboard/repositories/${repository.id}/edit`} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"><Pencil className="h-4 w-4" />Edit</Link> : null}
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Stars</div><div className="text-xl font-semibold text-white">{repository.stars}</div></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Clones</div><div className="text-xl font-semibold text-white">{repository.clones}</div></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Downloads</div><div className="text-xl font-semibold text-white">{repository.downloads}</div></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Risk score</div><div className="text-xl font-semibold text-white">{repository.reviewScore}/100</div></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Latest update</div><div className="text-xl font-semibold text-white">{repository.updatedAt}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {repository.kind === 'PROMPT_IMAGE' ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><ImageIcon className="h-5 w-5" /> Image preview gallery</div>
              {repository.previewImages.length ? <div className="grid gap-3 md:grid-cols-3">{repository.previewImages.map((image) => <img key={image.id} src={image.url} alt={image.alt} className="h-48 w-full rounded-2xl border border-zinc-800 object-cover" />)}</div> : <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-8 text-center text-sm text-zinc-500">Chưa có ảnh preview. Hãy upload ảnh mẫu hoặc ảnh kết quả để repo image hiển thị preview trong Explore.</div>}
            </section>
          ) : null}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Latest version</div>
                <h2 className="mt-1 text-xl font-semibold text-white">v{latest.version}</h2>
              </div>
              <CopyButton value={combinedPrompt} label="Copy prompt pack" copiedLabel="Copied pack" />
            </div>
            <div className="mb-4 rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"><div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Bot className="h-3.5 w-3.5" /> Compatible AI</div><div className="flex flex-wrap gap-2">{repository.supportedModels.map((model) => <span key={model} className="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-300">{model}</span>)}</div></div>
            <CopyablePromptBlock title="System prompt" content={latest.systemPrompt} copyLabel="Copy system" copiedLabel="Copied system" />
            <div className="h-4" />
            <CopyablePromptBlock title="User prompt template" content={latest.userTemplate} copyLabel="Copy template" copiedLabel="Copied template" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="text-sm font-medium text-white">Variables</div><CopyButton value={latest.variables.join(', ')} label="Copy variables" copiedLabel="Copied variables" /></div><div className="flex flex-wrap gap-2">{latest.variables.length ? latest.variables.map((variable) => <span key={variable} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">{`{{${variable}}}`}</span>) : <span className="text-sm text-zinc-500">No variables declared.</span>}</div></div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="text-sm font-medium text-white">Output format</div><CopyButton value={latest.outputFormat} label="Copy format" copiedLabel="Copied format" /></div><p className="text-sm leading-6 text-zinc-300">{latest.outputFormat}</p></div>
            </div>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="text-sm font-medium text-white">Notes</div><CopyButton value={latest.notes} label="Copy notes" copiedLabel="Copied notes" /></div><p className="text-sm leading-6 text-zinc-300">{latest.notes}</p></div>
          </section>

          {repository.assets.length ? <BundleExplorer owner={repository.owner} slug={repository.slug} assets={repository.assets} bundleSummary={{ totalFiles: repository.bundleSummary.totalFiles, textFiles: repository.bundleSummary.textFiles, totalSizeLabel: repository.bundleSummary.totalSizeLabel }} /> : null}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><GitBranch className="h-5 w-5" /> Version history</div>
            <div className="space-y-4">{repository.versions.map((version) => <div key={version.version} className="rounded-xl border border-zinc-800 bg-black p-4"><div className="mb-2 flex items-center justify-between gap-4"><div className="text-sm font-semibold text-white">v{version.version}</div><div className="text-xs text-zinc-500">Updated {version.updatedAt}</div></div><p className="text-sm leading-6 text-zinc-300">{version.changelog}</p></div>)}</div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Share repository</div><p className="mb-4 text-sm leading-6 text-zinc-300">Share this repository link with teammates or copy the latest prompt pack into ChatGPT, Claude, Claude Code, or Gemini.</p><div className="rounded-lg border border-zinc-800 bg-black p-3 text-xs break-all text-zinc-400">{repositoryUrl}</div><div className="mt-3 flex gap-3"><CopyButton value={repositoryUrl} label="Copy link" copiedLabel="Copied link" /><ShareRepositoryButton url={repositoryUrl} title={`${repository.owner}/${repository.name}`} /></div></div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Repository metadata</div>
            <dl className="space-y-3 text-sm text-zinc-300">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Owner</dt><dd>{repository.ownerDisplayName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Profile</dt><dd><Link href={`/profile/${repository.owner}`} className="text-blue-400 hover:underline">@{repository.owner}</Link></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Visibility</dt><dd className="capitalize">{repository.visibility}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Type</dt><dd>{repository.kindLabel}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Category</dt><dd>{repository.category}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Mode</dt><dd>{repository.sourceModeLabel}</dd></div>
              {repository.imageStyle ? <div className="flex justify-between gap-4"><dt className="text-zinc-500">Image style</dt><dd>{repository.imageStyle}</dd></div> : null}
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Safety review</dt><dd className={repository.reviewStatus === 'BLOCKED' ? 'text-sky-300' : repository.reviewStatus === 'WARNING' ? 'text-amber-300' : 'text-emerald-300'}>{repository.reviewStatus}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Risk score</dt><dd>{repository.reviewScore}/100</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Files</dt><dd>{repository.bundleSummary.totalFiles}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Text files</dt><dd>{repository.bundleSummary.textFiles}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Bundle size</dt><dd>{repository.bundleSummary.totalSizeLabel}</dd></div>
            </dl>
          </div>

          {repository.reviewDetails.length ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Review findings</div>
              <div className="space-y-3">{repository.reviewDetails.map((item) => <div key={item.id} className="rounded-xl border border-zinc-800 bg-black p-3"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.title}</div><div className="text-xs uppercase text-zinc-500">{item.severity}</div></div><p className="mt-2 text-xs leading-5 text-zinc-400">{item.description}</p>{item.snippets.length ? <div className="mt-2 space-y-2">{item.snippets.map((snippet, index) => <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-300">{snippet}</div>)}</div> : null}</div>)}</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Quick export</div><div className="grid gap-3"><Link href={`${downloadBase}?format=md`} className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">Markdown</Link><Link href={`${downloadBase}?format=json`} className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">JSON</Link><Link href={`${downloadBase}?format=txt`} className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">Text</Link></div></div>

          {repository.sourceMode === 'UPLOAD_BUNDLE' ? <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Shield className="h-4 w-4" /> Bundle-backed repo</div><p className="text-sm leading-6 text-zinc-300">This repository stores uploaded files on the web and uses them as grounded context for answers, copy packs, and future AI retrieval.</p></div> : null}
        </aside>
      </div>
    </div>
  );
}
