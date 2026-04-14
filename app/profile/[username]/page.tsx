import { notFound } from 'next/navigation';
import { RepositoryCard } from '@/components/repository/repository-card';
import { getCurrentUser } from '@/lib/auth';
import { getProfileData } from '@/lib/repositories';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const profile = await getProfileData(username, viewer?.id);

  if (!profile) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-3xl font-semibold text-white">{profile.user.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          @{username} • {profile.isOwner ? 'Showing public and private repositories in your workspace.' : 'Public prompt repositories.'}
        </p>
      </div>

      <div className="grid gap-4">
        {profile.repositories.length ? profile.repositories.map((repository) => (
          <RepositoryCard key={repository.id} repository={repository} />
        )) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-sm text-zinc-400">
            No repositories available for this profile.
          </div>
        )}
      </div>
    </div>
  );
}
