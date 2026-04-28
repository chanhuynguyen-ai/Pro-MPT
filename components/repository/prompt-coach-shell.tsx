'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

type CoachResult = {
  mode: 'local' | 'remote' | 'demo';
  summary: string;
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  optimizedSystemPrompt: string;
  optimizedUserTemplate: string;
  suggestedVariables: string[];
  suggestedOutputFormat: string;
  suggestedNotes: string;
  suggestedBundleDocs: string[];
  groundingChecklist: string[];
  citations: string[];
};

function buildOptimizationPack(result: CoachResult) {
  return [
    '# Prompt Optimizer Pack',
    '',
    `Summary: ${result.summary}`,
    '',
    '## Optimized system prompt',
    result.optimizedSystemPrompt,
    '',
    '## Optimized user template',
    result.optimizedUserTemplate,
    '',
    '## Suggested variables',
    result.suggestedVariables.join(', '),
    '',
    '## Suggested output format',
    result.suggestedOutputFormat,
    '',
    '## Suggested notes',
    result.suggestedNotes,
    '',
    '## Suggested bundle docs',
    ...result.suggestedBundleDocs.map((item) => `- ${item}`),
    '',
    '## Grounding checklist',
    ...result.groundingChecklist.map((item) => `- ${item}`),
  ].join('\n');
}

export function PromptCoachShell({ owner, slug }: { owner: string; slug: string }) {
  const [goal, setGoal] = useState('Improve this repo for clarity, stronger output structure, and safer grounded answers.');
  const [result, setResult] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const router = useRouter();

  const optimizationPack = useMemo(() => (result ? buildOptimizationPack(result) : ''), [result]);

  async function runCoach() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/repositories/${owner}/${slug}/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Prompt Coach failed.');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prompt Coach failed.');
    } finally {
      setLoading(false);
    }
  }


  async function applyOptimizerAsVersion() {
    if (!result) return;
    setApplying(true);
    setError(null);
    try {
      const response = await fetch(`/api/repositories/${owner}/${slug}/coach/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizedSystemPrompt: result.optimizedSystemPrompt,
          optimizedUserTemplate: result.optimizedUserTemplate,
          suggestedVariables: result.suggestedVariables,
          suggestedOutputFormat: result.suggestedOutputFormat,
          suggestedNotes: result.suggestedNotes,
          changelog: 'Applied Prompt Optimizer recommendations as a new version.',
          bumpType: 'patch',
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not apply optimizer result.');
      router.push(payload.redirectTo || `/repositories/${owner}/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply optimizer result.');
    } finally {
      setApplying(false);
    }
  }

  const quickGoals = [
    'Tighten the system prompt and make the scope safer.',
    'Rewrite the user template so it is easier to reuse.',
    'Improve the repo for more grounded answers from bundle evidence.',
    'Suggest a cleaner output format and better variables.',
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-amber-300" /> Prompt Coach & Optimizer
            </div>
            <p className="text-sm leading-6 text-zinc-400">MVP2 upgrade. Ask Crow to critique this repo, rewrite the prompt pack, improve grounded behavior, and suggest the next bundle documents to add.</p>
          </div>
          {result ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={applyOptimizerAsVersion} disabled={applying} className="rounded-md border border-emerald-700 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {applying ? 'Applying…' : 'Apply as new version'}
                </button>
                <CopyButton text={optimizationPack} label="Copy optimizer pack" copiedLabel="Optimizer pack copied" />
              </div>
            ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {quickGoals.map((item) => (
            <button key={item} type="button" onClick={() => setGoal(item)} className="rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white">
              {item}
            </button>
          ))}
        </div>

        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="min-h-32 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none" />
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={runCoach} disabled={loading || !goal.trim()} className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            Run Prompt Optimizer
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Optimizer summary</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.mode === 'local' ? 'border border-emerald-800 bg-emerald-950/30 text-emerald-300' : result.mode === 'remote' ? 'border border-blue-800 bg-blue-950/30 text-blue-300' : 'border border-amber-800 bg-amber-950/30 text-amber-300'}`}>{result.mode}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">
              <p className="font-medium text-white">{result.summary}</p>
              <p className="mt-3 text-zinc-300">{result.analysis}</p>
            </div>
            {result.citations.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.citations.map((citation) => <span key={citation} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-[11px] text-zinc-400">{citation}</span>)}
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Strengths</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {result.strengths.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Weaknesses</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {result.weaknesses.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Optimized system prompt</h3>
                <CopyButton text={result.optimizedSystemPrompt} label="Copy system rewrite" copiedLabel="System rewrite copied" />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.optimizedSystemPrompt}</pre>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Optimized user template</h3>
                <CopyButton text={result.optimizedUserTemplate} label="Copy template rewrite" copiedLabel="Template rewrite copied" />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.optimizedUserTemplate}</pre>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Suggested variables</h3>
                <CopyButton text={result.suggestedVariables.join(', ')} label="Copy variables" copiedLabel="Variables copied" />
              </div>
              <div className="flex flex-wrap gap-2">
                {result.suggestedVariables.map((item) => <span key={item} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-xs text-zinc-300">{`{{${item}}}`}</span>)}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Suggested output format</h3>
                <CopyButton text={result.suggestedOutputFormat} label="Copy output format" copiedLabel="Output format copied" />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.suggestedOutputFormat}</pre>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Suggested notes</h3>
                <CopyButton text={result.suggestedNotes} label="Copy notes" copiedLabel="Notes copied" />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.suggestedNotes}</pre>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="mb-3 text-base font-semibold text-white">Suggested bundle docs</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  {result.suggestedBundleDocs.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="mb-3 text-base font-semibold text-white">Grounding checklist</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  {result.groundingChecklist.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
