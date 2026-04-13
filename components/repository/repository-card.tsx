import Link from 'next/link';
import { GitFork, Star, Download } from 'lucide-react';
import { Repository } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';

export function RepositoryCard({ repository }: { repository: Repository }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm shadow-black/20">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/repositories/${repository.owner}/${repository.slug}`}
            className="text-lg font-semibold text-blue-400 hover:underline"
          >
            {repository.owner}/{repository.name}
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <Badge muted={repository.visibility === 'private'}>
              {repository.visibility}
            </Badge>
            <Badge muted>{repository.category}</Badge>
          </div>
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-sm leading-6 text-zinc-300">{repository.description}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {repository.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-blue-950/50 px-2.5 py-1 text-xs text-blue-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4" /> {repository.stars}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GitFork className="h-4 w-4" /> {repository.clones}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Download className="h-4 w-4" /> {repository.downloads}
        </span>
        <span>Updated {repository.updatedAt}</span>
      </div>
    </div>
  );
}
