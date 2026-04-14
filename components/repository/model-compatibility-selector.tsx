'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_MODEL_OPTIONS } from '@/lib/constants';

type ModelCompatibilitySelectorProps = {
  defaultSelected?: string[];
  defaultCustom?: string[];
};

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function ModelCompatibilitySelector({
  defaultSelected = ['ChatGPT'],
  defaultCustom = [],
}: ModelCompatibilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(normalizeList(defaultSelected));
  const [customValue, setCustomValue] = useState(defaultCustom.join(', '));

  const customModels = useMemo(() => normalizeList(customValue.split(',')), [customValue]);
  const summary = useMemo(() => {
    const combined = normalizeList([...selected, ...customModels]);
    if (!combined.length) return 'Select compatible AI models';
    if (combined.length <= 3) return combined.join(', ');
    return `${combined.slice(0, 3).join(', ')} +${combined.length - 3} more`;
  }, [selected, customModels]);

  function toggleModel(model: string) {
    setSelected((current) => current.includes(model) ? current.filter((item) => item !== model) : [...current, model]);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Model compatibility</h2>
          <p className="mt-1 text-sm text-zinc-500">Open the selector, tick the AI models you need, and add custom names if a model is missing from the list.</p>
        </div>
      </div>

      {selected.map((model) => <input key={model} type="hidden" name="supportedModels" value={model} />)}
      <input type="hidden" name="customSupportedModels" value={customModels.join(', ')} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-left text-sm text-white"
        >
          <span>{summary}</span>
          <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div className="mt-4 space-y-4 rounded-xl border border-zinc-800 bg-black p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUPPORTED_MODEL_OPTIONS.map((model) => {
                const checked = selected.includes(model);
                return (
                  <label key={model} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${checked ? 'border-emerald-700 bg-emerald-950/30 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-300'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModel(model)}
                      className="h-4 w-4 rounded border-zinc-700 bg-black text-emerald-500"
                    />
                    <span>{model}</span>
                  </label>
                );
              })}
            </div>
            <label className="grid gap-2 text-sm text-zinc-300">
              Other AI / custom targets
              <input
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder="Grok, Perplexity Sonar, OpenRouter custom model..."
                className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
              <span className="text-xs text-zinc-500">Use commas to separate multiple custom names.</span>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
