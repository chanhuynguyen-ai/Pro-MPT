import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rebuildRepositoryIndex } from '@/lib/indexing';
import { Visibility } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ owner: string; slug: string }> },
) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;

  const repository = await prisma.repository.findFirst({
    where: {
      slug,
      owner: { username: owner },
      OR: [{ ownerId: viewer?.id || '' }, { visibility: Visibility.PUBLIC }],
    },
    select: { id: true, ownerId: true },
  });

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
  }

  if (!viewer || repository.ownerId !== viewer.id) {
    return NextResponse.json({ error: 'Only the repository owner can rebuild the index.' }, { status: 403 });
  }

  const result = await rebuildRepositoryIndex(repository.id);
  return NextResponse.json({ ok: true, ...result });
}
