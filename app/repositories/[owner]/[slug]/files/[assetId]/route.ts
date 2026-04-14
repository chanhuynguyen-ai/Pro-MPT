import path from 'node:path';
import { NextResponse } from 'next/server';
import { Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readStoredFile } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; slug: string; assetId: string }> },
) {
  const { owner, slug, assetId } = await params;
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('prompt_hub_session='))
    ?.split('=')[1];

  const viewerSession = token
    ? await prisma.session.findUnique({ where: { token }, select: { userId: true, expiresAt: true } })
    : null;
  const viewerUserId = viewerSession && viewerSession.expiresAt.getTime() > Date.now() ? viewerSession.userId : null;

  const asset = await prisma.repositoryAsset.findFirst({
    where: {
      id: assetId,
      repository: {
        slug,
        owner: { username: owner },
      },
    },
    include: {
      repository: {
        select: {
          ownerId: true,
          visibility: true,
        },
      },
    },
  });

  if (!asset) {
    return new NextResponse('Asset not found', { status: 404 });
  }

  if (asset.repository.visibility === Visibility.PRIVATE && asset.repository.ownerId !== viewerUserId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const buffer = await readStoredFile(asset.storagePath).catch(() => null);
  if (!buffer) {
    return new NextResponse('File missing from storage', { status: 404 });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${path.basename(asset.originalName)}"`,
    },
  });
}
