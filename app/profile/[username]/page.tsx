import { notFound } from 'next/navigation';
import { repositories } from '@/lib/mock-data';
import { RepositoryCard } from '@/components/repository/repository-card';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const userRepos = repositories.filter((repo) => repo.owner === username);

  if (!userRepos.length) {
    notFound();
  }

  const ownerName = userRepos[0].ownerDisplayName;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-3xl font-semibold text-white">{ownerName}</h1>
        <p className="mt-2 text-sm text-zinc-400">@{username} • Public prompt repositories in this starter.</p>
      </div>

      <div className="grid gap-4">
        {userRepos.map((repository) => (
          <RepositoryCard key={repository.id} repository={repository} />
        ))}
      </div>
    </div>
  );
}
