import { categories, repositories } from '@/lib/mock-data';
import { RepositoryCard } from '@/components/repository/repository-card';

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Explore prompt repositories</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Discover public prompt skills by category, tags, popularity, and latest updates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-4">
        <input
          className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 md:col-span-2"
          placeholder="Search repositories, tags, or owners"
          readOnly
        />
        <select className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
          <option>Sort: Most stars</option>
          <option>Latest updated</option>
          <option>Most cloned</option>
        </select>
        <select className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none">
          <option>Visibility: Public</option>
          <option>Visibility: All</option>
        </select>
      </div>

      <div className="grid gap-4">
        {repositories.map((repository) => (
          <RepositoryCard key={repository.id} repository={repository} />
        ))}
      </div>
    </div>
  );
}
