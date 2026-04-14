'use client';

import { useMemo, useState } from 'react';
import { Bot, LoaderCircle, Send, Sparkles } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'demo' | 'live';
  citations?: string[];
};

type RepoChatSandboxProps = {
  owner: string;
  slug: string;
  repositoryName: string;
  latestVersion: string;
  sourceModeLabel: string;
  supportedModels: string[];
  hasLiveModel: boolean;
};

const quickPrompts = [
  'Summarize what this repo is for and when to use it.',
  'Turn this repo into a step-by-step instruction set for a chatbot.',
  'Suggest how to improve the current prompt and bundle structure.',
];

export function RepoChatSandbox({
  owner,
  slug,
  repositoryName,
  latestVersion,
  sourceModeLabel,
  supportedModels,
  hasLiveModel,
}: RepoChatSandboxProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      mode: hasLiveModel ? 'live' : 'demo',
      content: hasLiveModel
        ? `Live chat is ready for ${owner}/${slug}. Ask about the prompt, files, or how this repo should answer users.`
        : `Demo grounded chat is active for ${owner}/${slug}. Add OPENAI_API_KEY to your .env to enable live model responses.`,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = isSubmitting || !input.trim();

  const helperText = useMemo(
    () => `${repositoryName} • v${latestVersion} • ${sourceModeLabel} • ${supportedModels.join(', ')}`,
    [latestVersion, repositoryName, sourceModeLabel, supportedModels],
  );

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isSubmitting) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/repositories/${owner}/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Chat request failed.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.answer,
        mode: payload.mode,
        citations: payload.citations ?? [],
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while asking the repo sandbox.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <Bot className="h-5 w-5" />
            Chat sandbox
          </div>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Ask questions against this repository&apos;s latest prompt version and uploaded bundle. The sandbox now retrieves the most relevant prompt fields and bundle chunks before answering.
          </p>
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">{helperText}</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${hasLiveModel ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-amber-800 bg-amber-950/40 text-amber-300'}`}>
          {hasLiveModel ? 'Live OpenAI mode' : 'Demo grounded mode'}
        </div>
      </div>

      {!hasLiveModel ? (
        <div className="mb-5 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">
          OPENAI_API_KEY is not set. The sandbox will answer in grounded demo mode using retrieved prompt fields and bundle chunks from this repo.
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submitMessage(prompt)}
            disabled={isSubmitting}
            className="rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            {prompt}
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-black p-4">
        <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`rounded-2xl border p-4 ${message.role === 'user' ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{message.role === 'user' ? 'You' : 'Prompt-Hub agent'}</div>
                {message.mode ? (
                  <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${message.mode === 'live' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                    {message.mode}
                  </div>
                ) : null}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{message.content}</div>
              {message.citations?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.citations.map((citation) => (
                    <span key={citation} className="rounded-full border border-zinc-700 bg-black px-2.5 py-1 text-[11px] text-zinc-400">
                      {citation}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {isSubmitting ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
              <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
              Thinking with the current repo context...
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage(input);
          }}
          className="grid gap-3"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-28 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            placeholder="Ask how this repo should respond, what files matter, or how to improve the current prompt skill..."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">The sandbox retrieves the most relevant prompt fields and bundle chunks before answering.</p>
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Ask sandbox
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
