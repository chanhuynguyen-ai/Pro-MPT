'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

type ModelOption = {
  id: string;
  label: string;
  kind: 'local' | 'api';
  value: string;
};

type WorkspaceOptimizerResult = {
  mode: 'local' | 'remote' | 'demo';
  summary: string;
  analysis: string;
  strengths: string[];
  risks: string[];
  optimizedWorkspacePrompt: string;
  suggestedOutputStyle: string;
  suggestedNotes: string;
  suggestedRepositoryGaps: string[];
  groundingChecklist: string[];
  citations: string[];
};

function buildPack(result: WorkspaceOptimizerResult) {
  return [
    '# Workspace Optimizer Pack',
    '',
    `Summary: ${result.summary}`,
    '',
    '## Optimized workspace prompt',
    result.optimizedWorkspacePrompt,
    '',
    '## Suggested output style',
    result.suggestedOutputStyle,
    '',
    '## Suggested notes',
    result.suggestedNotes,
    '',
    '## Suggested repository gaps',
    ...result.suggestedRepositoryGaps.map((item) => `- ${item}`),
    '',
    '## Grounding checklist',
    ...result.groundingChecklist.map((item) => `- ${item}`),
  ].join('\n');
}

export function WorkspaceOptimizerShell({ workspaceId, workspaceName, modelOptions }: { workspaceId: string; workspaceName: string; modelOptions: ModelOption[] }) {
  const [goal, setGoal] = useState('Unify this workspace into a stronger multi-repo assistant with clearer grounding and conflict handling.');
  const [result, setResult] = useState<WorkspaceOptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(modelOptions[0]?.id ?? '');

  const selectedModel = useMemo(() => modelOptions.find((item) => item.id === selectedModelId) || null, [modelOptions, selectedModelId]);
  const pack = useMemo(() => (result ? buildPack(result) : ''), [result]);

  async function runOptimizer() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/optimizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, modelKind: selectedModel?.kind || null, modelValue: selectedModel?.value || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Workspace Optimizer failed.');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workspace Optimizer failed.');
    } finally {
      setLoading(false);
    }
  }

  const quickGoals = [
    'Create one workspace prompt that unifies all selected repositories.',
    'Improve grounding and conflict handling across repositories.',
    'Propose a stronger output style for multi-repo Crow-Chat.',
    'List the missing repo documents needed for better workspace answers.',
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white"><Sparkles className="h-5 w-5 text-fuchsia-300" /> Workspace Optimizer</div>
            <p className="text-sm leading-6 text-zinc-400">MVP2 upgrade. Optimize how <span className="font-medium text-white">{workspaceName}</span> should behave as one multi-repo AI workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-400">
              <span className="mb-1 block uppercase tracking-wide">Model</span>
              <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-xs text-white outline-none">
                <option value="">Demo mode</option>
                {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              </select>
            </label>
            {result ? <CopyButton text={pack} label="Copy workspace pack" copiedLabel="Workspace pack copied" /> : null}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {quickGoals.map((item) => (
            <button key={item} type="button" onClick={() => setGoal(item)} className="rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white">{item}</button>
          ))}
        </div>

        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="min-h-32 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none" />
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={runOptimizer} disabled={loading || !goal.trim()} className="inline-flex items-center gap-2 rounded-md bg-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}Run Workspace Optimizer
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Workspace optimizer summary</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.mode === 'local' ? 'border border-emerald-800 bg-emerald-950/30 text-emerald-300' : result.mode === 'remote' ? 'border border-blue-800 bg-blue-950/30 text-blue-300' : 'border border-amber-800 bg-amber-950/30 text-amber-300'}`}>{result.mode}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">
              <p className="font-medium text-white">{result.summary}</p>
              <p className="mt-3 text-zinc-300">{result.analysis}</p>
            </div>
            {result.citations.length ? <div className="mt-4 flex flex-wrap gap-2">{result.citations.map((citation) => <span key={citation} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-[11px] text-zinc-400">{citation}</span>)}</div> : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Strengths</h3>
              <ul className="space-y-2 text-sm text-zinc-300">{result.strengths.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Risks</h3>
              <ul className="space-y-2 text-sm text-zinc-300">{result.risks.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}</ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Optimized workspace prompt</h3>
                <CopyButton text={result.optimizedWorkspacePrompt} label="Copy workspace prompt" copiedLabel="Workspace prompt copied" />
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.optimizedWorkspacePrompt}</pre>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">Suggested output style</h3>
                  <CopyButton text={result.suggestedOutputStyle} label="Copy output style" copiedLabel="Output style copied" />
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.suggestedOutputStyle}</pre>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">Suggested notes</h3>
                  <CopyButton text={result.suggestedNotes} label="Copy notes" copiedLabel="Notes copied" />
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{result.suggestedNotes}</pre>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Suggested repository gaps</h3>
              <ul className="space-y-2 text-sm text-zinc-300">{result.suggestedRepositoryGaps.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-base font-semibold text-white">Grounding checklist</h3>
              <ul className="space-y-2 text-sm text-zinc-300">{result.groundingChecklist.map((item) => <li key={item} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">{item}</li>)}</ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
