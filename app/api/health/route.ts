import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageStatus } from '@/lib/storage';
import { getEmbeddingProviderStatus } from '@/lib/vector';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [db, storage] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      getStorageStatus(),
    ]);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: 'ok',
      storage,
      embeddings: getEmbeddingProviderStatus(),
      dbResult: db,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Healthcheck failed.',
      },
      { status: 500 },
    );
  }
}
