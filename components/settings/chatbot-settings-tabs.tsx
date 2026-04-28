'use client';

import { useState } from 'react';
import { LocalModelSettingsCard } from '@/components/settings/local-model-settings-card';
import { RemoteApiSettingsCard } from '@/components/settings/remote-api-settings-card';
import type { LocalModelRecommendation, OllamaStatus } from '@/lib/ollama';

export function ChatbotSettingsTabs({
  status,
  recommendations,
  labels,
  remote,
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
  remote: { configured: boolean; provider: string | null; model: string | null; configs: Array<{ id: string; provider: string; model: string; label?: string | null }> };
}) {
  const [tab, setTab] = useState<'local' | 'api'>('local');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTab('local')} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'local' ? 'bg-zinc-900 text-white' : 'bg-black text-zinc-400 hover:text-white'}`}>
            LLM local
          </button>
          <button type="button" onClick={() => setTab('api')} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'api' ? 'bg-zinc-900 text-white' : 'bg-black text-zinc-400 hover:text-white'}`}>
            LLM API
          </button>
        </div>
      </div>

      {tab === 'local' ? (
        <LocalModelSettingsCard status={status} recommendations={recommendations} labels={labels} />
      ) : (
        <RemoteApiSettingsCard current={remote} />
      )}
    </div>
  );
}
