import { formatBytes } from '@/lib/utils';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

export type LocalModelRecommendation = {
  name: string;
  displayName: string;
  sizeLabel: string;
  description: string;
  tags: string[];
};

export const RECOMMENDED_LOCAL_MODELS: LocalModelRecommendation[] = [
  {
    name: 'qwen2.5:3b-instruct',
    displayName: 'Qwen2.5 3B Instruct',
    sizeLabel: '1.9 GB',
    description: 'A compact multilingual instruct model that is strong for general assistant tasks and supports Vietnamese.',
    tags: ['general', 'multilingual', 'lightweight'],
  },
  {
    name: 'qwen2.5-coder:3b-instruct',
    displayName: 'Qwen2.5 Coder 3B Instruct',
    sizeLabel: '1.9 GB',
    description: 'A lightweight coding-focused model for prompt engineering, code tasks, and repo maintenance.',
    tags: ['coding', 'repo', 'prompt'],
  },
  {
    name: 'deepseek-r1:1.5b',
    displayName: 'DeepSeek R1 1.5B',
    sizeLabel: '1.1 GB',
    description: 'A very small reasoning model that works well for quick thinking and task planning on modest machines.',
    tags: ['reasoning', 'smallest', 'planning'],
  },
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    sizeLabel: '2.0 GB',
    description: 'A lightweight multilingual instruction model that is useful for summarization, rewriting, and tool-style tasks.',
    tags: ['general', 'chat', 'rewrite'],
  },
];

export type LocalInstalledModel = {
  name: string;
  sizeLabel: string;
  parameterSize: string | null;
  quantization: string | null;
  modifiedAt: string | null;
};

export type OllamaStatus = {
  available: boolean;
  installedModels: LocalInstalledModel[];
  runningModels: string[];
  error?: string;
};

async function fetchOllama(path: string, init?: RequestInit) {
  const response = await fetch(`${OLLAMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Ollama request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  try {
    const [tagsPayload, runningPayload] = await Promise.all([
      fetchOllama('/api/tags', { method: 'GET' }),
      fetchOllama('/api/ps', { method: 'GET' }).catch(() => ({ models: [] })),
    ]);

    const installedModels = Array.isArray(tagsPayload?.models)
      ? tagsPayload.models.map((model: any) => ({
          name: String(model?.name || model?.model || 'unknown'),
          sizeLabel: formatBytes(Number(model?.size || 0)),
          parameterSize: model?.details?.parameter_size ? String(model.details.parameter_size) : null,
          quantization: model?.details?.quantization_level ? String(model.details.quantization_level) : null,
          modifiedAt: model?.modified_at ? String(model.modified_at) : null,
        }))
      : [];

    const runningModels = Array.isArray(runningPayload?.models)
      ? runningPayload.models.map((model: any) => String(model?.name || model?.model || 'unknown'))
      : [];

    return { available: true, installedModels, runningModels };
  } catch (error) {
    return {
      available: false,
      installedModels: [],
      runningModels: [],
      error: error instanceof Error ? error.message : 'Could not reach Ollama.',
    };
  }
}

export async function pullLocalModels(modelNames: string[]) {
  for (const model of modelNames) {
    await fetchOllama('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ model, stream: false }),
    });
  }
}

export async function chatWithOllama(model: string, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const payload = await fetchOllama('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  return typeof payload?.message?.content === 'string' ? payload.message.content : null;
}


export async function deleteLocalModel(model: string) {
  await fetchOllama('/api/delete', {
    method: 'DELETE',
    body: JSON.stringify({ model }),
  });
}
