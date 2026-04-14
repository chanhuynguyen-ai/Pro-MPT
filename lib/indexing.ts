import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { readStoredText } from '@/lib/storage';
import { embedTexts } from '@/lib/vector';

type RawChunk = {
  repositoryId: string;
  assetId?: string | null;
  versionId?: string | null;
  sourceType: string;
  title: string;
  content: string;
  contentHash: string;
};

function splitIntoChunks(text: string, maxLength = 1200) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!paragraphs.length) return [];
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).trim().length <= maxLength) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }
    for (let index = 0; index < paragraph.length; index += maxLength) {
      chunks.push(paragraph.slice(index, index + maxLength));
    }
    current = '';
  }
  if (current) chunks.push(current);
  return chunks;
}

function createHashForContent(content: string) {
  return createHash('sha1').update(content).digest('hex');
}

async function collectRepositoryChunks(repositoryId: string) {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    include: {
      latestVersion: true,
      assets: { select: { id: true, originalName: true, relativePath: true, storagePath: true, previewText: true, isText: true } },
    },
  });

  if (!repository?.latestVersion) return [] as RawChunk[];

  const latest = repository.latestVersion;
  const sections = [
    { sourceType: 'prompt', title: 'System prompt', content: latest.systemPrompt, versionId: latest.id },
    { sourceType: 'prompt', title: 'User prompt template', content: latest.userPromptTemplate, versionId: latest.id },
    { sourceType: 'prompt', title: 'Variables', content: latest.variablesJson, versionId: latest.id },
    { sourceType: 'prompt', title: 'Output format', content: latest.outputFormat, versionId: latest.id },
    { sourceType: 'prompt', title: 'Notes', content: latest.notes || '', versionId: latest.id },
    { sourceType: 'prompt', title: 'Repository description', content: repository.description || '', versionId: latest.id },
  ];

  const chunks: RawChunk[] = [];

  for (const section of sections) {
    if (!section.content?.trim()) continue;
    for (const part of splitIntoChunks(section.content, 1000)) {
      chunks.push({
        repositoryId,
        versionId: section.versionId,
        sourceType: section.sourceType,
        title: section.title,
        content: part,
        contentHash: createHashForContent(part),
      });
    }
  }

  for (const asset of repository.assets) {
    if (!asset.isText) continue;
    const text = await readStoredText(asset.storagePath, asset.previewText || '');
    if (!text.trim()) continue;
    const title = asset.relativePath || asset.originalName;
    for (const part of splitIntoChunks(text.slice(0, 80000), 1400)) {
      chunks.push({
        repositoryId,
        assetId: asset.id,
        sourceType: 'bundle',
        title,
        content: part,
        contentHash: createHashForContent(part),
      });
    }
  }

  return chunks;
}

export async function rebuildRepositoryIndex(repositoryId: string) {
  const rawChunks = await collectRepositoryChunks(repositoryId);
  await prisma.repositoryChunk.deleteMany({ where: { repositoryId } });
  if (!rawChunks.length) return { chunkCount: 0, embedded: false };

  let embeddings: number[][] | null = null;
  try {
    embeddings = await embedTexts(rawChunks.map((chunk) => chunk.content));
  } catch {
    embeddings = null;
  }

  await prisma.repositoryChunk.createMany({
    data: rawChunks.map((chunk, index) => ({
      repositoryId: chunk.repositoryId,
      assetId: chunk.assetId || null,
      versionId: chunk.versionId || null,
      sourceType: chunk.sourceType,
      title: chunk.title,
      content: chunk.content,
      contentHash: chunk.contentHash,
      embeddingJson: embeddings?.[index] ? JSON.stringify(embeddings[index]) : null,
    })),
  });

  return { chunkCount: rawChunks.length, embedded: Boolean(embeddings?.length) };
}

export async function ensureRepositoryIndex(repositoryId: string) {
  const [count, existing] = await Promise.all([
    prisma.repositoryChunk.count({ where: { repositoryId } }),
    prisma.repositoryChunk.findMany({ where: { repositoryId }, select: { embeddingJson: true }, take: 5 }),
  ]);
  if (count > 0) {
    const hasEmbeddings = existing.some((item) => Boolean(item.embeddingJson));
    return { chunkCount: count, embedded: hasEmbeddings, rebuilt: false };
  }
  const rebuilt = await rebuildRepositoryIndex(repositoryId);
  return { ...rebuilt, rebuilt: true };
}
