'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { hasWorkspaceSupport } from '@/lib/workspaces';

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser('/workspaces');
  if (!hasWorkspaceSupport()) {
    redirect('/workspaces?error=workspace-support-unavailable');
  }
  const name = asString(formData.get('name'));
  const description = asString(formData.get('description'));

  if (!name) {
    redirect('/workspaces?error=missing-name');
  }

  const existing = await (prisma as any).workspace.findFirst({ where: { ownerId: user.id, name } });
  if (existing) {
    redirect('/workspaces?error=duplicate-name');
  }

  const workspace = await (prisma as any).workspace.create({
    data: { ownerId: user.id, name, description: description || null },
  });

  revalidatePath('/workspaces');
  revalidatePath('/crow-chat');
  redirect(`/workspaces/${workspace.id}?created=1`);
}

export async function saveWorkspaceRepositoriesAction(workspaceId: string, formData: FormData) {
  const user = await requireUser(`/workspaces/${workspaceId}`);
  if (!hasWorkspaceSupport()) {
    redirect('/workspaces?error=workspace-support-unavailable');
  }
  const workspace = await (prisma as any).workspace.findFirst({ where: { id: workspaceId, ownerId: user.id } });
  if (!workspace) {
    redirect('/workspaces?error=missing-workspace');
  }

  const selectedIds = Array.from(new Set(formData.getAll('repositoryIds').map((item) => String(item)))).filter(Boolean);

  const allowedIds = new Set<string>();
  const [ownedRepos, starredRepos] = await Promise.all([
    prisma.repository.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    prisma.star.findMany({ where: { userId: user.id }, select: { repositoryId: true } }),
  ]);
  ownedRepos.forEach((repo) => allowedIds.add(repo.id));
  starredRepos.forEach((repo) => allowedIds.add(repo.repositoryId));

  const filteredIds = selectedIds.filter((id) => allowedIds.has(id));

  await prisma.$transaction([
    (prisma as any).workspaceRepository.deleteMany({ where: { workspaceId } }),
    ...filteredIds.map((repositoryId) => (prisma as any).workspaceRepository.create({ data: { workspaceId, repositoryId } })),
  ]);

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath('/workspaces');
  revalidatePath('/crow-chat');
  redirect(`/workspaces/${workspaceId}?saved=1`);
}
