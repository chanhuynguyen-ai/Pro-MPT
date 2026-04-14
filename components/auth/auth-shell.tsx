import Link from 'next/link';

export function AuthShell({
  title,
  description,
  altHref,
  altLabel,
  altCta,
  children,
}: {
  title: string;
  description: string;
  altHref: string;
  altLabel: string;
  altCta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center px-4 py-10 lg:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 lg:p-10">
          <div className="mb-8 inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400">
            MVP1 auth + ownership
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">{description}</p>
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black p-5 text-sm text-zinc-400">
            Prompt-Hub now supports real account sessions, protected dashboards, private repositories, and owner-only editing.
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 lg:p-10">
          {children}
          <div className="mt-6 text-sm text-zinc-400">
            {altLabel}{' '}
            <Link href={altHref} className="font-medium text-blue-400 hover:underline">
              {altCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
