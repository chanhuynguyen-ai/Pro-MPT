import { deleteLocalModelAction, downloadLocalModelsAction } from '@/app/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import type { LocalInstalledModel, LocalModelRecommendation, OllamaStatus } from '@/lib/ollama';
import { X } from 'lucide-react';

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 16);
}

function InstalledModelList({ models }: { models: LocalInstalledModel[] }) {
  if (!models.length) {
    return <div className="rounded-xl border border-zinc-800 bg-black px-4 py-4 text-sm text-zinc-500">No local models installed yet.</div>;
  }

  return (
    <div className="space-y-3">
      {models.map((model) => (
        <div key={model.name} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium text-white">{model.name} <span className="text-zinc-500">• local</span></div>
              <div className="mt-1 text-xs text-zinc-500">
                {model.parameterSize ?? 'Unknown size'} • {model.quantization ?? 'Unknown quantization'}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right text-xs text-zinc-500">
                <div>{model.sizeLabel}</div>
                <div>{formatTimestamp(model.modifiedAt)}</div>
              </div>
              <form action={deleteLocalModelAction}>
                <input type="hidden" name="model" value={model.name} />
                <button type="submit" className="rounded-md border border-rose-900/60 bg-rose-950/20 p-2 text-rose-300 hover:bg-rose-950/40" aria-label={`Delete ${model.name}`}>
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LocalModelSettingsCard({
  status,
  recommendations,
  labels,
}: {
  status: OllamaStatus;
  recommendations: LocalModelRecommendation[];
  labels: {
    title: string;
    description: string;
    recommended: string;
    installed: string;
    running: string;
    online: string;
    offline: string;
    download: string;
  };
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{labels.description}</p>
      </div>

      <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${status.available ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' : 'border-amber-900/60 bg-amber-950/20 text-amber-200'}`}>
        {status.available ? labels.online : labels.offline}
        {!status.available && status.error ? <div className="mt-2 text-xs text-amber-300/80">{status.error}</div> : null}
      </div>

      <form action={downloadLocalModelsAction} className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.recommended}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {recommendations.map((model) => (
              <label key={model.name} className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <input type="checkbox" name="models" value={model.name} className="mt-1 h-4 w-4 rounded border-zinc-700 bg-black text-emerald-500" />
                  <div>
                    <div className="font-medium text-white">{model.displayName}</div>
                    <div className="mt-1 text-xs text-zinc-500">{model.name} • {model.sizeLabel}</div>
                    <p className="mt-2 leading-6 text-zinc-400">{model.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {model.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton
            label={labels.download}
            pendingLabel={labels.download}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          />
        </div>
      </form>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.installed}</h3>
          <InstalledModelList models={status.installedModels} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{labels.running}</h3>
          <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
            {status.runningModels.length ? (
              <div className="flex flex-wrap gap-2">
                {status.runningModels.map((model) => (
                  <span key={model} className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">{model} • local</span>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500">No models are currently loaded in memory.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
