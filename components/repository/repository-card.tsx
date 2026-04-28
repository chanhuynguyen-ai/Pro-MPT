import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, ShieldAlert } from 'lucide-react';
import { RepositoryCardModel } from '@/lib/repositories';
import { Badge } from '@/components/ui/badge';

export function RepositoryCard({ repository }: { repository: RepositoryCardModel }) {
  const reviewTone = repository.reviewStatus === 'BLOCKED'
    ? 'border-rose-900/60 bg-rose-950/30 text-rose-200'
    : repository.reviewStatus === 'WARNING'
      ? 'border-amber-900/60 bg-amber-950/30 text-amber-200'
      : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200';

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg shadow-black/10">
      {repository.kind === 'PROMPT_IMAGE' && repository.previewImages.length ? (
        <div className="mb-4 grid h-44 grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-zinc-800 bg-black p-2">
          {repository.previewImages.map((image) => (
            <img key={image.id} src={image.url} alt={image.alt} className="h-full w-full rounded-xl object-cover" />
          ))}
        </div>
      ) : repository.kind === 'PROMPT_IMAGE' ? (
        <div className="mb-4 flex h-44 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-black text-zinc-500">
          <div className="text-center text-sm">
            <ImageIcon className="mx-auto mb-2 h-5 w-5" />
            No preview images yet
          </div>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge>{repository.kindLabel}</Badge>
        <Badge muted>{repository.category}</Badge>
        <Badge muted>{repository.sourceModeLabel}</Badge>
        <Badge muted={repository.reviewStatus === 'REVIEWED'}>{repository.reviewStatus === 'BLOCKED' ? 'Blocked' : repository.reviewStatus === 'WARNING' ? 'Needs review' : 'Reviewed'}</Badge>
      </div>

      <div className={`mb-4 rounded-xl border p-3 text-sm ${reviewTone}`}>
        <div className="flex items-start gap-2">
          {repository.reviewStatus === 'BLOCKED' ? <ShieldAlert className="mt-0.5 h-4 w-4" /> : repository.reviewStatus === 'WARNING' ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
          <div>
            <div className="font-medium">
              {repository.reviewStatus === 'BLOCKED' ? 'Repo bị chặn an toàn' : repository.reviewStatus === 'WARNING' ? 'Chưa vượt qua kiểm duyệt an toàn' : 'Đã kiểm duyệt'}
            </div>
            <div className="mt-1 text-xs leading-5 opacity-90">{repository.reviewSummary}</div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">@{repository.owner}</div>
          <h2 className="mt-1 text-xl font-semibold text-white">{repository.name}</h2>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div>Updated</div>
          <div className="mt-1 text-zinc-300">{repository.updatedAt}</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-400">{repository.description}</p>

      {repository.kind === 'PROMPT_IMAGE' && repository.imageStyle ? (
        <div className="mt-3 rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/20 px-3 py-2 text-xs text-fuchsia-200">
          <span className="font-semibold">Image style:</span> {repository.imageStyle}
        </div>
      ) : null}

      {repository.tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {repository.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-xs text-zinc-400">#{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>{repository.supportedModels.join(', ')}</span>
        <span>•</span>
        <span>{repository.assetCount} files</span>
        <span>•</span>
        <span>{repository.stars} stars</span>
        <span>•</span>
        <span>Risk {repository.reviewScore}/100</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
        <div className="text-xs text-zinc-500">
          <div>{repository.clones} clones • {repository.downloads} downloads</div>
        </div>
        <Link href={`/repositories/${repository.owner}/${repository.slug}`} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          Open repository
        </Link>
      </div>
    </article>
  );
}
