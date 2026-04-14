import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRightLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryCompareData } from '@/lib/repositories';

function diffLines(fromValue: string, toValue: string) {
  const left = fromValue.split('\n');
  const right = toValue.split('\n');
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return {
    removed: left.filter((line) => line.trim() && !rightSet.has(line)),
    added: right.filter((line) => line.trim() && !leftSet.has(line)),
  };
}

export default async function RepositoryComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const query = (await searchParams) ?? {};
  const compareData = await getRepositoryCompareData(owner, slug, viewer?.id);
  if (!compareData || compareData.versions.length < 2) notFound();

  const fromVersionParam = Array.isArray(query.from) ? query.from[0] : query.from;
  const toVersionParam = Array.isArray(query.to) ? query.to[0] : query.to;

  const toVersion = compareData.versions.find((version) => version.version === toVersionParam) ?? compareData.versions[0];
  const fromVersion = compareData.versions.find((version) => version.version === fromVersionParam) ?? compareData.versions[1] ?? compareData.versions[0];

  const fields = [
    { key: 'systemPrompt', label: 'System prompt', from: fromVersion.systemPrompt, to: toVersion.systemPrompt },
    { key: 'userTemplate', label: 'User prompt template', from: fromVersion.userTemplate, to: toVersion.userTemplate },
    { key: 'variables', label: 'Variables', from: fromVersion.variables.join(', '), to: toVersion.variables.join(', ') },
    { key: 'outputFormat', label: 'Output format', from: fromVersion.outputFormat, to: toVersion.outputFormat },
    { key: 'notes', label: 'Notes', from: fromVersion.notes || '', to: toVersion.notes || '' },
    { key: 'changelog', label: 'Changelog', from: fromVersion.changelog || '', to: toVersion.changelog || '' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            <ArrowRightLeft className="h-3.5 w-3.5" /> MVP2 starter · Version compare
          </div>
          <h1 className="text-3xl font-semibold text-white">Compare versions</h1>
          <p className="mt-2 text-sm text-zinc-400">Review how this repository evolved across versions before publishing the next prompt change.</p>
        </div>
        <Link href={`/repositories/${owner}/${slug}`} className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">Back to repository</Link>
      </div>

      <form className="mb-6 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>Compare from</span>
          <select name="from" defaultValue={fromVersion.version} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
            {compareData.versions.map((version) => <option key={version.version} value={version.version}>v{version.version} · {version.createdAt}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>Compare to</span>
          <select name="to" defaultValue={toVersion.version} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
            {compareData.versions.map((version) => <option key={version.version} value={version.version}>v{version.version} · {version.createdAt}</option>)}
          </select>
        </label>
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">Compare selected versions</button>
        </div>
      </form>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">From version</div>
          <h2 className="mt-1 text-xl font-semibold text-white">v{fromVersion.version}</h2>
          <p className="mt-2 text-sm text-zinc-400">{fromVersion.createdAt}</p>
          <p className="mt-3 text-sm text-zinc-300">{fromVersion.changelog}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">To version</div>
          <h2 className="mt-1 text-xl font-semibold text-white">v{toVersion.version}</h2>
          <p className="mt-2 text-sm text-zinc-400">{toVersion.createdAt}</p>
          <p className="mt-3 text-sm text-zinc-300">{toVersion.changelog}</p>
        </div>
      </div>

      <div className="space-y-6">
        {fields.map((field) => {
          const diff = diffLines(field.from, field.to);
          const changed = field.from !== field.to;
          return (
            <section key={field.key} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">{field.label}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${changed ? 'border border-amber-800 bg-amber-950/30 text-amber-300' : 'border border-zinc-700 bg-black text-zinc-400'}`}>
                  {changed ? 'Changed' : 'No change'}
                </span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">From</div>
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{field.from || 'No content provided.'}</pre>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black p-4">
                  <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">To</div>
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{field.to || 'No content provided.'}</pre>
                </div>
              </div>
              {changed ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                    <div className="mb-3 text-xs uppercase tracking-wide text-emerald-400">Added</div>
                    <div className="space-y-2 text-sm text-emerald-100">
                      {diff.added.length ? diff.added.map((line, index) => <div key={index}>+ {line}</div>) : <div className="text-emerald-200/70">No added lines.</div>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
                    <div className="mb-3 text-xs uppercase tracking-wide text-rose-400">Removed</div>
                    <div className="space-y-2 text-sm text-rose-100">
                      {diff.removed.length ? diff.removed.map((line, index) => <div key={index}>- {line}</div>) : <div className="text-rose-200/70">No removed lines.</div>}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
