import { deleteRemoteApiModelAction, saveRemoteApiKeyAction } from '@/app/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { X } from 'lucide-react';

export function RemoteApiSettingsCard({
  current,
}: {
  current: { configured: boolean; provider: string | null; model: string | null; configs: Array<{ id: string; provider: string; model: string; label?: string | null }> };
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Cloud chatbot API</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Add a remote chatbot API key so Crow-Chat can use a hosted model. Gemini API is convenient for free-tier testing.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
        <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Current remote provider</div>
        <div className="font-medium text-white">{current.configured ? `${current.provider} • ${current.model}` : 'No remote API model saved yet.'}</div>
      </div>

      <form action={saveRemoteApiKeyAction} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Provider</label>
          <select name="provider" defaultValue="GEMINI" className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white">
            <option value="GEMINI">Gemini API</option>
            <option value="OPENAI">OpenAI API</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">API key</label>
          <input name="apiKey" type="password" placeholder="Paste your Gemini or OpenAI API key" className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Model</label>
            <input name="model" placeholder="gemini-2.5-flash" defaultValue="gemini-2.5-flash" className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Display label (optional)</label>
            <input name="label" placeholder="Gemini free test" className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Custom base URL (optional)</label>
          <input name="baseUrl" placeholder="Leave blank for the default provider endpoint" className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white" />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-xs leading-6 text-zinc-500">
          Recommended for free tests: create a Gemini API key in Google AI Studio, then use provider <strong className="text-zinc-300">GEMINI</strong> and model <strong className="text-zinc-300">gemini-2.5-flash</strong>.
        </div>
        <div className="flex justify-end">
          <SubmitButton label="Save chatbot API" pendingLabel="Saving chatbot API..." className="rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500" />
        </div>
      </form>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Saved API models</h3>
        <div className="space-y-3">
          {current.configs.length ? current.configs.map((config) => (
            <div key={config.id} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{config.label?.trim() || config.model}</div>
                  <div className="mt-1 text-xs text-zinc-500">{config.provider} • {config.model}</div>
                </div>
                <form action={deleteRemoteApiModelAction}>
                  <input type="hidden" name="configId" value={config.id} />
                  <button type="submit" className="rounded-md border border-rose-900/60 bg-rose-950/20 p-2 text-rose-300 hover:bg-rose-950/40" aria-label={`Delete ${config.model}`}>
                    <X className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )) : <div className="rounded-xl border border-zinc-800 bg-black px-4 py-4 text-sm text-zinc-500">No cloud API models saved yet.</div>}
        </div>
      </div>
    </section>
  );
}
