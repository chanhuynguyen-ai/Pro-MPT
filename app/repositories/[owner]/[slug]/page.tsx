import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, GitBranch, GitFork, Pencil, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getRepository } from '@/lib/mock-data';

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ owner: string; slug: string }>;
}) {
  const { owner, slug } = await params;
  const repository = getRepository(owner, slug);

  if (!repository) {
    notFound();
  }

  const latest = repository.versions[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">
              <span className="text-blue-400">{repository.owner}</span>
              <span className="text-zinc-500"> / </span>
              <span>{repository.name}</span>
            </h1>
            <Badge muted={repository.visibility === 'private'}>{repository.visibility}</Badge>
            <Badge muted>{repository.category}</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-zinc-300">{repository.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {repository.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-blue-950/50 px-2.5 py-1 text-xs text-blue-300">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: `Star ${repository.stars}`, icon: <Star className="h-4 w-4" /> },
            { label: `Clone ${repository.clones}`, icon: <GitFork className="h-4 w-4" /> },
            { label: `Download ${repository.downloads}`, icon: <Download className="h-4 w-4" /> },
            { label: 'Edit', icon: <Pencil className="h-4 w-4" /> },
          ].map((action) => (
            <button
              key={action.label}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Latest version</h2>
                <p className="mt-1 text-sm text-zinc-500">Release {latest.version} • Updated {latest.updatedAt}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
                <GitBranch className="h-4 w-4" />
                {repository.versions.length} versions
              </div>
            </div>

            <div className="space-y-5 text-sm text-zinc-300">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">System prompt</div>
                <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 whitespace-pre-wrap">{latest.systemPrompt}</pre>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">User prompt template</div>
                <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 whitespace-pre-wrap">{latest.userTemplate}</pre>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Variables</div>
                  <div className="flex flex-wrap gap-2">
                    {latest.variables.map((variable) => (
                      <span key={variable} className="rounded-full bg-blue-950/50 px-2.5 py-1 text-xs text-blue-300">
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Output format</div>
                  <div className="rounded-xl border border-zinc-800 bg-black p-4">{latest.outputFormat}</div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Notes</div>
                <div className="rounded-xl border border-zinc-800 bg-black p-4">{latest.notes}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Version history</h2>
            <div className="space-y-4">
              {repository.versions.map((version) => (
                <div key={version.version} className="rounded-xl border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{version.version}</div>
                      <div className="mt-1 text-sm text-zinc-400">{version.changelog}</div>
                    </div>
                    <div className="text-xs text-zinc-500">{version.updatedAt}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold text-white">Repository info</h3>
            <dl className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Owner</dt>
                <dd>
                  <Link href={`/profile/${repository.owner}`} className="text-blue-400 hover:underline">
                    {repository.ownerDisplayName}
                  </Link>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Latest update</dt>
                <dd>{repository.updatedAt}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Stars</dt>
                <dd>{repository.stars}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Clones</dt>
                <dd>{repository.clones}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Downloads</dt>
                <dd>{repository.downloads}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold text-white">Suggested next steps</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
              <li>Connect the Create Repository form to Prisma and create the first version record.</li>
              <li>Add authentication with Clerk or NextAuth.</li>
              <li>Track clone, star, and download actions with server actions and database writes.</li>
              <li>Replace mock data with Prisma queries and pagination.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
