import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { incrementVersionNumber } from '@/lib/utils';
import { rebuildRepositoryIndex } from '@/lib/indexing';

type ApplyBody = {
  optimizedSystemPrompt?: string;
  optimizedUserTemplate?: string;
  suggestedVariables?: string[];
  suggestedOutputFormat?: string;
  suggestedNotes?: string;
  changelog?: string;
  bumpType?: 'patch' | 'minor' | 'major';
};

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ owner: string; slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const { owner, slug } = await params;
  const body = (await request.json().catch(() => null)) as ApplyBody | null;
  if (!body?.optimizedSystemPrompt || !body?.optimizedUserTemplate || !body?.suggestedOutputFormat) {
    return NextResponse.json({ error: 'Missing optimizer fields.' }, { status: 400 });
  }

  const repository = await prisma.repository.findFirst({
    where: { owner: { username: owner }, slug, ownerId: user.id },
    include: { latestVersion: true, owner: { select: { username: true } } },
  });
  if (!repository || !repository.latestVersion) {
    return NextResponse.json({ error: 'Repository not found or not owned by you.' }, { status: 404 });
  }

  const bumpType = body.bumpType === 'major' || body.bumpType === 'minor' ? body.bumpType : 'patch';
  const nextVersion = incrementVersionNumber(repository.latestVersion.versionNumber, bumpType);

  const createdVersion = await prisma.$transaction(async (tx) => {
    await tx.repositoryVersion.updateMany({
      where: { repositoryId: repository.id, isLatest: true },
      data: { isLatest: false },
    });

    const version = await tx.repositoryVersion.create({
      data: {
        repositoryId: repository.id,
        createdById: user.id,
        versionNumber: nextVersion,
        title: repository.name,
        shortDescription: repository.description,
        systemPrompt: body.optimizedSystemPrompt,
        userPromptTemplate: body.optimizedUserTemplate,
        variablesJson: JSON.stringify(Array.isArray(body.suggestedVariables) ? body.suggestedVariables : []),
        outputFormat: body.suggestedOutputFormat,
        notes: body.suggestedNotes || null,
        changelog: body.changelog?.trim() || 'Applied Prompt Optimizer recommendations.',
        isLatest: true,
      },
    });

    await tx.repository.update({ where: { id: repository.id }, data: { latestVersionId: version.id } });
    return version;
  });

  await rebuildRepositoryIndex(repository.id);

  return NextResponse.json({
    ok: true,
    versionId: createdVersion.id,
    versionNumber: createdVersion.versionNumber,
    redirectTo: `/repositories/${repository.owner.username}/${repository.slug}?optimized=1`,
  });
}
