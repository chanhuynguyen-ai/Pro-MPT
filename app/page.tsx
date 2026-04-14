import Link from 'next/link';
import { ArrowRight, Bot, FolderGit2, GitBranch, ShieldCheck, Sparkles } from 'lucide-react';
import { RepositoryCard } from '@/components/repository/repository-card';
import { getFeaturedRepositories } from '@/lib/repositories';
import { getDictionary } from '@/lib/i18n';

export default async function HomePage() {
  const featured = await getFeaturedRepositories(2);
  const preview = featured[0];
  const { dict } = await getDictionary();

  return (
    <div className="github-grid">
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              {dict.home.badge}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {dict.home.title1} <span className="text-blue-400">{dict.home.title2}</span> {dict.home.title3}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">{dict.home.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard/repositories/new"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                {dict.home.createRepository}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500"
              >
                {dict.home.explorePublicPrompts}
              </Link>
              <Link
                href="/crow-chat"
                className="inline-flex items-center gap-2 rounded-md border border-blue-700 bg-blue-950/30 px-4 py-2.5 text-sm font-semibold text-blue-200 hover:border-blue-500"
              >
                <Bot className="h-4 w-4" />
                {dict.home.crowChat}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">{dict.home.repositoryPreview}</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {preview ? `${preview.owner}/${preview.name}` : 'Seed the database to load a preview'}
                </div>
              </div>
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                {preview?.visibility ?? 'public'}
              </span>
            </div>
            {preview ? (
              <div className="space-y-4 text-sm text-zinc-300">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{dict.home.repositoryDescription}</div>
                  <p>{preview.description}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{dict.home.tags}</div>
                  <div className="flex flex-wrap gap-2">
                    {preview.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-blue-950/50 px-2.5 py-1 text-xs text-blue-300">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{dict.home.latestUpdate}</div>
                    <div className="font-medium text-white">{preview.updatedAt}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                      <Bot className="h-3.5 w-3.5" /> {dict.home.compatibleAi}
                    </div>
                    <div className="font-medium text-white">{preview.supportedModels.join(' · ')}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Run Prisma db push and seed once, then refresh the page.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Repository-first',
              description: 'Every prompt lives in a repo with metadata, visibility, stats, version history, and compatible AI targets.',
              icon: <FolderGit2 className="h-5 w-5" />,
            },
            {
              title: 'Simple versioning',
              description: 'Publish v1.0.0, v1.1.0, v2.0.0 with changelog snapshots instead of chaotic edits.',
              icon: <GitBranch className="h-5 w-5" />,
            },
            {
              title: 'Clone and reuse',
              description: 'Fork the community’s best prompt skills into your own workspace and adapt them fast.',
              icon: <Sparkles className="h-5 w-5" />,
            },
            {
              title: 'Bundle-ready',
              description: 'Create repos in web or upload mode, store bundle files locally, and load repository pages from SQLite instead of mock arrays.',
              icon: <ShieldCheck className="h-5 w-5" />,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="mb-3 inline-flex rounded-lg border border-zinc-700 p-2 text-zinc-300">{item.icon}</div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">{dict.home.featuredRepositories}</h2>
            <p className="mt-1 text-sm text-zinc-400">{dict.home.featuredDescription}</p>
          </div>
          <Link href="/explore" className="text-sm font-medium text-blue-400 hover:underline">
            {dict.home.viewAll}
          </Link>
        </div>
        <div className="grid gap-4">
          {featured.map((repository) => (
            <RepositoryCard key={repository.id} repository={repository} />
          ))}
        </div>
      </section>
    </div>
  );
}
