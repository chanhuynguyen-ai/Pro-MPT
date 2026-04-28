'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, LoaderCircle, Layers3, Plus } from 'lucide-react';

type CrowChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'local' | 'remote' | 'demo';
  citations?: string[];
};

type RepoOption = {
  id: string;
  label: string;
  sourceModeLabel: string;
  isStarred?: boolean;
};

type WorkspaceOption = {
  id: string;
  name: string;
  description: string;
  repositoryCount: number;
  label: string;
};

type ModelOption = {
  id: string;
  label: string;
  kind: 'local' | 'api';
  value: string;
};

type CrowChatShellProps = {
  labels: {
    title: string;
    subtitle: string;
    newChat: string;
    skillLibrary: string;
    starred: string;
    workspaces: string;
    placeholder: string;
    repoLibrary: string;
    workspaceLibrary: string;
    llmModel: string;
    send: string;
    noRepo: string;
    noWorkspace: string;
    noModels: string;
    localMode: string;
    remoteMode: string;
    helper: string;
    chooseRepo: string;
    chooseWorkspace: string;
    chooseModel: string;
    starredBadge: string;
    useInChat: string;
    useWorkspace: string;
    openRepo: string;
  };
  repoOptions: RepoOption[];
  workspaceOptions: WorkspaceOption[];
  starredRepos: Array<{ id: string; href: string; label: string; sourceModeLabel: string }>;
  modelOptions: ModelOption[];
  defaultMode: 'local' | 'remote' | 'demo';
};

export function CrowChatShell({ labels, repoOptions, workspaceOptions, starredRepos, modelOptions, defaultMode }: CrowChatShellProps) {
  const [messages, setMessages] = useState<CrowChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      mode: defaultMode,
      content:
        defaultMode === 'local'
          ? 'Crow-Chat is ready with your local model stack. Choose a repo or workspace library and start asking.'
          : defaultMode === 'remote'
            ? 'Crow-Chat is ready with your saved API model. Choose a repo or workspace library and ask anything.'
            : 'No live model is configured yet. Add a local Ollama model or save a remote API model in Settings to enable full chat.',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState(repoOptions[0]?.id ?? '');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(modelOptions[0]?.id ?? '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(() => modelOptions.find((item) => item.id === selectedModelId) || null, [modelOptions, selectedModelId]);
  const canSend = !!input.trim() && !isSending;
  const modeBadge = useMemo(() => {
    if (selectedModel?.kind === 'local') return labels.localMode;
    if (selectedModel?.kind === 'api') return labels.remoteMode;
    return labels.noModels;
  }, [labels.localMode, labels.noModels, labels.remoteMode, selectedModel]);

  function resetChat() {
    setMessages((current) => [current[0]]);
    setInput('');
    setError(null);
  }

  async function submitMessage() {
    const message = input.trim();
    if (!message || isSending) return;

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: message }]);
    setInput('');
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/crow-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          repositoryId: selectedWorkspaceId ? null : selectedRepoId || null,
          workspaceId: selectedWorkspaceId || null,
          modelKind: selectedModel?.kind || null,
          modelValue: selectedModel?.value || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Crow-Chat request failed.');
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: payload.answer, mode: payload.mode, citations: payload.citations ?? [] }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crow-Chat request failed.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{labels.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{labels.subtitle}</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedModel?.kind === 'local' ? 'border border-emerald-800 bg-emerald-950/30 text-emerald-300' : selectedModel?.kind === 'api' ? 'border border-blue-800 bg-blue-950/30 text-blue-300' : 'border border-amber-800 bg-amber-950/30 text-amber-300'}`}>{modeBadge}</div>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-black p-4">
          <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div key={message.id} className={`rounded-2xl border p-4 ${message.role === 'user' ? 'border-blue-900/50 bg-blue-950/20' : 'border-zinc-800 bg-zinc-950'}`}>
                <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-zinc-400">
                  <span>{message.role === 'user' ? 'You' : 'Crow-Chat'}</span>
                  {message.mode ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${message.mode === 'local' ? 'bg-emerald-950 text-emerald-300' : message.mode === 'remote' ? 'bg-blue-950 text-blue-300' : 'bg-amber-950 text-amber-300'}`}>{message.mode}</span> : null}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{message.content}</div>
                {message.citations?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.citations.map((citation) => <span key={citation} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-[11px] text-zinc-400">{citation}</span>)}</div> : null}
              </div>
            ))}
            {isSending ? <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> Crow-Chat is grounding your selected library...</div> : null}
          </div>

          {error ? <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-3 text-xs leading-6 text-zinc-500">{labels.helper}</p>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-28 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" placeholder={labels.placeholder} />
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_260px_auto]">
              <label className="grid gap-2 text-sm text-zinc-300">
                <span>{labels.repoLibrary}</span>
                <select value={selectedRepoId} onChange={(event) => { setSelectedRepoId(event.target.value); if (event.target.value) setSelectedWorkspaceId(''); }} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                  <option value="">{labels.noRepo}</option>
                  {repoOptions.map((repo) => <option key={repo.id} value={repo.id}>{repo.label}{repo.isStarred ? ` • ${labels.starredBadge}` : ''} • {repo.sourceModeLabel}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                <span>{labels.workspaceLibrary}</span>
                <select value={selectedWorkspaceId} onChange={(event) => { setSelectedWorkspaceId(event.target.value); if (event.target.value) setSelectedRepoId(''); }} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                  <option value="">{labels.noWorkspace}</option>
                  {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                <span>{labels.llmModel}</span>
                <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                  <option value="">{labels.noModels}</option>
                  {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={submitMessage} disabled={!canSend} className="inline-flex h-[42px] items-center justify-center self-end rounded-md bg-emerald-600 px-4 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60" aria-label={labels.send}><ArrowUp className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <button type="button" onClick={resetChat} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-black px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500"><Plus className="h-4 w-4" />{labels.newChat}</button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.workspaces}</h2>
          <p className="mb-3 text-xs leading-6 text-zinc-500">{labels.chooseWorkspace}</p>
          <div className="space-y-2">
            {workspaceOptions.length ? workspaceOptions.map((workspace) => (
              <button key={workspace.id} type="button" onClick={() => { setSelectedWorkspaceId(workspace.id); setSelectedRepoId(''); }} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedWorkspaceId === workspace.id ? 'border-emerald-800 bg-emerald-950/30 text-white' : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700'}`}>
                <div className="flex items-center gap-2"><Layers3 className="h-4 w-4" /><span>{workspace.name}</span></div>
                <div className="mt-1 text-xs text-zinc-500">{workspace.repositoryCount} repos</div>
              </button>
            )) : <div className="rounded-xl border border-zinc-800 bg-black px-3 py-4 text-sm text-zinc-500">No workspaces yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.skillLibrary}</h2>
          <p className="mb-3 text-xs leading-6 text-zinc-500">{labels.chooseRepo}</p>
          <div className="space-y-2">
            {repoOptions.length ? repoOptions.slice(0, 8).map((repo) => (
              <button key={repo.id} type="button" onClick={() => { setSelectedRepoId(repo.id); setSelectedWorkspaceId(''); }} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedRepoId === repo.id ? 'border-emerald-800 bg-emerald-950/30 text-white' : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700'}`}>
                <div className="flex items-center gap-2"><span>{repo.label}</span>{repo.isStarred ? <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">{labels.starredBadge}</span> : null}</div>
                <div className="mt-1 text-xs text-zinc-500">{repo.sourceModeLabel}</div>
              </button>
            )) : <div className="rounded-xl border border-zinc-800 bg-black px-3 py-4 text-sm text-zinc-500">No repositories yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.starred}</h2>
          <div className="space-y-2">
            {starredRepos.length ? starredRepos.map((repo) => (
              <div key={repo.id} className={`rounded-xl border px-3 py-2 text-sm ${selectedRepoId === repo.id ? 'border-amber-800 bg-amber-950/20' : 'border-zinc-800 bg-black'}`}>
                <button type="button" onClick={() => { setSelectedRepoId(repo.id); setSelectedWorkspaceId(''); }} className="w-full text-left text-zinc-200">
                  <div className="flex items-center gap-2"><span>{repo.label}</span><span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">{labels.starredBadge}</span></div>
                  <div className="mt-1 text-xs text-zinc-500">{repo.sourceModeLabel}</div>
                </button>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { setSelectedRepoId(repo.id); setSelectedWorkspaceId(''); }} className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-white hover:border-zinc-500">{labels.useInChat}</button>
                  <Link href={repo.href} className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white">{labels.openRepo}</Link>
                </div>
              </div>
            )) : <div className="rounded-xl border border-zinc-800 bg-black px-3 py-4 text-sm text-zinc-500">No starred repositories yet.</div>}
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-xs leading-6 text-zinc-500"><div className="mb-1 font-semibold text-zinc-300">{labels.llmModel}</div><div>{labels.chooseModel}</div></div>
        </div>
      </aside>
    </div>
  );
}
