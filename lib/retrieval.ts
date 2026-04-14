import { CompatibilityTarget, Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cosineSimilarity, embedTexts, parseEmbedding } from '@/lib/vector';
import { ensureRepositoryIndex } from '@/lib/indexing';

export type RetrievalChunk = {
  id: string;
  source: string;
  title: string;
  content: string;
  score: number;
};

export type GroundedRepositoryContext = {
  repositoryId: string;
  ownerUsername: string;
  repositoryName: string;
  slug: string;
  description: string;
  visibility: 'public' | 'private';
  sourceMode: 'MANUAL' | 'UPLOAD_BUNDLE';
  version: string;
  outputFormat: string;
  supportedModels: string[];
  retrievedChunks: RetrievalChunk[];
  citations: string[];
  retrievalMode: 'vector' | 'lexical';
};

export type GroundedWorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  description: string;
  repositoryLabels: string[];
  retrievedChunks: RetrievalChunk[];
  citations: string[];
  retrievalMode: 'vector' | 'lexical';
};

function compatibilityLabel(target: CompatibilityTarget) {
  return (
    {
      ALL_MODELS: 'All models',
      CHATGPT: 'ChatGPT',
      CLAUDE: 'Claude',
      CLAUDE_CODE: 'Claude Code',
      GEMINI: 'Gemini',
    }[target] || target
  );
}

function parseCustomModelNames(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  const stopwords = new Set([
    'the','a','an','and','or','to','of','in','on','for','is','are','be','with','this','that','it','as','by','at','from','you','your','me',
    'toi','la','va','cua','cho','trong','tren','voi','mot','nhung','cac','nay','kia','giup','hay','ban','duoc','ve','di','nao',
  ]);
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

function scoreLexical(query: string, content: string, title: string) {
  const queryTokens = tokenize(query);
  const haystack = normalizeText(`${title} ${content}`);
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 2;
    if (normalizeText(title).includes(token)) score += 1;
  }
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery && haystack.includes(normalizedQuery)) score += 8;
  return score;
}

export async function retrieveRepositoryContext(options: {
  repositoryId?: string;
  owner?: string;
  slug?: string;
  viewerUserId?: string | null;
  query: string;
  maxChunks?: number;
}) : Promise<GroundedRepositoryContext | null> {
  const { repositoryId, owner, slug, viewerUserId, query, maxChunks = 6 } = options;

  const repository = await prisma.repository.findFirst({
    where: repositoryId
      ? { id: repositoryId, OR: [{ ownerId: viewerUserId || '' }, { visibility: Visibility.PUBLIC }] }
      : { slug, owner: { username: owner }, OR: [{ ownerId: viewerUserId || '' }, { visibility: Visibility.PUBLIC }] },
    include: {
      owner: { select: { username: true } },
      compatibility: { select: { target: true } },
      latestVersion: true,
    },
  });

  if (!repository || !repository.latestVersion) return null;

  await ensureRepositoryIndex(repository.id);

  const chunks = await prisma.repositoryChunk.findMany({
    where: { repositoryId: repository.id },
    orderBy: { createdAt: 'asc' },
  });

  const supportedModels = [
    ...repository.compatibility.map((item) => compatibilityLabel(item.target)),
    ...parseCustomModelNames(repository.customModelNamesJson),
  ];

  let retrievalMode: 'vector' | 'lexical' = 'lexical';
  let retrievedChunks: RetrievalChunk[] = [];

  const queryEmbedding = await embedTexts([query]).then((rows) => rows?.[0] || null).catch(() => null);

  if (queryEmbedding) {
    const vectorScored = chunks
      .map((chunk) => {
        const embedding = parseEmbedding(chunk.embeddingJson);
        const score = embedding ? cosineSimilarity(queryEmbedding, embedding) : -1;
        return { chunk, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map((entry) => ({
        id: entry.chunk.id,
        source: entry.chunk.sourceType === 'bundle' ? 'bundle' : 'prompt',
        title: entry.chunk.title,
        content: entry.chunk.content,
        score: entry.score,
      }));

    if (vectorScored.length) {
      retrievalMode = 'vector';
      retrievedChunks = vectorScored;
    }
  }

  if (!retrievedChunks.length) {
    retrievedChunks = chunks
      .map((chunk) => ({
        id: chunk.id,
        source: chunk.sourceType === 'bundle' ? 'bundle' : 'prompt',
        title: chunk.title,
        content: chunk.content,
        score: scoreLexical(query, chunk.content, chunk.title),
      }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, maxChunks);
  }

  const citations = Array.from(new Set(retrievedChunks.map((chunk) => `${chunk.source === 'bundle' ? 'file' : 'field'}: ${chunk.title}`)));

  return {
    repositoryId: repository.id,
    ownerUsername: repository.owner.username,
    repositoryName: repository.name,
    slug: repository.slug,
    description: repository.description,
    visibility: repository.visibility === Visibility.PUBLIC ? 'public' : 'private',
    sourceMode: repository.sourceMode,
    version: repository.latestVersion.versionNumber,
    outputFormat: repository.latestVersion.outputFormat,
    supportedModels: supportedModels.length ? supportedModels : ['All models'],
    retrievedChunks,
    citations,
    retrievalMode,
  };
}

export async function retrieveWorkspaceContext(options: { workspaceId: string; viewerUserId?: string | null; query: string; maxChunks?: number; }): Promise<GroundedWorkspaceContext | null> {
  if (!hasWorkspaceSupport()) return null;
  const { workspaceId, viewerUserId, query, maxChunks = 8 } = options;
  const workspace = await (prisma as any).workspace.findFirst({
    where: { id: workspaceId, ownerId: viewerUserId || '' },
    include: { items: { include: { repository: { include: { owner: { select: { username: true } } } } } } },
  });
  if (!workspace) return null;

  const contexts = await Promise.all(
    workspace.items.map((item) => retrieveRepositoryContext({ repositoryId: item.repositoryId, viewerUserId, query, maxChunks: Math.max(3, Math.ceil(maxChunks / Math.max(workspace.items.length,1))) }))
  );
  const valid = contexts.filter(Boolean) as GroundedRepositoryContext[];
  if (!valid.length) {
    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      description: workspace.description || 'Multi-repository workspace.',
      repositoryLabels: workspace.items.map((item) => `${item.repository.owner.username}/${item.repository.slug}`),
      retrievedChunks: [],
      citations: [],
      retrievalMode: 'lexical',
    };
  }

  const combinedChunks = valid
    .flatMap((context) => context.retrievedChunks.map((chunk) => ({ ...chunk, title: `${context.ownerUsername}/${context.slug} • ${chunk.title}` })))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);

  const retrievalMode = valid.some((item) => item.retrievalMode === 'vector') ? 'vector' : 'lexical';
  const citations = Array.from(new Set(combinedChunks.map((chunk) => `${chunk.source === 'bundle' ? 'file' : 'field'}: ${chunk.title}`)));

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    description: workspace.description || 'Multi-repository workspace.',
    repositoryLabels: workspace.items.map((item) => `${item.repository.owner.username}/${item.repository.slug}`),
    retrievedChunks: combinedChunks,
    citations,
    retrievalMode,
  };
}

export function buildGroundedPrompt(context: GroundedRepositoryContext, question: string) {
  const chunkText = context.retrievedChunks.map((chunk, index) => [`[Chunk ${index + 1}] ${chunk.title}`, chunk.content].join('\n')).join('\n\n');
  return [
    'You are Crow-Chat inside Prompt-Hub.',
    'Answer using the grounded repository evidence below.',
    'Do not invent missing repository details. If evidence is missing, say what is missing.',
    'When helpful, propose how to improve the prompt or bundle.',
    '',
    `Repository: ${context.ownerUsername}/${context.slug}`,
    `Description: ${context.description}`,
    `Visibility: ${context.visibility}`,
    `Source mode: ${context.sourceMode}`,
    `Latest version: ${context.version}`,
    `Output format: ${context.outputFormat}`,
    `Compatible AI: ${context.supportedModels.join(', ')}`,
    `Retrieval mode: ${context.retrievalMode}`,
    '',
    'Grounded evidence:',
    chunkText,
    '',
    `User question: ${question}`,
  ].join('\n');
}

export function buildWorkspaceGroundedPrompt(context: GroundedWorkspaceContext, question: string) {
  const chunkText = context.retrievedChunks.map((chunk, index) => [`[Chunk ${index + 1}] ${chunk.title}`, chunk.content].join('\n')).join('\n\n');
  return [
    'You are Crow-Chat inside Prompt-Hub.',
    'Answer using the grounded workspace evidence below.',
    'A workspace combines multiple repositories. Compare, synthesize, and point out conflicts when they exist.',
    'Do not invent missing repository details. If evidence is missing, say what is missing.',
    '',
    `Workspace: ${context.workspaceName}`,
    `Description: ${context.description}`,
    `Repositories: ${context.repositoryLabels.join(', ')}`,
    `Retrieval mode: ${context.retrievalMode}`,
    '',
    'Grounded evidence:',
    chunkText,
    '',
    `User question: ${question}`,
  ].join('\n');
}

export function buildGroundedDemoAnswer(context: GroundedRepositoryContext, question: string) {
  const citations = context.citations.length ? context.citations.join(', ') : 'No citations available.';
  const preview = context.retrievedChunks.slice(0, 3).map((chunk) => `- ${chunk.title}: ${chunk.content.slice(0, 200)}`).join('\n');
  return [
    `Crow-Chat demo (${context.retrievalMode} retrieval)`,
    '',
    `Repository: ${context.ownerUsername}/${context.slug}`,
    `Question: ${question}`,
    '',
    'Most relevant repository evidence:',
    preview || '- No grounded evidence found.',
    '',
    `Citations: ${citations}`,
    '',
    'Add OPENAI_API_KEY or a local Ollama model for full generated answers. The grounding evidence above is already being retrieved from the repository index.',
  ].join('\n');
}

export function buildWorkspaceDemoAnswer(context: GroundedWorkspaceContext, question: string) {
  const citations = context.citations.length ? context.citations.join(', ') : 'No citations available.';
  const preview = context.retrievedChunks.slice(0, 4).map((chunk) => `- ${chunk.title}: ${chunk.content.slice(0, 200)}`).join('\n');
  return [
    `Crow-Chat workspace demo (${context.retrievalMode} retrieval)`,
    '',
    `Workspace: ${context.workspaceName}`,
    `Repositories: ${context.repositoryLabels.join(', ')}`,
    `Question: ${question}`,
    '',
    'Most relevant workspace evidence:',
    preview || '- No grounded evidence found.',
    '',
    `Citations: ${citations}`,
    '',
    'This answer is grounded across multiple repositories in the selected workspace.',
  ].join('\n');
}
