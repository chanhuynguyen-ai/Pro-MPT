import { promises as fs } from 'node:fs';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; slug: string; assetId: string }> },
) {
  const viewer = await getCurrentUser();
  const { owner, slug, assetId } = await params;

  const asset = await prisma.repositoryAsset.findFirst({
    where: {
      id: assetId,
      repository: {
        slug,
        owner: { username: owner },
        OR: [{ visibility: 'PUBLIC' }, ...(viewer ? [{ ownerId: viewer.id }] : [])],
      },
    },
    include: { repository: { select: { name: true } } },
  });

  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }

  const file = await fs.readFile(asset.storagePath).catch(() => null);
  if (!file) {
    return new NextResponse('Missing asset file', { status: 404 });
  }

  return new NextResponse(file, {
    headers: {
      'Content-Type': asset.mimeType || 'application/octet-stream',
      'Content-Length': String(file.length),
      'Content-Disposition': `inline; filename="${asset.originalName}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
