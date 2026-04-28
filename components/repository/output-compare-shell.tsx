'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, History, LoaderCircle, Scale, Shuffle, Trophy } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

type CompareVersion = {
  version: string;
  createdAt: string;
  changelog: string;
};

type ModelOption = {
  id: string;
  label: string;
  kind: 'local' | 'api';
  value: string;
};

type CompareOutput = {
  version: string;
  changelog: string;
  answer: string;
};

type EvaluationDimension = {
  key: 'clarity' | 'structure' | 'groundedness' | 'actionability';
  label: string;
  score: number;
  rationale: string;
};

type OutputEvaluation = {
  version: string;
  overall: number;
  dimensions: EvaluationDimension[];
  strengths: string[];
  risks: string[];
};

type CompareResponse = {
  mode: 'local' | 'remote' | 'demo';
  retrievalMode: 'vector' | 'lexical';
  promptUsed: string;
  outputs: CompareOutput[];
  citations: string[];
  evaluations: OutputEvaluation[];
  verdict: {
    winnerVersion: string;
    margin: number;
    summary: string;
  } | null;
};

type CompareHistoryItem = {
  id: string;
  createdAt: string;
  fromVersion: string;
  toVersion: string;
  testInput: string;
  modelLabel: string;
  mode: string;
  retrievalMode: string;
  winnerVersion: string | null;
  winnerMargin: number | null;
  winnerSummary: string | null;
  outputs: CompareOutput[];
  evaluations: OutputEvaluation[];
  citations: string[];
};

const QUICK_INPUTS = [
  'Summarize how this repo should answer a new user question.',
  'Generate the best possible answer for a beginner asking for help.',
  'Return a structured markdown answer using the repo guidance.',
  'Answer safely and only with grounded repo context.',
];

function scoreColor(score: number) {
  if (score >= 8) return 'border-emerald-800 bg-emerald-950/30 text-emerald-300';
  if (score >= 6) return 'border-sky-800 bg-sky-950/30 text-sky-300';
  return 'border-amber-800 bg-amber-950/30 text-amber-300';
}

function HistoryCard({
  item,
  onLoad,
}: {
  item: CompareHistoryItem;
  onLoad: (item: CompareHistoryItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onLoad(item)}
      className="w-full rounded-xl border border-zinc-800 bg-black p-4 text-left hover:border-zinc-600"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            v{item.fromVersion} vs v{item.toVersion}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{item.createdAt} · {item.modelLabel}</div>
        </div>
        {item.winnerVersion ? (
          <span className="rounded-full border border-amber-800 bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
            Winner v{item.winnerVersion}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{item.testInput}</p>
      {item.winnerSummary ? <p className="mt-2 text-xs leading-5 text-zinc-500">{item.winnerSummary}</p> : null}
    </button>
  );
}

export function OutputCompareShell({
  owner,
  slug,
  versions,
  modelOptions,
  history,
}: {
  owner: string;
  slug: string;
  versions: CompareVersion[];
  modelOptions: ModelOption[];
  history: CompareHistoryItem[];
}) {
  const [fromVersion, setFromVersion] = useState(versions[1]?.version ?? versions[0]?.version ?? '');
  const [toVersion, setToVersion] = useState(versions[0]?.version ?? '');
  const [modelId, setModelId] = useState(modelOptions[0]?.id ?? '');
  const [testInput, setTestInput] = useState('How should this repo answer a support request about refunds and escalation?');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const selectedModel = useMemo(() => modelOptions.find((item) => item.id === modelId) ?? null, [modelId, modelOptions]);
  const evaluationByVersion = useMemo(() => new Map((result?.evaluations || []).map((item) => [item.version, item])), [result]);

  async function runCompare() {
    if (!fromVersion || !toVersion || !testInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/repositories/${owner}/${slug}/compare-outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromVersion,
          toVersion,
          testInput,
          modelKind: selectedModel?.kind || null,
          modelValue: selectedModel?.value || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Output compare failed.');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Output compare failed.');
    } finally {
      setLoading(false);
    }
  }

  function loadHistory(item: CompareHistoryItem) {
    setFromVersion(item.fromVersion);
    setToVersion(item.toVersion);
    setTestInput(item.testInput);
    setResult({
      mode: item.mode as 'local' | 'remote' | 'demo',
      retrievalMode: item.retrievalMode as 'vector' | 'lexical',
      promptUsed: item.testInput,
      outputs: item.outputs,
      citations: item.citations,
      evaluations: item.evaluations,
      verdict: item.winnerVersion
        ? { winnerVersion: item.winnerVersion, margin: item.winnerMargin ?? 0, summary: item.winnerSummary ?? '' }
        : null,
    });
  }

  const comparePack = useMemo(() => {
    if (!result) return '';
    return [
      '# A/B Output Compare',
      '',
      `Mode: ${result.mode}`,
      `Retrieval: ${result.retrievalMode}`,
      result.verdict ? `Winner: ${result.verdict.winnerVersion}` : 'Winner: none',
      result.verdict ? `Verdict: ${result.verdict.summary}` : '',
      '',
      '## Test input',
      testInput,
      '',
      ...result.outputs.flatMap((output) => {
        const evaluation = evaluationByVersion.get(output.version);
        return [
          `## Version ${output.version}`,
          `Changelog: ${output.changelog || 'No changelog provided.'}`,
          evaluation ? `Overall score: ${evaluation.overall}/10` : 'Overall score: unavailable',
          output.answer,
          '',
        ];
      }),
      '## Citations',
      ...(result.citations.length ? result.citations.map((item) => `- ${item}`) : ['- No citations']),
    ].filter(Boolean).join('\n');
  }, [result, testInput, evaluationByVersion]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
              <Shuffle className="h-5 w-5 text-sky-300" /> A/B Output Compare
            </div>
            <p className="text-sm leading-6 text-zinc-400">Run the same user input through two versions of this repository using the same selected model, then compare the real answers side by side and score which one performs better.</p>
          </div>
          {result ? <CopyButton text={comparePack} label="Copy compare pack" copiedLabel="Compare pack copied" /> : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_INPUTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTestInput(item)}
              className="rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>Compare from</span>
            <select value={fromVersion} onChange={(event) => setFromVersion(event.target.value)} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
              {versions.map((version) => (
                <option key={`from-${version.version}`} value={version.version}>
                  v{version.version} · {version.createdAt}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>Compare to</span>
            <select value={toVersion} onChange={(event) => setToVersion(event.target.value)} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
              {versions.map((version) => (
                <option key={`to-${version.version}`} value={version.version}>
                  v{version.version} · {version.createdAt}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            <span>LLM model</span>
            <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
              <option value="">Demo mode</option>
              {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>{model.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm text-zinc-300">
          <span>Test input</span>
          <textarea value={testInput} onChange={(event) => setTestInput(event.target.value)} className="min-h-32 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none" />
        </label>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={runCompare} disabled={loading || !testInput.trim() || !fromVersion || !toVersion} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            Run output compare
          </button>
        </div>
      </section>

      {history.length ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5 text-violet-300" /> Compare history
          </div>
          <p className="mb-4 text-sm leading-6 text-zinc-400">Recent compare runs are saved so you can reload the same test case, compare winners over time, and reuse good evaluation prompts without rebuilding the setup from scratch.</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {history.map((item) => <HistoryCard key={item.id} item={item} onLoad={loadHistory} />)}
          </div>
        </section>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Run metadata</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.mode === 'local' ? 'border border-emerald-800 bg-emerald-950/30 text-emerald-300' : result.mode === 'remote' ? 'border border-blue-800 bg-blue-950/30 text-blue-300' : 'border border-amber-800 bg-amber-950/30 text-amber-300'}`}>{result.mode}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Retrieval</div>{result.retrievalMode}</div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">From version</div>v{result.outputs[0]?.version}</div>
              <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300"><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">To version</div>v{result.outputs[1]?.version}</div>
            </div>
            {result.citations.length ? <div className="mt-4 flex flex-wrap gap-2">{result.citations.map((citation) => <span key={citation} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-[11px] text-zinc-400">{citation}</span>)}</div> : null}
          </section>

          {result.verdict ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-white"><Trophy className="h-5 w-5 text-amber-300" /> Evaluation verdict</div>
              <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-start">
                <div className="rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm font-semibold text-amber-200">Winner: v{result.verdict.winnerVersion}</div>
                <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">{result.verdict.summary}</div>
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            {result.outputs.map((output) => {
              const evaluation = evaluationByVersion.get(output.version);
              return (
                <div key={output.version} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">Version v{output.version}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{output.changelog || 'No changelog provided.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {evaluation ? <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreColor(evaluation.overall)}`}>{evaluation.overall}/10</span> : null}
                      <CopyButton text={output.answer} label="Copy output" copiedLabel="Output copied" />
                    </div>
                  </div>

                  {evaluation ? (
                    <div className="rounded-xl border border-zinc-800 bg-black p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Scale className="h-4 w-4 text-sky-300" /> Quick scorecard</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {evaluation.dimensions.map((dimension) => (
                          <div key={dimension.key} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm text-white">
                              <span>{dimension.label}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreColor(dimension.score)}`}>{dimension.score}/10</span>
                            </div>
                            <p className="text-xs leading-5 text-zinc-400">{dimension.rationale}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">Strengths</div>
                          <ul className="space-y-2 text-sm text-zinc-300">{evaluation.strengths.map((item) => <li key={item} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">{item}</li>)}</ul>
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Risks</div>
                          <ul className="space-y-2 text-sm text-zinc-300">{evaluation.risks.map((item) => <li key={item} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">{item}</li>)}</ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-7 text-zinc-200">{output.answer}</pre>
                </div>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}
