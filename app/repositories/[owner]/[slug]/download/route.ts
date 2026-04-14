import { NextRequest, NextResponse } from 'next/server';
import { Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COMPATIBILITY_ENUM_TO_LABEL } from '@/lib/constants';

function buildExportPayload(repository: {
  owner: { username: string; name: string };
  name: string;
  slug: string;
  description: string;
  sourceMode: string;
  category: { name: string };
  visibility: string;
  tags: { tag: { name: string } }[];
  compatibility: { target: string }[];
  assets: { originalName: string; relativePath: string | null; mimeType: string | null; sizeBytes: number; previewText: string | null }[];
  latestVersion: {
    versionNumber: string;
    systemPrompt: string;
    userPromptTemplate: string;
    variablesJson: string;
    outputFormat: string;
    notes: string | null;
    changelog: string;
    createdAt: Date;
  } | null;
}) {
  if (!repository.latestVersion) return null;

  return {
    owner: repository.owner.username,
    ownerDisplayName: repository.owner.name,
    repository: repository.name,
    slug: repository.slug,
    description: repository.description,
    sourceMode: repository.sourceMode,
    category: repository.category.name,
    visibility: repository.visibility.toLowerCase(),
    tags: repository.tags.map((item) => item.tag.name),
    compatibleAi: repository.compatibility.map((item) => COMPATIBILITY_ENUM_TO_LABEL[item.target] || item.target),
    bundleFiles: repository.assets.map((asset) => ({
      name: asset.relativePath || asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      previewText: asset.previewText,
    })),
    latestVersion: {
      version: repository.latestVersion.versionNumber,
      systemPrompt: repository.latestVersion.systemPrompt,
      userPromptTemplate: repository.latestVersion.userPromptTemplate,
      variables: JSON.parse(repository.latestVersion.variablesJson || '[]'),
      outputFormat: repository.latestVersion.outputFormat,
      notes: repository.latestVersion.notes ?? '',
      changelog: repository.latestVersion.changelog,
      createdAt: repository.latestVersion.createdAt.toISOString(),
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ owner: string; slug: string }> }) {
  const { owner, slug } = await params;
  const format = (request.nextUrl.searchParams.get('format') || 'md').toLowerCase();
  const sessionToken = request.cookies.get('prompt_hub_session')?.value;
  const viewerSession = sessionToken
    ? await prisma.session.findUnique({ where: { token: sessionToken }, select: { userId: true, expiresAt: true } })
    : null;
  const viewerUserId = viewerSession && viewerSession.expiresAt.getTime() > Date.now() ? viewerSession.userId : null;

  const repository = await prisma.repository.findFirst({
    where: { slug, owner: { username: owner } },
    include: {
      owner: { select: { username: true, name: true } },
      category: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
      compatibility: { select: { target: true } },
      assets: { select: { originalName: true, relativePath: true, mimeType: true, sizeBytes: true, previewText: true } },
      latestVersion: { select: { versionNumber: true, systemPrompt: true, userPromptTemplate: true, variablesJson: true, outputFormat: true, notes: true, changelog: true, createdAt: true } },
    },
  });

  const payload = repository ? buildExportPayload(repository) : null;
  if (!repository || !payload) return new NextResponse('Repository not found', { status: 404 });
  if (repository.visibility === Visibility.PRIVATE && repository.ownerId !== viewerUserId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.download.create({ data: { repositoryId: repository.id, userId: viewerUserId, format } });
    await tx.repository.update({ where: { id: repository.id }, data: { downloadsCount: { increment: 1 } } });
  });

  const filenameBase = `${payload.owner}-${payload.slug}`;

  if (format === 'json') {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${filenameBase}.json"` },
    });
  }

  const bundleSection = payload.bundleFiles.length
    ? `\n## Bundle files\n\n${payload.bundleFiles
        .map((asset) => `- ${asset.name}${asset.mimeType ? ` (${asset.mimeType})` : ''}${asset.previewText ? `\n\n${asset.previewText}` : ''}`)
        .join('\n\n')}`
    : '';

  const markdown = `# ${payload.owner}/${payload.repository}

${payload.description}

- Category: ${payload.category}
- Visibility: ${payload.visibility}
- Source mode: ${payload.sourceMode}
- Compatible AI: ${payload.compatibleAi.join(', ')}
- Tags: ${payload.tags.join(', ')}
- Latest version: ${payload.latestVersion.version}
- Changelog: ${payload.latestVersion.changelog}

## System prompt

${payload.latestVersion.systemPrompt}

## User prompt template

${payload.latestVersion.userPromptTemplate}

## Variables

${payload.latestVersion.variables.map((item) => `- ${item}`).join('\n') || '- none'}

## Output format

${payload.latestVersion.outputFormat}

## Notes

${payload.latestVersion.notes || 'No notes provided.'}${bundleSection}
`;

  if (format === 'txt') {
    return new NextResponse(markdown.replace(/^#+\s?/gm, ''), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${filenameBase}.txt"` },
    });
  }

  return new NextResponse(markdown, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${filenameBase}.md"` },
  });
}
