import { LlmProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type RemoteLlmConfig = {
  id: string;
  provider: 'GEMINI' | 'OPENAI';
  apiKey: string;
  model: string;
  baseUrl?: string | null;
  label?: string | null;
};

function extractOpenAIText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  if (Array.isArray(payload?.output)) {
    const fragments: string[] = [];
    for (const item of payload.output) {
      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          if (typeof part?.text === 'string') fragments.push(part.text);
          if (typeof part?.output_text === 'string') fragments.push(part.output_text);
        }
      }
    }
    const joined = fragments.join('\n').trim();
    if (joined) return joined;
  }
  return null;
}

function extractGeminiText(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const joined = parts.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('\n').trim();
  return joined || null;
}

export async function getUserRemoteLlmConfigs(userId: string): Promise<RemoteLlmConfig[]> {
  const model = (prisma as any).userLlmConfig;
  if (!model?.findMany) return [];
  const configs = await model.findMany({
    where: { userId, isEnabled: true },
    orderBy: [{ updatedAt: 'desc' }, { provider: 'asc' }, { model: 'asc' }],
  });
  return configs.map((config: any) => ({
    id: config.id,
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    label: config.label,
  }));
}

export async function getUserRemoteLlmConfigById(userId: string, id: string): Promise<RemoteLlmConfig | null> {
  const model = (prisma as any).userLlmConfig;
  if (!model?.findFirst) return null;
  const config = await model.findFirst({ where: { id, userId, isEnabled: true } });
  if (!config) return null;
  return {
    id: config.id,
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    label: config.label,
  };
}

export async function saveUserRemoteLlmConfig(input: {
  userId: string;
  provider: 'GEMINI' | 'OPENAI';
  apiKey: string;
  model: string;
  baseUrl?: string;
  label?: string;
}) {
  const model = (prisma as any).userLlmConfig;
  if (!model?.upsert) {
    throw new Error('Remote LLM config support is unavailable. Run prisma generate and db push.');
  }

  return model.upsert({
    where: { userId_provider_model: { userId: input.userId, provider: input.provider, model: input.model } },
    update: {
      apiKey: input.apiKey,
      model: input.model,
      baseUrl: input.baseUrl || null,
      label: input.label || null,
      isEnabled: true,
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      apiKey: input.apiKey,
      model: input.model,
      baseUrl: input.baseUrl || null,
      label: input.label || null,
      isEnabled: true,
    },
  });
}

export async function deleteUserRemoteLlmConfig(userId: string, id: string) {
  const model = (prisma as any).userLlmConfig;
  if (!model?.deleteMany) return { count: 0 };
  return model.deleteMany({ where: { userId, id } });
}

export async function getRemoteProviderStatus(userId: string) {
  const configs = await getUserRemoteLlmConfigs(userId);
  const first = configs[0] || null;
  return {
    configured: Boolean(first),
    provider: first?.provider || null,
    model: first?.model || null,
    configs: configs.map((config) => ({ id: config.id, provider: config.provider, model: config.model, label: config.label })),
  };
}

export async function callRemoteLlm(config: RemoteLlmConfig, prompt: string) {
  if (config.provider === 'OPENAI') {
    const response = await fetch(config.baseUrl || 'https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model || 'gpt-5-mini', input: prompt }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || 'OpenAI request failed.');
    }
    const payload = await response.json();
    const text = extractOpenAIText(payload);
    if (!text) throw new Error('OpenAI returned no readable text.');
    return text;
  }

  const model = config.model || 'gemini-2.5-flash';
  const endpoint = `${config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Gemini request failed.');
  }
  const payload = await response.json();
  const text = extractGeminiText(payload);
  if (!text) throw new Error('Gemini returned no readable text.');
  return text;
}
