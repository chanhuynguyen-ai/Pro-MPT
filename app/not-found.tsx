import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">404</div>
      <h1 className="mt-5 text-4xl font-semibold text-white">Repository not found</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
        The requested repository could not be found or you do not have permission to open it.
      </p>
      <Link href="/explore" className="mt-6 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
        Go to Explore
      </Link>
    </div>
  );
}
