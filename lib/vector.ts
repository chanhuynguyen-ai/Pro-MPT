export type EmbeddingProviderStatus = {
  available: boolean;
  provider: 'openai' | 'ollama' | 'none';
  model: string | null;
};

const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

export function getEmbeddingProviderStatus(): EmbeddingProviderStatus {
  if (process.env.OPENAI_API_KEY) {
    return { available: true, provider: 'openai', model: OPENAI_EMBEDDING_MODEL };
  }
  if (OLLAMA_BASE_URL) {
    return { available: true, provider: 'ollama', model: OLLAMA_EMBEDDING_MODEL };
  }
  return { available: false, provider: 'none', model: null };
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function parseEmbedding(json?: string | null) {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((value) => Number(value)) : null;
  } catch {
    return null;
  }
}

async function embedWithOpenAI(texts: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed: ${await response.text().catch(() => '')}`);
  }

  const payload = await response.json();
  return (payload?.data || []).map((item: any) => item.embedding as number[]);
}

async function embedWithOllama(texts: string[]) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_EMBEDDING_MODEL,
      input: texts,
    }),
  }).catch(() => null);

  if (!response) return null;
  if (!response.ok) {
    throw new Error(`Ollama embeddings failed: ${await response.text().catch(() => '')}`);
  }

  const payload = await response.json();
  const embeddings = payload?.embeddings;
  return Array.isArray(embeddings) ? embeddings : null;
}

export async function embedTexts(texts: string[]) {
  if (!texts.length) return [];
  if (process.env.OPENAI_API_KEY) {
    return embedWithOpenAI(texts);
  }
  return embedWithOllama(texts);
}
